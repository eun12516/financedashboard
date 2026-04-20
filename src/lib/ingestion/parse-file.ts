import * as XLSX from "xlsx";
import {
  KOREAN_TX_10_HEADERS,
  pickTransactionSheetIndex,
  rowLooksLikeKoreanTxHeader,
} from "@/lib/ingestion/excel-transaction-layout";
import type { ParseFileResult, RawSheetRow } from "./types";

const ALLOWED_EXT = new Set([".xlsx", ".xls", ".csv"]);
const MAX_ROWS = 100_000;

export class ParseFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseFileError";
  }
}

function extname(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i).toLowerCase() : "";
}

function stringifyHeaderCell(cell: string | number | boolean | Date | null | undefined): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).normalize("NFKC").trim();
}

function readMatrix(sheet: XLSX.WorkSheet): (string | number | boolean | Date | null)[][] {
  return XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });
}

/**
 * Sheet2 convention: row 1 = header (ignored for keys), rows 2..N mapped strictly by column index 0..9.
 */
function parseFixedKorean10(
  sheetName: string,
  matrix: (string | number | boolean | Date | null)[][],
): ParseFileResult {
  const rows: RawSheetRow[] = [];
  const headers = [...KOREAN_TX_10_HEADERS];

  for (let r = 1; r < matrix.length; r++) {
    if (rows.length >= MAX_ROWS) {
      throw new ParseFileError(`Row limit exceeded (max ${MAX_ROWS})`);
    }
    const line = matrix[r] ?? [];
    const obj: RawSheetRow = {};
    let any = false;
    for (let c = 0; c < KOREAN_TX_10_HEADERS.length; c++) {
      const key = KOREAN_TX_10_HEADERS[c];
      const v = line[c] ?? null;
      if (v !== null && v !== undefined && String(v).trim() !== "") any = true;
      obj[key] = v;
    }
    if (any) rows.push(obj);
  }

  return { sheetName, headers, rows, layout: "fixed-10-korean" };
}

/** First row = header keys (variable); data rows keyed by header text. */
function parseDynamicHeaders(
  sheetName: string,
  matrix: (string | number | boolean | Date | null)[][],
): ParseFileResult {
  const headerRow = matrix[0].map((cell) => stringifyHeaderCell(cell));
  const headers = headerRow.filter((h) => h.trim() !== "");
  const rows: RawSheetRow[] = [];

  for (let r = 1; r < matrix.length; r++) {
    if (rows.length >= MAX_ROWS) {
      throw new ParseFileError(`Row limit exceeded (max ${MAX_ROWS})`);
    }
    const line = matrix[r];
    const obj: RawSheetRow = {};
    let any = false;
    for (let c = 0; c < headerRow.length; c++) {
      const key = headerRow[c];
      if (!key) continue;
      const v = line[c] ?? null;
      if (v !== null && v !== undefined && String(v).trim() !== "") any = true;
      obj[key] = v;
    }
    if (any) rows.push(obj);
  }

  return { sheetName, headers, rows, layout: "dynamic" };
}

function parseCsvBuffer(buffer: Buffer): ParseFileResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      raw: true,
      codepage: 65001,
    });
  } catch {
    throw new ParseFileError("Failed to read CSV (corrupt or unsupported encoding)");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ParseFileError("No sheets found in file");

  const sheet = workbook.Sheets[sheetName];
  const matrix = readMatrix(sheet);
  if (!matrix.length) {
    return { sheetName, headers: [], rows: [], layout: "dynamic" };
  }

  return parseDynamicHeaders(sheetName, matrix);
}

function parseExcelBuffer(buffer: Buffer): ParseFileResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      raw: true,
      codepage: 65001,
    });
  } catch {
    throw new ParseFileError("Failed to read workbook (corrupt or unsupported encoding)");
  }

  const names = workbook.SheetNames;
  if (!names.length) throw new ParseFileError("No sheets found in file");

  const sheetIndex = pickTransactionSheetIndex(names);
  const sheetName = names[sheetIndex];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new ParseFileError("Selected sheet is missing");

  const matrix = readMatrix(sheet);
  if (!matrix.length) {
    return { sheetName, headers: [], rows: [], layout: "dynamic" };
  }

  const head = matrix[0] ?? [];
  const multiSheet = names.length >= 2;

  if (multiSheet) {
    if (head.length < KOREAN_TX_10_HEADERS.length) {
      throw new ParseFileError(
        `거래 시트("${sheetName}")에 ${KOREAN_TX_10_HEADERS.length}개 열이 필요합니다. 요약 시트(Sheet1)가 아니라 거래 내역 시트를 저장했는지 확인해 주세요.`,
      );
    }
    return parseFixedKorean10(sheetName, matrix);
  }

  if (head.length >= KOREAN_TX_10_HEADERS.length && rowLooksLikeKoreanTxHeader(head as unknown[])) {
    return parseFixedKorean10(sheetName, matrix);
  }

  return parseDynamicHeaders(sheetName, matrix);
}

/**
 * CSV: first row = headers (name-matched). Excel: prefers Sheet2 / "거래 내역" and reads 10 fixed columns by index when applicable.
 */
export function parseTransactionFile(buffer: Buffer, filename: string): ParseFileResult {
  const ext = extname(filename);
  if (!ALLOWED_EXT.has(ext)) {
    throw new ParseFileError(`Unsupported file type: ${ext || "(none)"}`);
  }

  if (ext === ".csv") {
    return parseCsvBuffer(buffer);
  }

  return parseExcelBuffer(buffer);
}
