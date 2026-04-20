import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { detectColumns } from "@/lib/ingestion/detect-columns";
import { buildNoColumnBindingMessage } from "@/lib/ingestion/detect-pivot-layout";
import { KOREAN_FLAT_10_COLUMN_BINDING } from "@/lib/ingestion/excel-transaction-layout";
import type { ColumnBinding, NormalizedTransactionRow } from "@/lib/ingestion/types";
import { normalizeRow } from "@/lib/ingestion/normalize";
import { inferFlowClassificationCode } from "@/lib/classification/infer-flow";
import { ParseFileError, parseTransactionFile } from "@/lib/ingestion/parse-file";
import { getClassificationIdByCode } from "@/services/transfer-classification-map";
import { persistWorkbookSheet1Snapshot } from "@/services/sheet1-snapshot";

export class IngestError extends Error {
  constructor(
    message: string,
    public readonly code: "BAD_INPUT" | "NO_COLUMNS" | "NOT_FOUND" | "PARSE" = "BAD_INPUT",
  ) {
    super(message);
    this.name = "IngestError";
  }
}

export type IngestFileInput = {
  /** Original filename including extension */
  filename: string;
  buffer: Buffer;
  accountId: string;
  /** Optional: override auto-detected columns (same shape as `ColumnBinding`). */
  columnBinding?: ColumnBinding;
};

function sha256(buffer: Buffer): Buffer {
  return createHash("sha256").update(buffer).digest();
}

/**
 * Full ingestion: parse → normalize → insert new / refresh auto-classified duplicates → finalize upload row.
 */
