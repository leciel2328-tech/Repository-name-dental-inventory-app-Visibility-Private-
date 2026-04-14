"use client";

import { useState, useEffect } from "react";
import MaterialModal from "@/components/MaterialModal";

// ─── 医院リスト ───────────────────────────────────────────
const CLINICS = [
  "あつたの森歯科クリニック",
  "あかつき台歯科医院",
] as const;

type ClinicName = (typeof CLINICS)[number];

// ─── 医院ごとの稼働日設定 ─────────────────────────────────
// 「3ヶ月在庫維持」が目標。医院ごとの週稼働日数から月・3ヶ月の基準を計算します。
const CLINIC_CONFIG: Record<
  ClinicName,
  {
    daysPerWeek: number;    // 週の稼働日数
    monthDays: number;      // 1ヶ月あたりの稼働日数（週稼働日 × 52 ÷ 12）
    twoMonthDays: number;   // 2ヶ月あたり
    threeMonthDays: number; // 3ヶ月あたり（目標）
    label: string;          // 表示用テキスト
  }
> = {
  "あつたの森歯科クリニック": {
    daysPerWeek: 6,
    monthDays: 26,      // 週6日 × 52週 ÷ 12 ≈ 26日
    twoMonthDays: 52,
    threeMonthDays: 78,
    label: "週6日稼働",
  },
  "あかつき台歯科医院": {
    daysPerWeek: 5,
    monthDays: 22,      // 週5日 × 52週 ÷ 12 ≈ 22日
    twoMonthDays: 44,
    threeMonthDays: 66,
    label: "週5日稼働",
  },
};

// ─── 医院ごとのカラーテーマ ───────────────────────────────
// Tailwindのクラスは文字列リテラルで書く必要があります（動的生成は不可）
const CLINIC_THEME: Record<
  ClinicName,
  {
    pageBg: string;
    header: string;
    addBtn: string;
    tabActive: string;
    tabInactive: string;
    filterActive: string;
    filterInactive: string;
    badge: string;
    infoBadge: string;
  }
> = {
  "あつたの森歯科クリニック": {
    pageBg:         "bg-emerald-50",
    header:         "bg-emerald-700",
    addBtn:         "bg-white text-emerald-700 hover:bg-emerald-50",
    tabActive:      "bg-white text-emerald-700 font-bold shadow-sm",
    tabInactive:    "text-emerald-100 hover:bg-emerald-600",
    filterActive:   "bg-emerald-600 text-white",
    filterInactive: "bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50",
    badge:          "bg-emerald-100 text-emerald-800 border border-emerald-200",
    infoBadge:      "bg-emerald-800/30 text-emerald-100 text-xs px-2 py-0.5 rounded",
  },
  "あかつき台歯科医院": {
    pageBg:         "bg-orange-50",
    header:         "bg-orange-600",
    addBtn:         "bg-white text-orange-600 hover:bg-orange-50",
    tabActive:      "bg-white text-orange-600 font-bold shadow-sm",
    tabInactive:    "text-orange-100 hover:bg-orange-500",
    filterActive:   "bg-orange-500 text-white",
    filterInactive: "bg-white text-gray-600 border border-gray-200 hover:bg-orange-50",
    badge:          "bg-orange-100 text-orange-800 border border-orange-200",
    infoBadge:      "bg-orange-800/30 text-orange-100 text-xs px-2 py-0.5 rounded",
  },
};

