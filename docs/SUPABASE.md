# Supabase로 DB 연결하기

이 프로젝트는 **Supabase의 PostgreSQL**을 Prisma로 쓰는 것이 기본입니다.  
추가로 **Project URL + Publishable key**를 넣으면 브라우저에서 `@supabase/supabase-js` 클라이언트를 쓸 수 있습니다 (`src/lib/supabase/browser.ts`). Auth·Realtime 등은 아직 연결하지 않았습니다.

## 1. Supabase에서 할 일

1. [Supabase](https://supabase.com) 로그인 → **New project** 생성  
2. 리전·DB 비밀번호 설정 후 프로젝트가 준비될 때까지 대기  
3. 왼쪽 **Project Settings** → **Database**  
4. **Connection string** 섹션에서:
   - **URI** 또는 **Connection pooling** 의 **Transaction mode** (포트 **6543**) 문자열을 복사 → 앱 런타임용  
   - **Direct connection** 또는 **Session mode** (포트 **5432**) 문자열을 복사 → Prisma `db push` / `migrate` 용  

> Supabase UI 문구는 업데이트될 수 있습니다. 핵심은 **풀러(6543)** 와 **직접(5432)** 두 종류의 URL이 있다는 점입니다.

## 2. 이 레포에서 할 일

프로젝트 루트에 `.env` 파일을 만들고 (`.env.example` 참고):
  
| 변수 | 용도 |
|------|------|
| `DATABASE_URL` | **Transaction pooler** (6543). Prisma 클라이언트·Next 서버가 사용. 끝에 `?pgbouncer=true` 가 없으면 [Prisma 문서](https://www.prisma.io/docs/orm/overview/databases/supabase)에 맞게 추가할 수 있음. |
| `DIRECT_URL` | **Direct / Session** (5432). `prisma db push`, `prisma migrate` 전용. |
| `NEXT_PUBLIC_SUPABASE_URL` | (선택) Project Settings → **API** → Project URL. 브라우저 Supabase 클라이언트용. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | (선택) 같은 화면의 **Publishable** API key (`sb_publishable_...`). |

로컬에서만 Postgres를 쓸 때는 **`DATABASE_URL`과 `DIRECT_URL`을 동일한 URL로** 두면 됩니다.

**보안:** API 키·DB 비밀번호는 Git에 커밋하지 말고 `.env`에만 두세요. 유출됐다면 Supabase에서 키를 재발급하세요.

## 3. 스키마 반영·시드

터미널에서 (프로젝트 루트):

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

## 4. 확인

```bash
npm run dev
```

브라우저에서 `/dashboard` 가 에러 없이 열리면 연결된 것입니다.

## 5. 자주 있는 이슈

### `P1001: Can't reach database server at db.xxx.supabase.co:5432`

로컬 PC가 **IPv4**인데, Supabase **직접 연결(Direct)** 호스트는 **IPv6 전용**인 경우가 많아 연결이 안 됩니다.

**해결:** `db....supabase.co` 직접 URL을 쓰지 말고, 대시보드의 **Connection pooling** 문자열을 씁니다.

1. **Project Settings** → **Database**  
2. **Connection string** → **URI** 탭에서 **Use connection pooling** 켜기  
3. 아래처럼 **두 줄을 각각 복사**해 `.env`에 넣습니다.

| 환경 변수 | 대시보드에서 고르는 것 (이름은 UI에 따라 조금 다를 수 있음) |
|-----------|--------------------------------------------------------|
| `DATABASE_URL` | **Transaction** 모드 (보통 포트 **6543**, 호스트에 `pooler` 포함). 끝에 `?pgbouncer=true` 가 없으면 [Prisma+Supabase 가이드](https://www.prisma.io/docs/orm/overview/databases/supabase)에 맞게 추가. |
| `DIRECT_URL` | **Session** 모드 (보통 포트 **5432**, 같은 pooler 호스트). `prisma db push` / migrate 가 이 URL로 붙습니다. |

직접 DB 호스트(`db.xxx.supabase.co:5432`)는 **로컬에서 막힐 수 있으므로**, 위 풀러 URI로 바꾼 뒤 다시 `npx prisma db push` 를 실행하세요.

- **비밀번호 특수문자**: 통째 URI는 대시보드 **Copy** 버튼으로 가져오면 됩니다.  
- **IPv4 애드온**: 그래도 안 되면 Supabase의 **IPv4 add-on**(유료) 안내를 확인하세요.  
- **마이그레이션만 실패**: `DIRECT_URL`이 Session 풀러(5432)인지 확인하세요.

## 6. (선택) Supabase Agent Skills

Cursor 등에서 Supabase 작업을 돕는 스킬 패키지입니다. 필수는 아닙니다.

```bash
npx skills add supabase/agent-skills
```
