import { Prisma } from "@prisma/client";

/**
 * 경제적 성격 기반 분류 (txType만으로 이체→미분류 하지 않음).
 * 우선순위: A 자산이동 → B 수입 → C 사업비 → D 소비 → E 미분류/부호.
 *
 * 캐시플로 요약: ASSET_MOVEMENT·UNCLASSIFIED(애매)는 별도, INCOME / SPENDING / BUSINESS는 bucket-transaction에서 합산.
 */
export type FlowClassificationCode =
  | "INCOME"
  | "SPENDING"
  | "ASSET_MOVEMENT"
  | "BUSINESS"
  | "UNCLASSIFIED";

// ---------------------------------------------------------------------------
// Config: 본인 이름/내 계좌 패턴 (나중에 환경설정·DB로 옮기기 쉽게 상수화)
// 예: "은수빈", 마스킹 "은*빈"
// ---------------------------------------------------------------------------

export const OWN_NAME_CLASSIFICATION_PATTERNS: RegExp[] = [
  /은수빈/,
  /은\*빈/,
  /은.\*빈/,
  /은\s*\*\s*빈/,
];

/** `대분류 / 소분류` 병합 문자열에서 소분류 꼬리만 추출 (별도 열이 없을 때). */
export function extractSubcategoryRawFromMergedCategory(categoryRaw?: string | null): string | undefined {
  if (!categoryRaw) return undefined;
  const parts = categoryRaw
    .normalize("NFKC")
    .split(/\s*\/\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length < 2) return undefined;
  return parts[parts.length - 1];
}

export function typeNormalized(tx?: string | null): string {
  return (tx ?? "").normalize("NFKC").trim().replace(/\s+/g, "");
}

function isTransferLikeType(tx?: string | null): boolean {
  const t = typeNormalized(tx);
  if (!t) return false;
  if (t === "이체" || t === "계좌이체") return true;
  if (t.endsWith("계좌이체")) return true;
  if (t.includes("계좌") && t.includes("이체")) return true;
  return false;
}

