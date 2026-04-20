import { NextResponse } from "next/server";
import { detectColumns } from "@/lib/ingestion/detect-columns";
import { isLikelyWideMonthlyPivot } from "@/lib/ingestion/detect-pivot-layout";
import { KOREAN_FLAT_10_COLUMN_BINDING } from "@/lib/ingestion/excel-transaction-layout";
import { ParseFileError, parseTransactionFile } from "@/lib/ingestion/parse-file";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 12 * 1024 * 1024;

/**
 * POST multipart/form-data: `file` only — returns header row + auto-detected binding (if any).
 * Use this to build `columnMap` when auto-detection fails.
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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  try {
    const parsed = parseTransactionFile(buf, file.name || "upload");
    const headers = parsed.headers;
    const suggested =
      parsed.layout === "fixed-10-korean"
        ? KOREAN_FLAT_10_COLUMN_BINDING
        : detectColumns(headers);
    return NextResponse.json({
      sheetName: parsed.sheetName,
      headers,
      rowCount: parsed.rows.length,
      layout: parsed.layout,
      suggested,
      pivotLike: isLikelyWideMonthlyPivot(headers),
    });
  } catch (e) {
    if (e instanceof ParseFileError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[uploads/preview]", e);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}
