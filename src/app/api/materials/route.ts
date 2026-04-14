// GET  /api/materials?clinic=医院名  → 指定医院の材料一覧を取得
// POST /api/materials               → 新しい材料を登録（bodyにclinicを含む）

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── 定数 ────────────────────────────────────────────────
const CLINIC_ATSUTA  = "あつたの森歯科クリニック";
const CLINIC_AKATUKI = "あかつき台歯科医院";

// ─── サンプルデータ ────────────────────────────────────────
// 両医院に同じ材料を用意し、在庫数を変えてデモ用に差をつけています
// （残り日数が赤・橙・黄・緑とバランスよく表示されるよう調整）

const ATSUTA_MATERIALS = [
  // ── 麻酔 ──────────────────────────────────
  { name: "浸潤麻酔",    size: "", clinic: CLINIC_ATSUTA, category: "麻酔",      currentStock: 30,   unit: "本", dailyUsage: 10,  importance: "high",   notes: "カートリッジ式" },
  { name: "注射針",      size: "", clinic: CLINIC_ATSUTA, category: "麻酔",      currentStock: 80,   unit: "本", dailyUsage: 10,  importance: "high",   notes: "27G×1-1/4インチ" },
  // ── 衛生用品（サイズなし） ──────────────────
  { name: "エプロン",    size: "", clinic: CLINIC_ATSUTA, category: "衛生用品",  currentStock: 400,  unit: "枚", dailyUsage: 20,  importance: "high",   notes: "" },
  { name: "紙コップ",    size: "", clinic: CLINIC_ATSUTA, category: "衛生用品",  currentStock: 1000, unit: "個", dailyUsage: 30,  importance: "medium", notes: "" },
  // ── グローブ（サイズ別） ────────────────────
  { name: "グローブ",    size: "SS", clinic: CLINIC_ATSUTA, category: "衛生用品", currentStock: 20,  unit: "双", dailyUsage: 5,   importance: "high",   notes: "ラテックス" },
  { name: "グローブ",    size: "S",  clinic: CLINIC_ATSUTA, category: "衛生用品", currentStock: 150, unit: "双", dailyUsage: 20,  importance: "high",   notes: "ラテックス" },
  { name: "グローブ",    size: "L",  clinic: CLINIC_ATSUTA, category: "衛生用品", currentStock: 50,  unit: "双", dailyUsage: 10,  importance: "high",   notes: "ラテックス" },
  // ── ニトリル（サイズ別） ────────────────────
  { name: "ニトリル",    size: "SS", clinic: CLINIC_ATSUTA, category: "衛生用品", currentStock: 60,  unit: "双", dailyUsage: 5,   importance: "medium", notes: "アレルギー対応" },
  { name: "ニトリル",    size: "S",  clinic: CLINIC_ATSUTA, category: "衛生用品", currentStock: 200, unit: "双", dailyUsage: 8,   importance: "medium", notes: "アレルギー対応" },
  // ── 滅菌パック（サイズ別） ──────────────────
  { name: "滅菌パック",  size: "MS", clinic: CLINIC_ATSUTA, category: "滅菌・消毒", currentStock: 200, unit: "枚", dailyUsage: 5,  importance: "high",   notes: "" },
  { name: "滅菌パック",  size: "M",  clinic: CLINIC_ATSUTA, category: "滅菌・消毒", currentStock: 90,  unit: "枚", dailyUsage: 10, importance: "high",   notes: "" },
  { name: "滅菌パック",  size: "L",  clinic: CLINIC_ATSUTA, category: "滅菌・消毒", currentStock: 20,  unit: "枚", dailyUsage: 5,  importance: "high",   notes: "" },
];

const AKATSUKI_MATERIALS = [
  // ── 麻酔 ──────────────────────────────────
  { name: "浸潤麻酔",    size: "", clinic: CLINIC_AKATUKI, category: "麻酔",      currentStock: 60,  unit: "本", dailyUsage: 8,   importance: "high",   notes: "カートリッジ式" },
  { name: "注射針",      size: "", clinic: CLINIC_AKATUKI, category: "麻酔",      currentStock: 45,  unit: "本", dailyUsage: 8,   importance: "high",   notes: "27G×1-1/4インチ" },
  // ── 衛生用品（サイズなし） ──────────────────
  { name: "エプロン",    size: "", clinic: CLINIC_AKATUKI, category: "衛生用品",  currentStock: 200, unit: "枚", dailyUsage: 15,  importance: "high",   notes: "" },
  { name: "紙コップ",    size: "", clinic: CLINIC_AKATUKI, category: "衛生用品",  currentStock: 500, unit: "個", dailyUsage: 25,  importance: "medium", notes: "" },
  // ── グローブ（サイズ別） ────────────────────
  { name: "グローブ",    size: "SS", clinic: CLINIC_AKATUKI, category: "衛生用品", currentStock: 100, unit: "双", dailyUsage: 8,  importance: "high",   notes: "ラテックス" },
  { name: "グローブ",    size: "S",  clinic: CLINIC_AKATUKI, category: "衛生用品", currentStock: 300, unit: "双", dailyUsage: 15, importance: "high",   notes: "ラテックス" },
  { name: "グローブ",    size: "L",  clinic: CLINIC_AKATUKI, category: "衛生用品", currentStock: 150, unit: "双", dailyUsage: 8,  importance: "high",   notes: "ラテックス" },
  // ── ニトリル（サイズ別） ────────────────────
  { name: "ニトリル",    size: "SS", clinic: CLINIC_AKATUKI, category: "衛生用品", currentStock: 30,  unit: "双", dailyUsage: 3,  importance: "medium", notes: "アレルギー対応" },
  { name: "ニトリル",    size: "S",  clinic: CLINIC_AKATUKI, category: "衛生用品", currentStock: 80,  unit: "双", dailyUsage: 5,  importance: "medium", notes: "アレルギー対応" },
  // ── 滅菌パック（サイズ別） ──────────────────
  { name: "滅菌パック",  size: "MS", clinic: CLINIC_AKATUKI, category: "滅菌・消毒", currentStock: 100, unit: "枚", dailyUsage: 8,  importance: "high",   notes: "" },
  { name: "滅菌パック",  size: "M",  clinic: CLINIC_AKATUKI, category: "滅菌・消毒", currentStock: 50,  unit: "枚", dailyUsage: 8,  importance: "high",   notes: "" },
  { name: "滅菌パック",  size: "L",  clinic: CLINIC_AKATUKI, category: "滅菌・消毒", currentStock: 60,  unit: "枚", dailyUsage: 3,  importance: "high",   notes: "" },
];

const SAMPLE_MATERIALS = [...ATSUTA_MATERIALS, ...AKATSUKI_MATERIALS];

// ─── GET ─────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clinic = searchParams.get("clinic"); // URLパラメータから医院名を取得

  // clinic="" のデータが存在する = 古いサンプルデータ → 入れ替え
  const count = await prisma.material.count();
  let needsReseed = count === 0;

  if (!needsReseed) {
    const oldData = await prisma.material.findFirst({
      where: { clinic: "" }, // clinicが空 = 旧データ
    });
    needsReseed = oldData !== null;
  }

  if (needsReseed) {
    await prisma.material.deleteMany({});
    await prisma.material.createMany({ data: SAMPLE_MATERIALS });
  }

  // 指定した医院のデータだけを返す
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
