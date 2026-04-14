"use client";

import { useState, useEffect } from "react";
import MaterialModal from "@/components/MaterialModal";

// ─── 医院リスト ───────────────────────────────────────────
// as const をつけることで、TypeScriptが「文字列の配列」ではなく
// 「この2つの文字列だけ」と認識し、型安全になります
const CLINICS = [
  "あつたの森歯科クリニック",
  "あかつき台歯科医院",
] as const;

type ClinicName = (typeof CLINICS)[number]; // どちらかの医院名 という型

// ─── 医院ごとのカラーテーマ ───────────────────────────────
// Tailwindのクラス名を文字列で管理します
// ※ テンプレートリテラル（`bg-${color}-50`）は使わない！
//   → Tailwindは文字列を静的にスキャンするので、完全なクラス名で書く必要があります
const CLINIC_THEME: Record<
  ClinicName,
  {
    pageBg: string;      // ページ背景
    header: string;      // ヘッダー背景
    addBtn: string;      // 新規登録ボタン
    tabActive: string;   // 選択中の医院タブ
    tabInactive: string; // 非選択の医院タブ
    filterActive: string;   // カテゴリフィルター（選択中）
    filterInactive: string; // カテゴリフィルター（非選択）
    badge: string;       // 現在の医院バッジ
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
  },
};

// ─── 型定義 ───────────────────────────────────────────────
interface Material {
  id: number;
  name: string;
  size: string;
  clinic: string;   // 追加：どの医院の在庫か
  category: string;
  currentStock: number;
  unit: string;
  dailyUsage: number;
  importance: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── ユーティリティ関数 ───────────────────────────────────

/** 残り日数を計算する（0除算を防ぐ） */
function getRemainingDays(stock: number, usage: number): number | null {
  if (usage <= 0) return null;
  return Math.floor(stock / usage);
}

/** 残り日数に応じた色設定を返す */
function getDaysBadge(days: number | null) {
  if (days === null) return { bg: "bg-gray-100",    text: "text-gray-500",   border: "border-gray-200",  rowBg: "",              label: "－",       status: "不明" };
  if (days < 7)      return { bg: "bg-red-100",     text: "text-red-700",    border: "border-red-300",   rowBg: "bg-red-50/40",  label: `${days}日`, status: "危険" };
  if (days < 14)     return { bg: "bg-orange-100",  text: "text-orange-700", border: "border-orange-300",rowBg: "bg-orange-50/30",label: `${days}日`, status: "注意" };
  if (days < 30)     return { bg: "bg-yellow-100",  text: "text-yellow-700", border: "border-yellow-300",rowBg: "",              label: `${days}日`, status: "やや少ない" };
  return               { bg: "bg-green-100",   text: "text-green-700",  border: "border-green-300", rowBg: "",              label: `${days}日`, status: "十分" };
}

/** 重要度の表示設定 */
const IMPORTANCE_MAP: Record<string, { label: string; className: string }> = {
  high:   { label: "高", className: "bg-red-100 text-red-700" },
  medium: { label: "中", className: "bg-yellow-100 text-yellow-700" },
  low:    { label: "低", className: "bg-green-100 text-green-700" },
};

/** 材料名+サイズを組み合わせた表示名を返す */
function getDisplayName(m: Material): string {
  return m.size ? `${m.name} ${m.size}` : m.name;
}

/**
 * updatedAt を「人が読みやすい形式」に変換する関数
 *
 * 返り値:
 *   text     … 画面に表示する文字列（「今日」「昨日」「2026/04/14」など）
 *   isToday  … 今日更新されたか
 *   diffDays … 最終更新から何日経過しているか（3以上でグレー表示）
 */
function formatUpdatedAt(dateStr: string): {
  text: string;
  isToday: boolean;
  diffDays: number;
} {
  const date = new Date(dateStr); // ISO文字列 → Dateオブジェクト
  const now  = new Date();

  // 「日付だけ」で比較するために、時刻を0時0分0秒にそろえる
  const dateDay  = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());

  // 経過日数（ミリ秒 → 日）
  const diffMs   = todayDay.getTime() - dateDay.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // 表示テキストを決定
  let text: string;
  if (diffDays === 0) {
    text = "今日";
  } else if (diffDays === 1) {
    text = "昨日";
  } else {
    // 2日以上前は「YYYY/MM/DD」形式
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0"); // 1→"01", 10→"10"
    const d = String(date.getDate()).padStart(2, "0");
    text = `${y}/${m}/${d}`;
  }

  return { text, isToday: diffDays === 0, diffDays };
}