// ─── 型定義 ───────────────────────────────────────────────
interface Material {
  id: number;
  name: string;
  size: string;
  clinic: string;
  category: string;
  currentStock: number;
  unit: string;
  dailyUsage: number;
  importance: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── 在庫評価ロジック ─────────────────────────────────────
// 3ヶ月在庫維持が目標。医院ごとの稼働日数基準で4段階評価します。
// sortOrder: 0=危険（最悪）→ 3=理想（最良）。一覧は昇順ソートで危険が上に来ます。

type EvalLevel = "danger" | "warning" | "caution" | "ideal" | "unknown";

interface StockEval {
  level: EvalLevel;
  status: string;
  months: number | null;
  remainingDays: number | null;
  bg: string;
  text: string;
  border: string;
  rowBg: string;
  statusBadgeBg: string;
  sortOrder: number;
}

function getStockEval(stock: number, usage: number, clinicName: ClinicName): StockEval {
  if (usage <= 0) {
    return {
      level: "unknown", status: "未設定", months: null, remainingDays: null,
      bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200",
      rowBg: "", statusBadgeBg: "bg-gray-200", sortOrder: 4,
    };
  }

  const days = Math.floor(stock / usage);
  const cfg  = CLINIC_CONFIG[clinicName];
  const months = Math.round((days / cfg.monthDays) * 10) / 10;

  if (days >= cfg.threeMonthDays) {
    return {
      level: "ideal", status: "理想", months, remainingDays: days,
      bg: "bg-green-100", text: "text-green-700", border: "border-green-300",
      rowBg: "", statusBadgeBg: "bg-green-200", sortOrder: 3,
    };
  }
  if (days >= cfg.twoMonthDays) {
    return {
      level: "caution", status: "やや少ない", months, remainingDays: days,
      bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300",
      rowBg: "bg-yellow-50/20", statusBadgeBg: "bg-yellow-200", sortOrder: 2,
    };
  }
  if (days >= cfg.monthDays) {
    return {
      level: "warning", status: "注意", months, remainingDays: days,
      bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300",
      rowBg: "bg-orange-50/30", statusBadgeBg: "bg-orange-200", sortOrder: 1,
    };
  }
  return {
    level: "danger", status: "危険", months, remainingDays: days,
    bg: "bg-red-100", text: "text-red-700", border: "border-red-300",
    rowBg: "bg-red-50/40", statusBadgeBg: "bg-red-200", sortOrder: 0,
  };
}

/** 材料名＋サイズを組み合わせた表示名 */
function getDisplayName(m: Material): string {
  return m.size ? `${m.name} ${m.size}` : m.name;
}

/**
 * updatedAt を人が読みやすい形式に変換
 * 今日→「今日」、昨日→「昨日」、それ以前→「YYYY/MM/DD」
 */
function formatUpdatedAt(dateStr: string): {
  text: string;
  isToday: boolean;
  diffDays: number;
} {
  const date = new Date(dateStr);
  const now  = new Date();
  const dateDay  = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());
  const diffDays = Math.round((todayDay.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24));

  let text: string;
  if (diffDays === 0)      text = "今日";
  else if (diffDays === 1) text = "昨日";
  else {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    text = `${y}/${m}/${d}`;
  }
  return { text, isToday: diffDays === 0, diffDays };
}

