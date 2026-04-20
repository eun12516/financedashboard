import { PrismaClient } from "@prisma/client";
import {
  extractSubcategoryRawFromMergedCategory,
  inferFlowClassificationCode,
} from "../src/lib/classification/infer-flow";
import { invalidateClassificationCache } from "../src/services/transfer-classification-map";

const prisma = new PrismaClient();

async function main() {
  await prisma.transferClassification.createMany({
    data: [
      { code: "INCOME", label: "수입", sortOrder: 1 },
      { code: "SPENDING", label: "소비", sortOrder: 2 },
      { code: "ASSET_MOVEMENT", label: "자산이동", sortOrder: 3 },
      { code: "BUSINESS", label: "사업비", sortOrder: 4 },
      { code: "UNCLASSIFIED", label: "미분류", sortOrder: 5 },
    ],
    skipDuplicates: true,
  });

  invalidateClassificationCache();

  const legacyInv = await prisma.transferClassification.findUnique({
    where: { code: "INVESTMENT" },
  });
  const asset = await prisma.transferClassification.findUnique({
    where: { code: "ASSET_MOVEMENT" },
  });
  if (legacyInv && asset) {
    await prisma.transaction.updateMany({
      where: { transferClassificationId: legacyInv.id },
      data: { transferClassificationId: asset.id },
    });
    await prisma.transferClassification.delete({ where: { id: legacyInv.id } }).catch(() => {});
  }

  const idByCode = new Map(
    (await prisma.transferClassification.findMany({ select: { id: true, code: true } })).map((r) => [
      r.code,
      r.id,
    ]),
  );

  const needsBackfill = await prisma.transaction.findMany({
    where: { classificationManual: false },
    select: {
      id: true,
      amount: true,
      categoryRaw: true,
      merchant: true,
      paymentMethod: true,
    },
  });

  const idsByCode = new Map<string, string[]>();
  for (const t of needsBackfill) {
    const sub = extractSubcategoryRawFromMergedCategory(t.categoryRaw);
    const code = inferFlowClassificationCode({
      amount: t.amount,
      categoryRaw: t.categoryRaw,
      subcategoryRaw: sub,
      merchant: t.merchant,
      paymentMethod: t.paymentMethod,
      txType: null,
    });
    const list = idsByCode.get(code) ?? [];
    list.push(t.id);
    idsByCode.set(code, list);
  }

  for (const [code, ids] of idsByCode) {
    const cid = idByCode.get(code);
    if (!cid || ids.length === 0) continue;
    await prisma.transaction.updateMany({
      where: { id: { in: ids } },
      data: { transferClassificationId: cid, classificationManual: false },
    });
  }

  for (let n = 1; n <= 5; n++) {
    const name = `계정 ${n}`;
    const exists = await prisma.account.findFirst({ where: { name } });
    if (!exists) {
      await prisma.account.create({ data: { name, currency: "KRW" } });
    }
  }
  console.log(`Accounts (계정 1–5 ensured): ${await prisma.account.count()}.`);

  console.log(
    `Seed done. Classifications: ${await prisma.transferClassification.count()}, backfilled: ${needsBackfill.length}.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
