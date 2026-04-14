// GET  /api/materials?clinic=医院名  → 指定医院の材料一覧を取得
// POST /api/materials               → 新しい材料を登録

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CLINIC_ATSUTA  = "あつたの森歯科クリニック";
const CLINIC_AKATUKI = "あかつき台歯科医院";

// ─── サンプルデータ（新カテゴリ・箱単位） ────────────────────
const ATSUTA_MATERIALS = [
  // 麻酔関連
  { name: "浸潤麻酔", size: "", clinic: CLINIC_ATSUTA, category: "麻酔関連", currentStock: 30,  unit: "本", dailyUsage: 10,  importance: "high",   notes: "カートリッジ式" },
  { name: "注射針",   size: "", clinic: CLINIC_ATSUTA, category: "麻酔関連", currentStock: 80,  unit: "本", dailyUsage: 10,  importance: "high",   notes: "27G×1-1/4インチ" },
  // 衛生材料
  { name: "エプロン",  size: "", clinic: CLINIC_ATSUTA, category: "衛生材料", currentStock: 400, unit: "枚", dailyUsage: 20,  importance: "high",   notes: "" },
  { name: "紙コップ",  size: "", clinic: CLINIC_ATSUTA, category: "衛生材料", currentStock: 1000,unit: "個", dailyUsage: 30,  importance: "medium", notes: "" },
  { name: "グローブ", size: "SS", clinic: CLINIC_ATSUTA, category: "衛生材料", currentStock: 2,  unit: "箱", dailyUsage: 0.1, importance: "high",   notes: "ラテックス 100枚入" },
  { name: "グローブ", size: "S",  clinic: CLINIC_ATSUTA, category: "衛生材料", currentStock: 6,  unit: "箱", dailyUsage: 0.2, importance: "high",   notes: "ラテックス 100枚入" },
  { name: "グローブ", size: "L",  clinic: CLINIC_ATSUTA, category: "衛生材料", currentStock: 3,  unit: "箱", dailyUsage: 0.15,importance: "high",   notes: "ラテックス 100枚入" },
  { name: "ニトリル", size: "SS", clinic: CLINIC_ATSUTA, category: "衛生材料", currentStock: 4,  unit: "箱", dailyUsage: 0.05,importance: "medium", notes: "アレルギー対応" },
  { name: "ニトリル", size: "S",  clinic: CLINIC_ATSUTA, category: "衛生材料", currentStock: 12, unit: "箱", dailyUsage: 0.1, importance: "medium", notes: "アレルギー対応" },
  // 滅菌関連
  { name: "滅菌パック", size: "MS", clinic: CLINIC_ATSUTA, category: "滅菌関連", currentStock: 200, unit: "枚", dailyUsage: 5,  importance: "high", notes: "" },
  { name: "滅菌パック", size: "M",  clinic: CLINIC_ATSUTA, category: "滅菌関連", currentStock: 90,  unit: "枚", dailyUsage: 10, importance: "high", notes: "" },
  { name: "滅菌パック", size: "L",  clinic: CLINIC_ATSUTA, category: "滅菌関連", currentStock: 20,  unit: "枚", dailyUsage: 5,  importance: "high", notes: "" },
];