export async function ingestTransactionFile(input: IngestFileInput) {
  const { filename, buffer, accountId } = input;

  const account = await prisma.account.findFirst({
    where: { id: accountId, isActive: true },
    select: { id: true },
  });
  if (!account) {
    throw new IngestError("Account not found or inactive", "NOT_FOUND");
  }

  const fileSha256 = sha256(buffer);

  const upload = await prisma.upload.create({
    data: {
      originalFilename: filename,
      fileSha256,
      status: "processing",
    },
  });

  const fail = async (message: string) => {
    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: "failed",
        errorMessage: message,
        completedAt: new Date(),
      },
    });
  };

  try {
    let parsed;
    try {
      parsed = parseTransactionFile(buffer, filename);
    } catch (e) {
      if (e instanceof ParseFileError) {
        await fail(e.message);
        throw new IngestError(e.message, "PARSE");
      }
      throw e;
    }

    const totalRows = parsed.rows.length;

    if (totalRows === 0) {
      await prisma.upload.update({
        where: { id: upload.id },
        data: {
          status: "completed",
          rowsInserted: 0,
          rowsDuplicate: 0,
          completedAt: new Date(),
        },
      });
      try {
        await persistWorkbookSheet1Snapshot(buffer, filename, accountId, upload.id);
      } catch (e) {
        console.warn("[ingest] Sheet1 snapshot skipped", e);
      }
      return {
        uploadId: upload.id,
        filename,
        totalRows: 0,
        invalidRows: 0,
        normalizedRows: 0,
        inserted: 0,
        refreshed: 0,
        skippedLocked: 0,
        duplicatesSkipped: 0,
      };
    }

    const headerKeys =
      parsed.headers.length > 0 ? parsed.headers : Object.keys(parsed.rows[0] ?? {});
    const binding: ColumnBinding | null =
      input.columnBinding ??
      (parsed.layout === "fixed-10-korean" ? KOREAN_FLAT_10_COLUMN_BINDING : null) ??
      detectColumns(headerKeys);

    if (!binding) {
      const msg = buildNoColumnBindingMessage(headerKeys);
      await fail(msg);
      throw new IngestError(msg, "NO_COLUMNS");
    }

    const normalized: NormalizedTransactionRow[] = [];
    let invalidRows = 0;

    for (const row of parsed.rows) {
      const n = normalizeRow(row, binding);
      if (n) normalized.push(n);
      else invalidRows += 1;
    }

    const normalizedRows = normalized.length;

    /** One row per distinct hash_key (first row wins — rest count as duplicates later). */
    const uniqueByHash = new Map<string, (typeof normalized)[number]>();
    for (const row of normalized) {
      const k = row.hashKey.toString("hex");
      if (!uniqueByHash.has(k)) uniqueByHash.set(k, row);
    }
    const uniqueRows = [...uniqueByHash.values()];
    const uniqueHashes = uniqueRows.map((r) => r.hashKey);

    const idByCode = await getClassificationIdByCode();

    const classIdFor = (r: NormalizedTransactionRow) => {
      const code = inferFlowClassificationCode({
        amount: r.amount,
        categoryRaw: r.categoryRaw,
        subcategoryRaw: r.subcategoryRaw,
        merchant: r.merchant,
        paymentMethod: r.paymentMethod,
        txType: r.txType,
      });
      return idByCode.get(code) ?? null;
    };

    /** findMany + createMany + batched refresh (see below) — same root `prisma`, no leaked ITX. */
    const existingDetails = await prisma.transaction.findMany({
      where: { accountId, dedupeHash: { in: uniqueHashes } },
      select: { dedupeHash: true, classificationManual: true },
    });
    const existingByHex = new Map<string, boolean>();
    for (const e of existingDetails) {
      existingByHex.set(Buffer.from(e.dedupeHash).toString("hex"), e.classificationManual);
    }

    const toInsert = uniqueRows.filter((r) => !existingByHex.has(r.hashKey.toString("hex")));
    const toRefresh = uniqueRows.filter((r) => {
      const hex = r.hashKey.toString("hex");
      return existingByHex.has(hex) && existingByHex.get(hex) === false;
    });
    const skippedLocked = uniqueRows.filter((r) => {
      const hex = r.hashKey.toString("hex");
      return existingByHex.get(hex) === true;
    }).length;

    const inserted =
      toInsert.length === 0
        ? 0
        : (
            await prisma.transaction.createMany({
              data: toInsert.map((r) => ({
                accountId,
                firstSeenUploadId: upload.id,
                occurredOn: r.occurredOn,
                amount: r.amount,
                merchant: r.merchant,
                merchantNormalized: r.merchantNormalized,
                dedupeHash: r.hashKey,
                description: r.description,
                categoryRaw: r.categoryRaw,
                paymentMethod: r.paymentMethod ?? null,
                isTransfer: r.isTransfer,
                transferClassificationId: classIdFor(r),
                classificationManual: false,
              })),
              skipDuplicates: true,
            })
          ).count;

    /** Batched `$transaction([...])` — one DB transaction per chunk, not an interactive tx loop (avoids P2028). */
    const REFRESH_CHUNK = 40;
    let refreshed = 0;
    for (let i = 0; i < toRefresh.length; i += REFRESH_CHUNK) {
      const chunk = toRefresh.slice(i, i + REFRESH_CHUNK);
      await prisma.$transaction(
        chunk.map((r) =>
          prisma.transaction.update({
            where: {
              accountId_dedupeHash: {
                accountId,
                dedupeHash: r.hashKey,
              },
            },
            data: {
              occurredOn: r.occurredOn,
              amount: r.amount,
              merchant: r.merchant,
              merchantNormalized: r.merchantNormalized,
              description: r.description,
              categoryRaw: r.categoryRaw,
              paymentMethod: r.paymentMethod ?? null,
              isTransfer: r.isTransfer,
              transferClassificationId: classIdFor(r),
            },
          }),
        ),
      );
      refreshed += chunk.length;
    }

    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: "completed",
        rowsInserted: inserted,
        rowsDuplicate: normalizedRows - inserted,
        completedAt: new Date(),
      },
    });

    const result = { inserted, refreshed, skippedLocked };

    try {
      await persistWorkbookSheet1Snapshot(buffer, filename, accountId, upload.id);
    } catch (e) {
      console.warn("[ingest] Sheet1 snapshot skipped", e);
    }

    const duplicatesSkipped = normalizedRows - result.inserted;

    return {
      uploadId: upload.id,
      filename,
      totalRows,
      invalidRows,
      normalizedRows,
      inserted: result.inserted,
      refreshed: result.refreshed,
      skippedLocked: result.skippedLocked,
      duplicatesSkipped,
    };
  } catch (e) {
    if (e instanceof IngestError && e.code === "NO_COLUMNS") throw e;
    if (e instanceof IngestError && e.code === "PARSE") throw e;

    const message = e instanceof Error ? e.message : "Unknown error";
    await fail(message);
    throw e;
  }
}