/** NFKC + 소문자 + 공백 축소 — merchant, category, subcategory, payment 합친 검색용 blob */
function buildNormalizedBlob(input: {
  merchant?: string | null;
  categoryRaw?: string | null;
  subcategoryRaw?: string | null;
  paymentMethod?: string | null;
}): string {
  const subFromMerged = extractSubcategoryRawFromMergedCategory(input.categoryRaw);
  const parts = [
    input.paymentMethod,
    input.merchant,
    input.categoryRaw,
    input.subcategoryRaw,
    subFromMerged,
  ]
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join(" ");
  return parts
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function detectBusinessPaymentMethod(input: { paymentMethod?: string | null }): boolean {
  const pay = (input.paymentMethod ?? "").normalize("NFKC").toLowerCase();
  const blob = pay;
  return (
    /사업자|개인사업|법인\s*카드|법인카드|기업\s*카드|사업\s*체크|개인사업자|enterprise|business\s*card/i.test(blob) ||
    /사업자|개인사업|법인/i.test(blob)
  );
}

// --- Rule helpers (narrow, testable) ---------------------------------------

/** 본인 이름/마스킹 패턴 — 내 계좌·내 명의 이동 추정 */
export function isOwnNameLike(merchant: string, blob: string): boolean {
  const m = merchant.normalize("NFKC").trim();
  const b = blob;
  for (const re of OWN_NAME_CLASSIFICATION_PATTERNS) {
    if (re.test(m) || re.test(b)) return true;
  }
  return false;
}

/** 거래소 입출금·지갑 이동 */
export function isExchangeLike(blob: string): boolean {
  return /업비트|upbit|빗썸|bithumb|코인원|coinone|바이낸스|binance|바이낸|coinbase|크립토/i.test(blob);
}

/** 이자·배당류 — 수입 */
export function isInterestLike(blob: string): boolean {
  return /이자|정기이자|입출금통장\s*이자|예금이자|적금이자|배당|dividend/i.test(blob);
}

export function isAllowanceLike(blob: string): boolean {
  return /용돈/.test(blob);
}

/** 카카오페이·토스·네이버페이 등 지갑/플랫폼 잔고 이동 (자산 이동으로 분리) */
export function isPlatformBalanceMoveLike(blob: string): boolean {
  return (
    /카카오페이|카카오\s*페이|kakaopay|토스|toss\s*pay|toss|네이버페이|네이버\s*페이|naver\s*pay|페이코|payco/i.test(
      blob,
    )
  );
}

/**
 * 예수금·입금전용·충전(카드 충전 제외 단순 휴리스틱) 등 "이동" 맥락
 * (송금 단독은 외부 입금과 충돌하므로 넣지 않음)
 */
export function isLikelyInternalTransferContext(blob: string): boolean {
  return (
    /예수금|입금전용|내\s*계좌|내계좌이체|주식\s*예수금|증권\s*예수금|CMA|종합\s*자산/i.test(blob) ||
    /충전(?!\s*카드)(?!\s*결제)/i.test(blob)
  );
}

/** FACEBK·국세·광고 등 사업비 후보 */
export function isBusinessExpenseLike(blob: string, businessCard: boolean): boolean {
  if (businessCard) return true;
  return (
    /국세|부가세|세금|hometax|홈택스|세무|facfbk|facebook|meta|google\s*ads|광고|서비스구독|saas|notion|slack|aws|azure|github/i.test(
      blob,
    )
  );
}

/** 일상 소비 키워드 */
export function isConsumerSpendingLike(blob: string): boolean {
  return /쿠팡|배달|uber|우버|지하철|버스|택시|카페|starbucks|스타벅스|gs25|cu\b|편의점|맥도날드|배민|요기요|쿠팡이츠|이마트|롯데|홈플러스|네이버쇼핑|11번가/i.test(
    blob,
  );
}

/**
 * 외부 수취(학원비·레슨비 등): 한글 성명 2~4자, 양수, 본인명 아님, 거래소/지갑 키워드 없음
 * 예: "서준우", "박현준 499000"
 */
export function isStudentPaymentLike(
  merchant: string,
  blob: string,
  amt: Prisma.Decimal,
  ownName: (m: string, b: string) => boolean,
): boolean {
  if (!amt.gt(0)) return false;
  const raw = merchant.normalize("NFKC").trim();
  if (!raw) return false;
  const noTrailNum = raw.replace(/[\d,.\s]+$/u, "").trim();
  const firstToken = noTrailNum.split(/\s+/)[0] ?? "";
  if (!/^[가-힣]{2,4}$/u.test(firstToken)) return false;
  if (ownName(firstToken, blob)) return false;
  if (isExchangeLike(blob) || isPlatformBalanceMoveLike(blob)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Debug / future API: 분류 사유 (UI·로그용 확장 가능)
// ---------------------------------------------------------------------------

export type FlowClassificationReason = {
  code: FlowClassificationCode;
  /** 규칙 단계 식별자: A-asset, B-income, C-business, D-spending, E-fallback, sheet-txtype */
  rule: string;
  detail?: string;
};

export function inferFlowClassificationWithReason(input: {
  amount: Prisma.Decimal;
  categoryRaw?: string | null;
  subcategoryRaw?: string | null;
  merchant?: string | null;
  paymentMethod?: string | null;
  txType?: string | null;
}): FlowClassificationReason {
  const amt = new Prisma.Decimal(input.amount);
  const merchant = input.merchant ?? "";
  const blob = buildNormalizedBlob(input);
  const businessCard = detectBusinessPaymentMethod(input);
  const tt = typeNormalized(input.txType);

  // ----- Rule A: ASSET_MOVEMENT (내부 이동·거래소·지갑 — 순현금 수지에서 제외) -----
  // A1 거래소
  if (isExchangeLike(blob)) {
    return { code: "ASSET_MOVEMENT", rule: "A-asset", detail: "exchange_like" };
  }
  // A2 플랫폼 지갑
  if (isPlatformBalanceMoveLike(blob)) {
    return { code: "ASSET_MOVEMENT", rule: "A-asset", detail: "platform_balance" };
  }
  // A3 본인 이름(내 계좌·내 명의)
  if (isOwnNameLike(merchant, blob)) {
    return { code: "ASSET_MOVEMENT", rule: "A-asset", detail: "own_name_pattern" };
  }
  // A4 예수금·입금전용·내계좌 문맥
  if (isLikelyInternalTransferContext(blob)) {
    return { code: "ASSET_MOVEMENT", rule: "A-asset", detail: "internal_transfer_context" };
  }

  // ----- Rule B: INCOME -----
  if (amt.gt(0)) {
    if (isInterestLike(blob) || isAllowanceLike(blob)) {
      return { code: "INCOME", rule: "B-income", detail: "interest_or_allowance" };
    }
    if (isStudentPaymentLike(merchant, blob, amt, isOwnNameLike)) {
      return { code: "INCOME", rule: "B-income", detail: "external_person_inflow" };
    }
  }

  // ----- Rule C: BUSINESS -----
  if (amt.lt(0) && isBusinessExpenseLike(blob, businessCard)) {
    return { code: "BUSINESS", rule: "C-business", detail: "business_expense_pattern" };
  }

  // ----- Rule D: SPENDING -----
  if (amt.lt(0) && isConsumerSpendingLike(blob)) {
    return { code: "SPENDING", rule: "D-spending", detail: "consumer_keyword" };
  }

  // ----- Spreadsheet txType 힌트 (이체가 아닌 명시적 지출/수입) -----
  if (tt === "지출") {
    if (amt.lt(0) && businessCard) return { code: "BUSINESS", rule: "sheet-txtype", detail: "지출+business_card" };
    if (amt.lt(0)) return { code: "SPENDING", rule: "sheet-txtype", detail: "지출" };
    if (amt.gt(0)) return { code: "INCOME", rule: "sheet-txtype", detail: "지출+양수(환급 등)" };
    return { code: "UNCLASSIFIED", rule: "E-fallback", detail: "지출+0" };
  }
  if (tt === "수입") {
    if (amt.gt(0)) return { code: "INCOME", rule: "sheet-txtype", detail: "수입" };
    if (amt.lt(0)) return { code: "SPENDING", rule: "sheet-txtype", detail: "수입+음수" };
    return { code: "UNCLASSIFIED", rule: "E-fallback", detail: "수입+0" };
  }

  // ----- Rule E: 이체류는 규칙으로 못 잡았을 때만 미분류 후 수동 검토 -----
  if (isTransferLikeType(input.txType)) {
    return { code: "UNCLASSIFIED", rule: "E-fallback", detail: "transfer_type_unresolved" };
  }

  if (amt.gt(0)) return { code: "INCOME", rule: "E-fallback", detail: "amount_positive" };
  if (amt.lt(0)) return { code: "SPENDING", rule: "E-fallback", detail: "amount_negative" };
  return { code: "UNCLASSIFIED", rule: "E-fallback", detail: "zero_amount" };
}

/** 기존 API — 코드만 필요할 때 */
export function inferFlowClassificationCode(input: {
  amount: Prisma.Decimal;
  categoryRaw?: string | null;
  subcategoryRaw?: string | null;
  merchant?: string | null;
  paymentMethod?: string | null;
  txType?: string | null;
}): FlowClassificationCode {
  return inferFlowClassificationWithReason(input).code;
}