// ─── メインコンポーネント ─────────────────────────────────
export default function Home() {
  const [materials,        setMaterials]        = useState<Material[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [isModalOpen,      setIsModalOpen]      = useState(false);
  const [editingMaterial,  setEditingMaterial]  = useState<Material | null>(null);
  const [selectedClinic,   setSelectedClinic]   = useState<ClinicName>(CLINICS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deleteConfirmId,  setDeleteConfirmId]  = useState<number | null>(null);

  const theme  = CLINIC_THEME[selectedClinic];
  const config = CLINIC_CONFIG[selectedClinic];

  // ── API ────────────────────────────────────────────────
  async function fetchMaterials(clinic: string) {
    setLoading(true);
    const res  = await fetch(`/api/materials?clinic=${encodeURIComponent(clinic)}`);
    const data = await res.json();
    setMaterials(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchMaterials(selectedClinic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClinic]);

  // ── イベントハンドラ ───────────────────────────────────
  function handleClinicChange(clinic: ClinicName) {
    setSelectedClinic(clinic);
    setSelectedCategory("all");
  }

  async function handleDelete(id: number) {
    await fetch(`/api/materials/${id}`, { method: "DELETE" });
    setDeleteConfirmId(null);
    fetchMaterials(selectedClinic);
  }

  function handleEdit(material: Material) {
    setEditingMaterial(material);
    setIsModalOpen(true);
  }

  function handleAddNew() {
    setEditingMaterial(null);
    setIsModalOpen(true);
  }

  /**
   * 保存処理
   * keepOpen=true のとき（「保存して次を入力」）はモーダルを閉じない
   */
  async function handleSave(
    data: Omit<Material, "id" | "createdAt" | "updatedAt">,
    keepOpen = false
  ) {
    if (editingMaterial) {
      await fetch(`/api/materials/${editingMaterial.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
    } else {
      await fetch("/api/materials", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
    }

    fetchMaterials(selectedClinic); // 一覧をバックグラウンドで更新

    if (!keepOpen) {
      setIsModalOpen(false);
      setEditingMaterial(null);
    } else {
      // 「保存して次を入力」の場合は編集モードを解除（新規入力モードに戻す）
      setEditingMaterial(null);
    }
  }

  // ── フィルター ────────────────────────────────────────
  const categories = [
    "all",
    ...Array.from(new Set(materials.map((m) => m.category))).sort(),
  ];

  const filteredMaterials =
    selectedCategory === "all"
      ? materials
      : materials.filter((m) => m.category === selectedCategory);

  // ── ソート：評価が悪い順 → 同評価内は残り日数が少ない順 ──
  // sortOrder: 0=危険 1=注意 2=やや少ない 3=理想 4=未設定
  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    const eA = getStockEval(a.currentStock, a.dailyUsage, selectedClinic);
    const eB = getStockEval(b.currentStock, b.dailyUsage, selectedClinic);
    if (eA.sortOrder !== eB.sortOrder) return eA.sortOrder - eB.sortOrder;
    return (eA.remainingDays ?? 99999) - (eB.remainingDays ?? 99999);
  });

  // ── ダッシュボード集計（全材料対象・フィルターなし） ───
  const allEvals        = materials.map((m) => getStockEval(m.currentStock, m.dailyUsage, selectedClinic));
  const dangerCount     = allEvals.filter((e) => e.level === "danger").length;
  const belowThreeMo    = allEvals.filter((e) => e.level !== "ideal" && e.level !== "unknown").length;
  const idealCount      = allEvals.filter((e) => e.level === "ideal").length;
  const achieveRate     = materials.length > 0
    ? Math.round((idealCount / materials.length) * 100) : 0;

  // 最も逼迫している材料（全材料を評価順にソートして先頭を取る）
  const mostCritical     = [...materials].sort((a, b) => {
    const eA = getStockEval(a.currentStock, a.dailyUsage, selectedClinic);
    const eB = getStockEval(b.currentStock, b.dailyUsage, selectedClinic);
    if (eA.sortOrder !== eB.sortOrder) return eA.sortOrder - eB.sortOrder;
    return (eA.remainingDays ?? 99999) - (eB.remainingDays ?? 99999);
  })[0];
  const mostCriticalEval = mostCritical
    ? getStockEval(mostCritical.currentStock, mostCritical.dailyUsage, selectedClinic)
    : null;

  // 達成率カードの色
  const rateTextColor = achieveRate >= 80 ? "text-green-600" : achieveRate >= 60 ? "text-yellow-600" : "text-orange-600";
  const rateBg        = achieveRate >= 80 ? "bg-green-50 border-green-100" : achieveRate >= 60 ? "bg-yellow-50 border-yellow-100" : "bg-orange-50 border-orange-100";

  // ─── レンダリング ───────────────────────────────────────
  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme.pageBg}`}>

      {/* ===== ヘッダー ===== */}
      <header className={`${theme.header} text-white shadow-lg transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">

          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">歯科在庫管理</h1>
              <p className="text-white/70 text-sm mt-0.5">3ヶ月在庫維持の見える化</p>
            </div>
            <button
              onClick={handleAddNew}
              className={`${theme.addBtn} px-4 py-2 rounded-lg font-semibold transition-colors text-sm`}
            >
              ＋ 新規登録
            </button>
          </div>

          {/* 医院切り替えタブ */}
          <div className="flex gap-1 bg-black/20 rounded-xl p-1 w-fit">
            {CLINICS.map((clinic) => (
              <button
                key={clinic}
                onClick={() => handleClinicChange(clinic)}
                className={`px-5 py-2 rounded-lg text-sm transition-all duration-200 ${
                  selectedClinic === clinic ? theme.tabActive : theme.tabInactive
                }`}
              >
                {clinic}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* ===== 医院情報バナー ===== */}
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3 flex-wrap">
          <span className="text-gray-500 text-sm">表示中：</span>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${theme.badge}`}>
            {selectedClinic}
          </span>
          <span className={theme.infoBadge}>
            {config.label} | 3ヶ月基準：{config.threeMonthDays}稼働日
          </span>
          <span className="text-gray-400 text-sm ml-auto">{materials.length}件の材料を管理中</span>
        </div>

        {/* ===== ダッシュボード ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          {/* 登録材料数 */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-3xl font-black text-gray-800">{materials.length}</div>
            <div className="text-gray-500 text-sm mt-1">登録材料数</div>
          </div>

          {/* 3ヶ月未満 */}
          <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-100">
            <div className="text-3xl font-black text-yellow-600">{belowThreeMo}</div>
            <div className="text-yellow-600 text-sm mt-1">3ヶ月未満の材料</div>
          </div>

          {/* 危険（1ヶ月未満） */}
          <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-100">
            <div className="text-3xl font-black text-red-600">{dangerCount}</div>
            <div className="text-red-500 text-sm mt-1">危険！1ヶ月未満</div>
          </div>

          {/* 3ヶ月達成率 */}
          <div className={`rounded-xl p-4 shadow-sm border ${rateBg}`}>
            <div className={`text-3xl font-black ${rateTextColor}`}>{achieveRate}%</div>
            <div className={`text-sm mt-1 ${rateTextColor}`}>3ヶ月在庫達成率</div>
            <div className="text-xs text-gray-400 mt-0.5">{idealCount}/{materials.length}件達成</div>
          </div>
        </div>

        {/* 最も逼迫している材料のバナー */}
        {mostCritical && mostCriticalEval && (
          mostCriticalEval.level === "ideal" ? (
            <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-200 flex items-center gap-2">
              <span className="text-green-500 text-lg">✓</span>
              <span className="text-green-700 font-medium text-sm">
                すべての材料が3ヶ月以上の在庫を維持しています！
              </span>
            </div>
          ) : (
            <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 flex-wrap ${mostCriticalEval.bg} ${mostCriticalEval.border}`}>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${mostCriticalEval.statusBadgeBg} ${mostCriticalEval.text}`}>
                {mostCriticalEval.status}
              </span>
              <span className={`font-bold ${mostCriticalEval.text}`}>
                最も逼迫：{getDisplayName(mostCritical)}
              </span>
              <span className={`text-sm ${mostCriticalEval.text}`}>
                残り {mostCriticalEval.remainingDays}稼働日
                （{mostCriticalEval.months}ヶ月分）
              </span>
              {mostCriticalEval.level === "danger" && (
                <span className="text-red-600 text-xs font-bold ml-auto">⚠ 至急発注を確認してください</span>
              )}
            </div>
          )
        )}

        {/* ===== 色の凡例（新ロジック・医院ごとに数値が変わる） ===== */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-4 flex-wrap">
          <span className="text-gray-500 font-medium text-xs whitespace-nowrap">
            在庫評価（{config.label}基準）：
          </span>
          <span className="flex items-center gap-1 text-xs">
            <span className="w-3 h-3 rounded bg-red-100 border border-red-300 shrink-0 inline-block" />
            <span className="text-red-700">危険（{config.monthDays}日未満・1ヶ月未満）</span>
          </span>
          <span className="flex items-center gap-1 text-xs">
            <span className="w-3 h-3 rounded bg-orange-100 border border-orange-300 shrink-0 inline-block" />
            <span className="text-orange-700">注意（1〜2ヶ月）</span>
          </span>
          <span className="flex items-center gap-1 text-xs">
            <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 shrink-0 inline-block" />
            <span className="text-yellow-700">やや少ない（2〜3ヶ月）</span>
          </span>
          <span className="flex items-center gap-1 text-xs">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-300 shrink-0 inline-block" />
            <span className="text-green-700">理想（{config.threeMonthDays}日以上・3ヶ月以上）</span>
          </span>
        </div>

        {/* ===== カテゴリフィルター ===== */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat ? theme.filterActive : theme.filterInactive
              }`}
            >
              {cat === "all" ? "すべて" : cat}
              {cat !== "all" && (
                <span className="ml-1 text-xs opacity-70">
                  ({materials.filter((m) => m.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ===== 材料一覧テーブル ===== */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">読み込み中...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left   px-4 py-3 font-semibold text-gray-600">材料名</th>
                    <th className="text-left   px-3 py-3 font-semibold text-gray-600">カテゴリ</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600">
                      在庫評価 ▲
                      <div className="text-xs font-normal text-gray-400">稼働日数 / ヶ月数</div>
                    </th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600">最終更新日</th>
                    <th className="text-right  px-3 py-3 font-semibold text-gray-600">現在庫数</th>
                    <th className="text-right  px-3 py-3 font-semibold text-gray-600">1日使用量</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedMaterials.map((material) => {
                    const ev         = getStockEval(material.currentStock, material.dailyUsage, selectedClinic);
                    const updated    = formatUpdatedAt(material.updatedAt);
                    const isDeleting = deleteConfirmId === material.id;

                    return (
                      <tr
                        key={material.id}
                        className={`hover:bg-gray-50/80 transition-colors ${ev.rowBg}`}
                      >
                        {/* 材料名 */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{getDisplayName(material)}</div>
                          {material.notes && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                              {material.notes}
                            </div>
                          )}
                          {material.importance === "high" && (
                            <span className="inline-block text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded mt-0.5 font-medium">
                              重要
                            </span>
                          )}
                        </td>

                        {/* カテゴリ */}
                        <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {material.category}
                        </td>

                        {/* 在庫評価バッジ（メインの見せ場）*/}
                        <td className="px-3 py-3 text-center">
                          {ev.remainingDays !== null ? (
                            <div className={`inline-flex flex-col items-center px-3 py-2 rounded-xl border ${ev.bg} ${ev.text} ${ev.border}`}>
                              <span className="text-2xl font-black leading-none">{ev.remainingDays}</span>
                              <span className="text-[10px] opacity-60 leading-tight">稼働日</span>
                              <span className="text-sm font-bold mt-0.5">{ev.months}ヶ月分</span>
                              <span className={`text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-full ${ev.statusBadgeBg}`}>
                                {ev.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">－</span>
                          )}
                        </td>

                        {/* 最終更新日 */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {updated.isToday ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                              今日
                            </span>
                          ) : updated.diffDays >= 3 ? (
                            <span className="text-gray-400 text-xs">
                              <span className="block">{updated.text}</span>
                              <span className="text-gray-300">要確認</span>
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">{updated.text}</span>
                          )}
                        </td>

                        {/* 現在庫数 */}
                        <td className="px-3 py-3 text-right">
                          <span className="font-semibold text-gray-800">{material.currentStock}</span>
                          <span className="text-gray-400 text-xs ml-1">{material.unit}</span>
                        </td>

                        {/* 1日使用量 */}
                        <td className="px-3 py-3 text-right">
                          <span className="text-gray-600 text-xs">{material.dailyUsage}</span>
                          <span className="text-gray-400 text-xs ml-1">{material.unit}/日</span>
                        </td>

                        {/* 操作 */}
                        <td className="px-3 py-3 text-center">
                          {isDeleting ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs text-gray-500">削除しますか?</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleDelete(material.id)}
                                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                >削除</button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300"
                                >取消</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => handleEdit(material)}
                                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                              >編集</button>
                              <button
                                onClick={() => setDeleteConfirmId(material.id)}
                                className="text-red-500 hover:text-red-700 font-medium transition-colors"
                              >削除</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {sortedMaterials.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        {selectedCategory === "all"
                          ? "材料が登録されていません"
                          : `「${selectedCategory}」カテゴリの材料はありません`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
              {filteredMaterials.length}件表示
              {selectedCategory !== "all" && ` (全${materials.length}件中)`}
              　※ 評価は{config.label}（3ヶ月目標：{config.threeMonthDays}稼働日）基準
            </div>
          </div>
        )}
      </main>

      {/* ===== 登録・編集モーダル ===== */}
      {isModalOpen && (
        <MaterialModal
          material={editingMaterial}
          defaultClinic={selectedClinic}
          onSave={handleSave}
          onClose={() => {
            setIsModalOpen(false);
            setEditingMaterial(null);
          }}
        />
      )}
    </div>
  );
}
