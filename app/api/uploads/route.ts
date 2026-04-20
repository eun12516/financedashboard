import { NextResponse } from "next/server";
import { IngestError, ingestTransactionFile } from "@/services/ingest-transactions";
import type { ColumnBinding } from "@/lib/ingestion/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Reject very large multipart bodies before buffering (complements reverse-proxy limits). */
const MAX_FILE_BYTES = 12 * 1024 * 1024;

/**
 * POST multipart/form-data:
 * - `file`: .xlsx | .xls | .csv
 * - `accountId`: UUID of target account
 * - `columnMap` (optional): JSON string of ColumnBinding — manual header mapping
 */
export async function POST(req: Request) {
  const len = req.headers.get("content-length");
  if (len && Number(len) > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  const accountId = form.get("accountId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }
  if (typeof accountId !== "string" || !accountId.trim()) {
    return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
  }

  let columnBinding: ColumnBinding | undefined;
  const rawMap = form.get("columnMap");
  if (typeof rawMap === "string" && rawMap.trim()) {
    try {
      columnBinding = JSON.parse(rawMap) as ColumnBinding;
      if (
        !columnBinding?.dateKey ||
        !columnBinding?.amountKey ||
        !columnBinding?.merchantKey
      ) {
        return NextResponse.json(
          { error: "columnMap must include dateKey, amountKey, merchantKey" },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json({ error: "columnMap must be valid JSON" }, { status: 400 });
    }
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  try {
    const summary = await ingestTransactionFile({
      filename: file.name || "upload",
      buffer: buf,
      accountId: accountId.trim(),
      columnBinding,
    });
    return NextResponse.json(summary);
  } catch (e) {
    if (e instanceof IngestError) {
      const status =
        e.code === "NOT_FOUND" ? 404 : e.code === "NO_COLUMNS" ? 422 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[uploads]", e);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}