const AKATSUKI_MATERIALS = [
  // 麻酔関連
  { name: "浸潤麻酔", size: "", clinic: CLINIC_AKATUKI, category: "麻酔関連", currentStock: 60,  unit: "本", dailyUsage: 8,   importance: "high",   notes: "カートリッジ式" },
  { name: "注射針",   size: "", clinic: CLINIC_AKATUKI, category: "麻酔関連", currentStock: 45,  unit: "本", dailyUsage: 8,   importance: "high",   notes: "27G×1-1/4インチ" },
  // 衛生材料
  { name: "エプロン",  size: "", clinic: CLINIC_AKATUKI, category: "衛生材料", currentStock: 200, unit: "枚", dailyUsage: 15,  importance: "high",   notes: "" },
  { name: "紙コップ",  size: "", clinic: CLINIC_AKATUKI, category: "衛生材料", currentStock: 500, unit: "個", dailyUsage: 25,  importance: "medium", notes: "" },
  { name: "グローブ", size: "SS", clinic: CLINIC_AKATUKI, category: "衛生材料", currentStock: 4,  unit: "箱", dailyUsage: 0.1, importance: "high",   notes: "ラテックス 100枚入" },
  { name: "グローブ", size: "S",  clinic: CLINIC_AKATUKI, category: "衛生材料", currentStock: 10, unit: "箱", dailyUsage: 0.2, importance: "high",   notes: "ラテックス 100枚入" },
  { name: "グローブ", size: "L",  clinic: CLINIC_AKATUKI, category: "衛生材料", currentStock: 5,  unit: "箱", dailyUsage: 0.15,importance: "high",   notes: "ラテックス 100枚入" },
  { name: "ニトリル", size: "SS", clinic: CLINIC_AKATUKI, category: "衛生材料", currentStock: 2,  unit: "箱", dailyUsage: 0.05,importance: "medium", notes: "アレルギー対応" },
  { name: "ニトリル", size: "S",  clinic: CLINIC_AKATUKI, category: "衛生材料", currentStock: 8,  unit: "箱", dailyUsage: 0.1, importance: "medium", notes: "アレルギー対応" },
  // 滅菌関連
  { name: "滅菌パック", size: "MS", clinic: CLINIC_AKATUKI, category: "滅菌関連", currentStock: 100, unit: "枚", dailyUsage: 8, importance: "high", notes: "" },
  { name: "滅菌パック", size: "M",  clinic: CLINIC_AKATUKI, category: "滅菌関連", currentStock: 50,  unit: "枚", dailyUsage: 8, importance: "high", notes: "" },
  { name: "滅菌パック", size: "L",  clinic: CLINIC_AKATUKI, category: "滅菌関連", currentStock: 60,  unit: "枚", dailyUsage: 3, importance: "high", notes: "" },
];

const SAMPLE_MATERIALS = [...ATSUTA_MATERIALS, ...AKATSUKI_MATERIALS];

// ─── GET ─────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clinic = searchParams.get("clinic");

  const count = await prisma.material.count();

  // ① 完全に空 or 古い clinic="" データ → サンプルデータで初期化
  let needsReseed = count === 0;
  if (!needsReseed) {
    const oldData = await prisma.material.findFirst({ where: { clinic: "" } });
    needsReseed = oldData !== null;
  }

  if (needsReseed) {
    await prisma.material.deleteMany({});
    await prisma.material.createMany({ data: SAMPLE_MATERIALS });
  } else {
    // ② 既存データのカテゴリ名・単位をアプリ更新に合わせて自動移行
    //    （ユーザーのデータを削除せず、ラベルだけ更新する）
    const needsMigration = await prisma.material.findFirst({
      where: {
        OR: [
          { unit: "双" },
          { category: "麻酔" },
          { category: "衛生用品" },
          { category: "滅菌・消毒" },
        ],
      },
    });

    if (needsMigration) {
      // 単位の移行
      await prisma.material.updateMany({ where: { unit: "双" },         data: { unit: "箱" } });
      // カテゴリの移行
      await prisma.material.updateMany({ where: { category: "麻酔" },      data: { category: "麻酔関連" } });
      await prisma.material.updateMany({ where: { category: "衛生用品" },  data: { category: "衛生材料" } });
      await prisma.material.updateMany({ where: { category: "滅菌・消毒" },data: { category: "滅菌関連" } });
    }
  }

  const materials = await prisma.material.findMany({
    where: clinic ? { clinic } : undefined,
    orderBy: [{ category: "asc" }, { name: "asc" }, { size: "asc" }],
  });

  return NextResponse.json(materials);
}

// ─── POST ────────────────────────────────────────────────
export async function POST(request: Request) {
  const body = await request.json();

  const material = await prisma.material.create({
    data: {
      name:         body.name,
      size:         body.size         ?? "",
      clinic:       body.clinic       ?? "",
      category:     body.category,
      currentStock: Number(body.currentStock),
      unit:         body.unit,
      dailyUsage:   Number(body.dailyUsage),
      importance:   body.importance   ?? "medium",
      notes:        body.notes        ?? "",
    },
  });

  return NextResponse.json(material, { status: 201 });
}