// ─── メインコンポーネント ─────────────────────────────────
export default function Home() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<ClinicName>(CLINICS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // 現在の医院テーマを取得（ボタン・背景色の設定）
  const theme = CLINIC_THEME[selectedClinic];

  // ── APIコール ────────────────────────────────────────────
  async function fetchMaterials(clinic: string) {
    setLoading(true);
    // URLパラメータ ?clinic=医院名 で絞り込み
    const res = await fetch(`/api/materials?clinic=${encodeURIComponent(clinic)}`);
    const data = await res.json();
    setMaterials(data);
    setLoading(false);
  }

  // 医院が変わるたびに自動でデータ取得
  useEffect(() => {
    fetchMaterials(selectedClinic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClinic]);

  // ── イベントハンドラ ─────────────────────────────────────

  /** 医院切り替え（カテゴリフィルターもリセット） */
  function handleClinicChange(clinic: ClinicName) {
    setSelectedClinic(clinic);
    setSelectedCategory("all");
  }

  /** 削除 */
  async function handleDelete(id: number) {
    await fetch(`/api/materials/${id}`, { method: "DELETE" });
    setDeleteConfirmId(null);
    fetchMaterials(selectedClinic);
  }

  /** 編集モーダルを開く */
  function handleEdit(material: Material) {
    setEditingMaterial(material);
    setIsModalOpen(true);
  }

  /** 新規登録モーダルを開く */
  function handleAddNew() {
    setEditingMaterial(null);
    setIsModalOpen(true);
  }

  /** 登録・更新の保存 */
  async function handleSave(data: Omit<Material, "id" | "createdAt" | "updatedAt">) {
    if (editingMaterial) {
      await fetch(`/api/materials/${editingMaterial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setIsModalOpen(false);
    fetchMaterials(selectedClinic);
  }

  // ── フィルター・ソート ────────────────────────────────────
  const categories = [
    "all",
    ...Array.from(new Set(materials.map((m) => m.category))).sort(),
  ];

  const filteredMaterials =
    selectedCategory === "all"
      ? materials
      : materials.filter((m) => m.category === selectedCategory);

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    const dA = getRemainingDays(a.currentStock, a.dailyUsage);
    const dB = getRemainingDays(b.currentStock, b.dailyUsage);
    if (dA === null && dB === null) return 0;
    if (dA === null) return 1;
    if (dB === null) return -1;
    return dA - dB;
  });

  // ── サマリー集計 ─────────────────────────────────────────
  const criticalCount = materials.filter((m) => {
    const d = getRemainingDays(m.currentStock, m.dailyUsage);
    return d !== null && d < 7;
  }).length;

  const warningCount = materials.filter((m) => {
    const d = getRemainingDays(m.currentStock, m.dailyUsage);
    return d !== null && d >= 7 && d < 14;
  }).length;

  // ── レンダリング ─────────────────────────────────────────
  return (
    // ページ全体の背景色：医院によって切り替え（transition で滑らかに）
    <div className={`min-h-screen transition-colors duration-300 ${theme.pageBg}`}>

      {/* ===== ヘッダー ===== */}
      <header className={`${theme.header} text-white shadow-lg transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">

          {/* タイトル行 */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">歯科在庫管理</h1>
              <p className="text-white/70 text-sm mt-0.5">医院運営可能日数の見える化</p>
            </div>
            <button
              onClick={handleAddNew}
              className={`${theme.addBtn} px-4 py-2 rounded-lg font-semibold transition-colors text-sm`}
            >
              ＋ 新規登録
            </button>
          </div>

          {/* 医院切り替えタブ
              bg-black/20 の黒半透明コンテナの中にタブを並べています */}
          <div className="flex gap-1 bg-black/20 rounded-xl p-1 w-fit">
            {CLINICS.map((clinic) => (
              <button
                key={clinic}
                onClick={() => handleClinicChange(clinic)}
                className={`px-5 py-2 rounded-lg text-sm transition-all duration-200 ${
                  selectedClinic === clinic
                    ? theme.tabActive     // 選択中：白背景＋テーマ色テキスト
                    : theme.tabInactive   // 非選択：透明背景＋薄いテキスト
                }`}
              >
                {clinic}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* ===== 現在の医院表示バナー ===== */}
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3 flex-wrap">
          <span className="text-gray-500 text-sm">表示中：</span>
          {/* 医院名バッジ：テーマ色で表示 */}
          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${theme.badge}`}>
            {selectedClinic}
          </span>
          <span className="text-gray-300 text-sm">|</span>
          <span className="text-gray-500 text-sm">{materials.length}件の材料を管理中</span>
        </div>

        {/* ===== サマリーカード（選択中の医院のデータのみ集計） ===== */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-3xl font-bold text-gray-800">{materials.length}</div>
            <div className="text-gray-500 text-sm mt-1">登録材料数</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-100">
            <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
            <div className="text-red-500 text-sm mt-1">危険（7日未満）</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 shadow-sm border border-orange-100">
            <div className="text-3xl font-bold text-orange-600">{warningCount}</div>
            <div className="text-orange-500 text-sm mt-1">注意（7〜13日）</div>
          </div>
        </div>

        {/* ===== 色の凡例 ===== */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-5 flex-wrap text-sm">
          <span className="text-gray-500 font-medium">残り日数の目安：</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-red-100    border border-red-300    inline-block shrink-0" /><span className="text-red-700">   7日未満　危険</span></span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-orange-100 border border-orange-300 inline-block shrink-0" /><span className="text-orange-700">7〜13日　注意</span></span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-yellow-100 border border-yellow-300 inline-block shrink-0" /><span className="text-yellow-700">14〜29日　やや少ない</span></span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-green-100  border border-green-300  inline-block shrink-0" /><span className="text-green-700">30日以上　十分</span></span>
        </div>

        {/* ===== カテゴリフィルター ===== */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? theme.filterActive
                  : theme.filterInactive
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
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left   px-4 py-3 font-semibold text-gray-600">材料名</th>
                  <th className="text-left   px-4 py-3 font-semibold text-gray-600">カテゴリ</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">残り日数 ▲</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">最終更新日</th>
                  <th className="text-right  px-4 py-3 font-semibold text-gray-600">現在庫数</th>
                  <th className="text-right  px-4 py-3 font-semibold text-gray-600">1日使用量</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">重要度</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedMaterials.map((material) => {
                  const days  = getRemainingDays(material.currentStock, material.dailyUsage);
                  const badge = getDaysBadge(days);
                  const imp     = IMPORTANCE_MAP[material.importance] ?? IMPORTANCE_MAP.medium;
                  const updated = formatUpdatedAt(material.updatedAt); // 日付フォーマット
                  const isDeleting = deleteConfirmId === material.id;

                  return (
                    <tr
                      key={material.id}
                      className={`hover:bg-gray-50/80 transition-colors ${badge.rowBg}`}
                    >
                      {/* 材料名（名前＋サイズを組み合わせ） */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{getDisplayName(material)}</div>
                        {material.notes && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                            {material.notes}
                          </div>
                        )}
                      </td>

                      {/* カテゴリ */}
                      <td className="px-4 py-3 text-gray-600">{material.category}</td>

                      {/* 残り日数バッジ */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex flex-col items-center px-3 py-1 rounded-lg text-sm font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                          <span className="text-xs font-normal opacity-70">{badge.status}</span>
                        </span>
                      </td>

                      {/* 最終更新日
                          今日     → 青バッジ「今日」
                          1〜2日前 → 通常グレー
                          3日以上前 → 薄いグレー + 「要確認」表示 */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {updated.isToday ? (
                          // 今日更新された場合：青いバッジで目立たせる
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                            今日
                          </span>
                        ) : updated.diffDays >= 3 ? (
                          // 3日以上前：グレーアウトして要確認を促す
                          <span className="text-gray-400 text-xs">
                            <span className="block">{updated.text}</span>
                            <span className="text-gray-300">要確認</span>
                          </span>
                        ) : (
                          // 昨日〜2日前：通常表示
                          <span className="text-gray-500 text-xs">{updated.text}</span>
                        )}
                      </td>

                      {/* 現在庫数 */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-800">{material.currentStock}</span>
                        <span className="text-gray-400 ml-1">{material.unit}</span>
                      </td>

                      {/* 1日使用量 */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-600">{material.dailyUsage}</span>
                        <span className="text-gray-400 ml-1">{material.unit}/日</span>
                      </td>

                      {/* 重要度 */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${imp.className}`}>
                          {imp.label}
                        </span>
                      </td>

                      {/* 操作ボタン */}
                      <td className="px-4 py-3 text-center">
                        {isDeleting ? (
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <span className="text-xs text-gray-500">削除しますか?</span>
                            <button
                              onClick={() => handleDelete(material.id)}
                              className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                            >削除</button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300 transition-colors"
                            >取消</button>
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
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      {selectedCategory === "all"
                        ? "材料が登録されていません"
                        : `「${selectedCategory}」カテゴリの材料はありません`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* テーブルフッター */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
              {filteredMaterials.length}件表示
              {selectedCategory !== "all" && ` (全${materials.length}件中)`}
            </div>
          </div>
        )}
      </main>

      {/* ===== 登録・編集モーダル ===== */}
      {isModalOpen && (
        <MaterialModal
          material={editingMaterial}
          defaultClinic={selectedClinic}  // 現在の医院を初期値として渡す
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
