-- Personal Finance Dashboard — PostgreSQL schema + incremental insert examples
-- PRD: 날짜+금액+거래처 dedupe, 계정 분리, 업로드 이력, 이체 사용자 분류

-- =============================================================================
-- SCHEMA
-- =============================================================================

CREATE TABLE transfer_classifications (
    id          SMALLSERIAL PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    label       TEXT NOT NULL,
    sort_order  SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    currency    CHAR(3) NOT NULL DEFAULT 'KRW',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE uploads (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_filename  TEXT NOT NULL,
    file_sha256        BYTEA,
    status             TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    rows_inserted      INTEGER NOT NULL DEFAULT 0,
    rows_duplicate     INTEGER NOT NULL DEFAULT 0,
    error_message      TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at       TIMESTAMPTZ
);

CREATE INDEX idx_uploads_created_at ON uploads (created_at DESC);
CREATE INDEX idx_uploads_file_sha256 ON uploads (file_sha256)
    WHERE file_sha256 IS NOT NULL;

CREATE TABLE transactions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id                  UUID NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    first_seen_upload_id        UUID REFERENCES uploads (id) ON DELETE SET NULL,

    occurred_on                 DATE NOT NULL,
    amount                      NUMERIC(19, 4) NOT NULL,
    merchant                    TEXT NOT NULL DEFAULT '',
    merchant_normalized         TEXT NOT NULL DEFAULT '',

    dedupe_hash                 BYTEA NOT NULL CHECK (octet_length(dedupe_hash) = 32),

    description                 TEXT,
    category_raw                TEXT,

    is_transfer                 BOOLEAN NOT NULL DEFAULT FALSE,
    transfer_classification_id  SMALLINT REFERENCES transfer_classifications (id) ON DELETE SET NULL,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_transactions_account_dedupe UNIQUE (account_id, dedupe_hash)
);

CREATE INDEX idx_transactions_account_date
    ON transactions (account_id, occurred_on DESC);

CREATE INDEX idx_transactions_first_upload
    ON transactions (first_seen_upload_id)
    WHERE first_seen_upload_id IS NOT NULL;

CREATE INDEX idx_transactions_transfer_pending
    ON transactions (account_id)
    WHERE is_transfer = TRUE AND transfer_classification_id IS NULL;

INSERT INTO transfer_classifications (code, label, sort_order) VALUES
    ('SPENDING',        '소비',     1),
    ('ASSET_MOVEMENT', '자산 이동', 2),
    ('INVESTMENT',     '투자',     3)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- INCREMENTAL INSERT EXAMPLES
-- dedupe_hash = SHA-256(32 bytes) of canonical (date|amount|merchant_normalized)
-- 애플리케이션에서 동일 규칙으로 계산해 바인딩할 것.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) 단건: 신규만 삽입, 중복이면 무시 + 삽입된 id만 반환
-- ---------------------------------------------------------------------------
-- :account_id, :upload_id, :occurred_on, :amount, :merchant, :merchant_norm, :dedupe_hash (bytea)
/*
INSERT INTO transactions (
    account_id,
    first_seen_upload_id,
    occurred_on,
    amount,
    merchant,
    merchant_normalized,
    dedupe_hash,
    description,
    category_raw,
    is_transfer
) VALUES (
    :account_id,
    :upload_id,
    :occurred_on,
    :amount,
    :merchant,
    :merchant_norm,
    :dedupe_hash,
    :description,
    :category_raw,
    :is_transfer
)
ON CONFLICT (account_id, dedupe_hash) DO NOTHING
RETURNING id;
*/

-- ---------------------------------------------------------------------------
-- 2) 배치: VALUES 여러 행, 한 번의 round-trip
--    (애플리케이션은 UNNEST/ANY 또는 드라이버 bulk API로 동일 패턴 사용)
-- ---------------------------------------------------------------------------
/*
INSERT INTO transactions (
    account_id,
    first_seen_upload_id,
    occurred_on,
    amount,
    merchant,
    merchant_normalized,
    dedupe_hash,
    is_transfer
) VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8),
    ($1, $2, $9, $10, $11, $12, $13, $14)
ON CONFLICT (account_id, dedupe_hash) DO NOTHING
RETURNING id;
*/

-- ---------------------------------------------------------------------------
-- 3) 한 트랜잭션: 삽입 건수·중복 건수 집계 후 uploads 갱신
--    :upload_id 에 대해 이번 파일에서 시도한 총 행 수 = :total_attempted
-- ---------------------------------------------------------------------------
/*
BEGIN;

WITH staged AS (
    SELECT *
    FROM (VALUES
        -- (occurred_on, amount, merchant, merchant_normalized, dedupe_hash, is_transfer)
        ('2026-01-15'::date, -12000.00::numeric, '스타벅스', '스타벅스', decode('abc...ff', 'hex'), false),
        ('2026-01-16'::date, -5000.00, '이체', '이체', decode('def...00', 'hex'), true)
    ) AS t(occurred_on, amount, merchant, merchant_normalized, dedupe_hash, is_transfer)
),
ins AS (
    INSERT INTO transactions (
        account_id,
        first_seen_upload_id,
        occurred_on,
        amount,
        merchant,
        merchant_normalized,
        dedupe_hash,
        is_transfer
    )
    SELECT
        :account_id::uuid,
        :upload_id::uuid,
        s.occurred_on,
        s.amount,
        s.merchant,
        s.merchant_normalized,
        s.dedupe_hash,
        s.is_transfer
    FROM staged s
    ON CONFLICT (account_id, dedupe_hash) DO NOTHING
    RETURNING 1
),
agg AS (
    SELECT
        (SELECT COUNT(*) FROM staged) AS attempted,
        (SELECT COUNT(*) FROM ins)     AS inserted
)
UPDATE uploads u
SET
    rows_inserted  = u.rows_inserted  + agg.inserted,
    rows_duplicate = u.rows_duplicate + (agg.attempted - agg.inserted)
FROM agg
WHERE u.id = :upload_id::uuid;

COMMIT;
*/

-- ---------------------------------------------------------------------------
-- 4) 이체 분류 저장 (사용자 선택 후)
-- ---------------------------------------------------------------------------
/*
UPDATE transactions
SET
    transfer_classification_id = :classification_id,
    updated_at = now()
WHERE id = :transaction_id
  AND is_transfer = TRUE;
*/
