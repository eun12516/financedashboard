import * as XLSX from "xlsx";

export type Sheet1Customer = {
  name?: string;
  gender?: string;
  age?: number | null;
  creditScore?: number | null;
  email?: string;
};

export type Sheet1CashflowRow = {
  label: string;
  total: number | null;
  monthlyAverage: number | null;
  byMonth: Record<string, number>;
};

export type Sheet1Cashflow = {
  monthKeys: string[];
  rows: Sheet1CashflowRow[];
};

export type Sheet1InvestmentRow = {
  kind?: string;
  broker?: string;
  productName?: string;
  principal?: number | null;
  valuation?: number | null;
  returnPct?: number | null;
};

export type Sheet1Extra = {
  finance?: {
    totalAssets?: number | null;
    totalDebts?: number | null;
    netAssets?: number | null;
  };
  investments?: Sheet1InvestmentRow[];
};

export type Sheet1ParseResult = {
  customer?: Sheet1Customer;
  cashflow?: Sheet1Cashflow;
  extra?: Sheet1Extra;
  sheetName: string;
  /** true when nothing useful was extracted */
  isEmpty: boolean;
};

type Matrix = (string | number | boolean | Date | null | undefined)[][];

function cellStr(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell)
    .normalize("NFKC")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAmountCell(cell: unknown): number | null {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === "number" && Number.isFinite(cell)) return cell;
  let s = cellStr(cell);
  if (!s || s === "-" || s === "—") return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/,/g, "").replace(/[₩]/g, "").replace(/\s+/g, "");
  const pct = s.match(/^(-?[\d.]+)\s*%$/);
  if (pct) {
    const n = Number(pct[1]);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

/** "1억 2,345만", "0.5억", "12,345만원" 등 한국식 금액 문자열 */
function parseKoreanWonText(raw: string): number | null {
  let s = raw.normalize("NFKC").trim();
  if (!s || s === "-" || s === "—") return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/,/g, "").replace(/원/g, "").replace(/\s+/g, " ").trim();

  let total = 0;
  const eok = s.match(/(-?[\d.]+)\s*억/);
  if (eok) total += Number(eok[1]) * 1e8;
  const man = s.match(/(-?[\d.]+)\s*만/);
  if (man) total += Number(man[1]) * 1e4;

  if (eok || man) {
    if (!Number.isFinite(total)) return null;
    return neg ? -total : total;
  }

  const digits = s.replace(/[^\d.-]/g, "");
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

function parseMoneyCell(cell: unknown): number | null {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === "number" && Number.isFinite(cell)) return cell;
  const plain = parseAmountCell(cell);
  if (plain !== null) return plain;
  const s = cellStr(cell);
  if (!s) return null;
  const tail = s.match(/([\d,.\s억만원]+)\s*$/);
  if (tail?.[1]) {
    const v = parseKoreanWonText(tail[1]);
    if (v !== null) return v;
  }
  return parseKoreanWonText(s);
}

function firstMoneyInRowRight(row: unknown[], startCol: number): number | null {
  for (let c = startCol + 1; c < row.length; c++) {
    const v = parseMoneyCell(row[c]);
    if (v !== null) return v;
  }
  return null;
}

function normalizeYmHeader(h: string): string | null {
  const t = h.replace(/\s/g, "").replace(/\./g, "-");
  const m = t.match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return null;
  const y = m[1]!;
  const mo = m[2]!.padStart(2, "0");
  return `${y}-${mo}`;
}

function parseCustomer(matrix: Matrix): Sheet1Customer | undefined {
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const headers = row.map((c) => cellStr(c));
    const nameCol = headers.findIndex((h) => h === "이름" || (h.includes("이름") && !h.includes("이메일")));
    const genderCol = headers.findIndex((h) => h === "성별" || h.includes("성별"));
    if (nameCol < 0 || genderCol < 0) continue;

    const ageCol = headers.findIndex((h) => /연령|만\s*나이/.test(h));
    const scoreCol = headers.findIndex((h) => /신용|KCB/.test(h));
    const emailCol = headers.findIndex((h) => h.includes("이메일"));

    for (const offset of [1, 2]) {
      const data = matrix[r + offset] ?? [];
      if (!data.length) continue;
      const name = cellStr(data[nameCol]);
      if (!name) continue;
      return {
        name,
        gender: genderCol >= 0 ? cellStr(data[genderCol]) : undefined,
        age: ageCol >= 0 ? parseAmountCell(data[ageCol]) : null,
        creditScore: scoreCol >= 0 ? parseAmountCell(data[scoreCol]) : null,
        email: emailCol >= 0 ? cellStr(data[emailCol]) : undefined,
      };
    }
  }
  return undefined;
}

function parseCashflow(matrix: Matrix): Sheet1Cashflow | undefined {
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const c0 = cellStr(row[0]);
    const c1 = cellStr(row[1]);
    if (c0 !== "항목" && !c0.includes("항목")) continue;
    if (!c1.includes("총계") && c1 !== "총계") continue;

    const monthKeys: string[] = [];
    for (let c = 3; c < row.length; c++) {
      const h = cellStr(row[c]);
      if (!h) continue;
      const ym = normalizeYmHeader(h);
      if (ym) monthKeys.push(ym);
    }
    if (monthKeys.length === 0) continue;

    const rows: Sheet1CashflowRow[] = [];
    for (let r2 = r + 1; r2 < matrix.length; r2++) {
      const line = matrix[r2] ?? [];
      const label = cellStr(line[0]);
      if (!label) continue;
      if (/^3[\.\s]*재무/.test(label) || label.includes("3.재무현황")) break;
      if (/재무현황/.test(label) && /^3/.test(label)) break;

      const total = parseAmountCell(line[1]);
      const monthlyAverage = parseAmountCell(line[2]);
      const byMonth: Record<string, number> = {};
      for (let i = 0; i < monthKeys.length; i++) {
        const v = parseAmountCell(line[3 + i]);
        byMonth[monthKeys[i]!] = v ?? 0;
      }
      rows.push({ label, total, monthlyAverage, byMonth });
    }

    if (rows.length > 0) return { monthKeys, rows };
  }
  return undefined;
}

/** "3. 재무현황" 블록에서 라벨·금액 행만 읽음 (순자산 등이 섹션 안에 있을 때). */
function parseFinanceFromSectionThree(matrix: Matrix): Sheet1Extra["finance"] | undefined {
  let sectionStart = -1;
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const c0 = cellStr(row[0]);
    const compact = c0.replace(/\s+/g, "");
    if (
      /^3[\.\s]*재무현황/.test(compact) ||
      /^③[\s.]*재무현황/.test(compact) ||
      (/^재무현황/.test(compact) && compact.length <= 12)
    ) {
      sectionStart = r;
      break;
    }
  }
  if (sectionStart < 0) return undefined;

  let totalAssets: number | null | undefined;
  let totalDebts: number | null | undefined;
  let netAssets: number | null | undefined;

  for (let r = sectionStart + 1; r < Math.min(matrix.length, sectionStart + 50); r++) {
    const row = matrix[r] ?? [];
    const rowHead = cellStr(row[0]);
    if (/^4[\.\s]|^④/.test(rowHead.trim())) break;
    if (/투자현황|보유상품/.test(rowHead.replace(/\s+/g, ""))) break;

    for (let c = 0; c < row.length; c++) {
      const label = cellStr(row[c]);
      if (!label) continue;
      const L = label.replace(/\s+/g, "");
      if (!/총자산|총부채|순자산|자산총계|부채총계/.test(L)) continue;

      const v = firstMoneyInRowRight(row, c) ?? parseMoneyCell(row[c]);
      if (v === null) continue;

      if ((/총자산/.test(L) || /^자산총계/.test(L)) && !/총자산가/.test(L)) {
        totalAssets = v;
      }
      if (/총부채/.test(L) || /^부채총계/.test(L)) {
        totalDebts = v;
      }
      if (/순자산/.test(L) && !/증가|감소|비율|변동|추이/.test(L)) {
        netAssets = v;
      }
    }
  }

  if (totalAssets === undefined && totalDebts === undefined && netAssets === undefined) return undefined;
  return { totalAssets: totalAssets ?? null, totalDebts: totalDebts ?? null, netAssets: netAssets ?? null };
}

/** 셀 전체 스캔 — 라벨이 0열이 아닐 수 있음, 한 셀에 "총자산 1억" 형태도 시도 */
function parseFinanceTotalsGlobalScan(matrix: Matrix): Sheet1Extra["finance"] | undefined {
  let totalAssets: number | null | undefined;
  let totalDebts: number | null | undefined;
  let netAssets: number | null | undefined;

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const t = cellStr(row[c]);
      const T = t.replace(/\s+/g, "");
      if (!T) continue;

      const fromRight = firstMoneyInRowRight(row, c);

      if ((T.includes("총자산") || /^자산총계/.test(T)) && !T.includes("총자산가")) {
        const val = fromRight ?? parseMoneyCell(row[c]);
        if (val !== null) totalAssets = val;
      }
      if (T.includes("총부채") || /^부채총계/.test(T)) {
        const val = fromRight ?? parseMoneyCell(row[c]);
        if (val !== null) totalDebts = val;
      }
      if (/순자산/.test(T) && !/증가|감소|비율|변동|추이/.test(T)) {
        const val = fromRight ?? parseMoneyCell(row[c]);
        if (val !== null) netAssets = val;
      }
    }
  }

  if (totalAssets === undefined && totalDebts === undefined && netAssets === undefined) return undefined;
  return { totalAssets: totalAssets ?? null, totalDebts: totalDebts ?? null, netAssets: netAssets ?? null };
}

function parseFinanceTotals(matrix: Matrix): Sheet1Extra["finance"] | undefined {
  return (
    parseFinanceFromSectionThree(matrix) ??
    parseFinanceTotalsGlobalScan(matrix) ??
    parseFinanceTotalsAdjacentPair(matrix)
  );
}

/** 라벨 열 | 금액 열 이웃 배치 (총자산이 A열, 숫자가 B열 등) */
function parseFinanceTotalsAdjacentPair(matrix: Matrix): Sheet1Extra["finance"] | undefined {
  let totalAssets: number | null | undefined;
  let totalDebts: number | null | undefined;
  let netAssets: number | null | undefined;

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < row.length - 1; c++) {
      const label = cellStr(row[c]).replace(/\s+/g, "");
      if (!label) continue;
      const val = parseMoneyCell(row[c + 1]);
      if (val === null) continue;
      if ((/총자산/.test(label) || /^자산총계/.test(label)) && !/총자산가/.test(label)) totalAssets = val;
      if (/총부채/.test(label) || /^부채총계/.test(label)) totalDebts = val;
      if (/순자산/.test(label) && !/증가|감소|비율|변동|추이/.test(label)) netAssets = val;
    }
  }

  if (totalAssets === undefined && totalDebts === undefined && netAssets === undefined) return undefined;
  return { totalAssets: totalAssets ?? null, totalDebts: totalDebts ?? null, netAssets: netAssets ?? null };
}

function parseInvestments(matrix: Matrix): Sheet1InvestmentRow[] | undefined {
  let headerRow = -1;
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const h0 = cellStr(row[0]);
    if (h0.includes("투자상품종류") && cellStr(row[1]).includes("금융")) {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) return undefined;

  const out: Sheet1InvestmentRow[] = [];
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    const k0 = cellStr(line[0]);
    if (!k0) continue;
    if (k0.includes("총계") || k0.includes("보유상품")) break;

    out.push({
      kind: cellStr(line[0]),
      broker: cellStr(line[1]),
      productName: cellStr(line[2]),
      principal: parseAmountCell(line[3]),
      valuation: parseAmountCell(line[4]),
      returnPct: parseAmountCell(line[5]),
    });
  }
  return out.length ? out : undefined;
}

function readFirstSheetMatrix(sheet: XLSX.WorkSheet): Matrix {
  return XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
  });
}

/**
 * Parses Sheet1 (요약 리포트) — only meaningful when the workbook has multiple sheets
 * and the first sheet is the report (not transaction rows).
 */
export function parseExcelSheet1Summary(buffer: Buffer): Sheet1ParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: true, codepage: 65001 });
  } catch {
    return { sheetName: "", isEmpty: true };
  }

  const names = workbook.SheetNames;
  if (names.length < 2) {
    return { sheetName: names[0] ?? "", isEmpty: true };
  }

  const sheetName = names[0]!;
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { sheetName, isEmpty: true };

  const matrix = readFirstSheetMatrix(sheet);
  const customer = parseCustomer(matrix);
  const cashflow = parseCashflow(matrix);
  const finance = parseFinanceTotals(matrix);
  const investments = parseInvestments(matrix);

  const extra: Sheet1Extra = {};
  if (finance) extra.finance = finance;
  if (investments) extra.investments = investments;

  const isEmpty = !customer && !cashflow && !finance && !investments;

  return {
    sheetName,
    customer,
    cashflow,
    extra: Object.keys(extra).length ? extra : undefined,
    isEmpty,
  };
}
