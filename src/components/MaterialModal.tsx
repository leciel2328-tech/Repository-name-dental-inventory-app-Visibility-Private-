"use client";

import { useState, useEffect } from "react";

const CLINICS = [
  "あつたの森歯科クリニック",
  "あかつき台歯科医院",
] as const;

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
}

interface Props {
  material: Material | null;
  defaultClinic: string;
  // keepOpen=true のとき「保存して次を入力」→ モーダルを閉じない
  onSave: (data: Omit<Material, "id">, keepOpen?: boolean) => void;
  onClose: () => void;
}

// ─── カテゴリ（新分類） ──────────────────────────────────
const CATEGORIES = ["麻酔関連", "衛生材料", "滅菌関連", "その他"];

// ─── 単位（「双」を削除） ────────────────────────────────
const UNITS_QUICK = ["箱", "個", "本", "枚", "パック"];  // ワンクリック選択用
const UNITS_ALL   = ["箱", "個", "本", "枚", "パック", "袋", "セット", "kg", "g", "ml"]; // ドロップダウン用

// ─── フォームの初期値 ────────────────────────────────────
const INITIAL_FORM = {
  name: "", size: "", clinic: "",
  category: "衛生材料", currentStock: "", unit: "箱",
  dailyUsage: "", importance: "medium", notes: "",
};

// ─── コンポーネント ───────────────────────────────────────
export default function MaterialModal({ material, defaultClinic, onSave, onClose }: Props) {
  const [form, setForm] = useState({ ...INITIAL_FORM, clinic: defaultClinic });
  // 「保存して次を入力」で連続保存した件数（フィードバック表示用）
  const [savedCount, setSavedCount] = useState(0);

  // 編集モード：既存データをフォームにセット
  useEffect(() => {
    if (material) {
      setForm({
        name:         material.name,
        size:         material.size,
        clinic:       material.clinic,
        category:     material.category,
        currentStock: String(material.currentStock),
        unit:         material.unit,
        dailyUsage:   String(material.dailyUsage),
        importance:   material.importance,
        notes:        material.notes,
      });
    }
  }, [material]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function getFormData() {
    return {
      name:         form.name.trim(),
      size:         form.size.trim(),
      clinic:       form.clinic,
      category:     form.category,
      currentStock: parseFloat(form.currentStock) || 0,
      unit:         form.unit,
      dailyUsage:   parseFloat(form.dailyUsage)   || 0,
      importance:   form.importance,
      notes:        form.notes.trim(),
    };
  }

  /**
   * 保存処理
   * keepOpen=false → 通常保存、モーダルを閉じる（「保存して閉じる」）
   * keepOpen=true  → 保存後もモーダルを開いたままフォームをリセット（「保存して次を入力」）
   */
  function handleSubmit(keepOpen: boolean) {
    onSave(getFormData(), keepOpen);

    if (keepOpen) {
      setSavedCount((c) => c + 1);
      // 医院・カテゴリ・単位・重要度は維持し、入力値だけリセット
      setForm((prev) => ({
        ...INITIAL_FORM,
        clinic:     prev.clinic,
        category:   prev.category,
        unit:       prev.unit,
        importance: prev.importance,
      }));
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // 残り稼働日数のリアルタイムプレビュー
  const previewDays =
    parseFloat(form.dailyUsage) > 0
      ? Math.floor(parseFloat(form.currentStock) / parseFloat(form.dailyUsage))
      : null;

  // プレビューの色（医院の稼働日基準で色分け）
  const clinicMonthDays = form.clinic.includes("あつた") ? 26 : 22;
  function getPreviewColor(days: number | null) {
    if (days === null) return "text-gray-400";
    if (days < clinicMonthDays)       return "text-red-600 font-bold";
    if (days < clinicMonthDays * 2)   return "text-orange-600 font-bold";
    if (days < clinicMonthDays * 3)   return "text-yellow-600";
    return "text-green-600 font-bold";
  }
  const previewMonths = previewDays !== null
    ? (previewDays / clinicMonthDays).toFixed(1)
    : null;

  const displayNamePreview = form.size ? `${form.name} ${form.size}` : form.name;
  const isEditMode = material !== null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {isEditMode ? "材料を編集" : "材料を新規登録"}
            </h2>
            {form.name && (
              <p className="text-sm text-gray-400 mt-0.5">
                表示名：<span className="text-blue-600 font-medium">{displayNamePreview}</span>
              </p>
            )}
            {/* 連続保存時のフィードバック */}
            {savedCount > 0 && (
              <p className="text-sm text-green-600 font-semibold mt-0.5">
                ✓ {savedCount}件保存済み — 続けて入力できます
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }}
          className="p-6 space-y-4"
        >

          {/* ── 医院選択 ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              医院 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CLINICS.map((clinic) => (
                <label
                  key={clinic}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                    form.clinic === clinic
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                      : "border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <input type="radio" name="clinic" value={clinic} checked={form.clinic === clinic} onChange={handleChange} className="sr-only" />
                  <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${form.clinic === clinic ? "border-blue-500 bg-blue-500" : "border-gray-300"}`} />
                  {clinic}
                </label>
              ))}
            </div>
          </div>

          {/* ── カテゴリ（ラジオボタン選択） ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                    form.category === cat
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                      : "border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <input type="radio" name="category" value={cat} checked={form.category === cat} onChange={handleChange} className="sr-only" />
                  <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${form.category === cat ? "border-blue-500 bg-blue-500" : "border-gray-300"}`} />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          {/* ── 材料名 ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              材料名 <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: グローブ、滅菌パック、浸潤麻酔"
            />
          </div>

          {/* ── サイズ・規格（任意） ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              サイズ・規格
              <span className="ml-1 text-xs text-gray-400 font-normal">（任意 — S/M/Lなど）</span>
            </label>
            <input
              name="size"
              value={form.size}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: SS / S / M / L / 27G"
            />
            {form.size && (
              <p className="text-xs text-gray-400 mt-1">
                一覧の表示名：「<span className="font-medium text-gray-600">{displayNamePreview}</span>」
              </p>
            )}
          </div>

          {/* ── 現在庫数 ＋ 単位 ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              現在庫数 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 items-start flex-wrap">
              <input
                name="currentStock"
                type="number" min="0" step="any"
                value={form.currentStock}
                onChange={handleChange}
                required
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
              {/* よく使う単位のクイック選択ボタン */}
              <div className="flex gap-1 flex-wrap flex-1">
                {UNITS_QUICK.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, unit: u }))}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                      form.unit === u
                        ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {u}
                  </button>
                ))}
                {/* その他の単位はドロップダウン */}
                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg px-2 py-2 text-xs bg-gray-50 focus:outline-none"
                  title="その他の単位"
                >
                  {UNITS_ALL.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── 1日平均使用数 ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              1日平均使用数 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                name="dailyUsage"
                type="number" min="0" step="any"
                value={form.dailyUsage}
                onChange={handleChange}
                required
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 0.3"
              />
              <span className="text-sm text-gray-500">{form.unit}/日</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">箱単位の場合は小数（例: 0.2箱/日 = 週1箱強）</p>
          </div>

          {/* 残り稼働日数プレビュー */}
          {previewDays !== null && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm flex items-center gap-3 flex-wrap">
              <span className="text-gray-500">残り稼働日数（目安）：</span>
              <span className={`text-xl font-black ${getPreviewColor(previewDays)}`}>{previewDays}日</span>
              {previewMonths && (
                <span className={`text-sm font-semibold ${getPreviewColor(previewDays)}`}>
                  約{previewMonths}ヶ月分
                </span>
              )}
              {previewDays < clinicMonthDays && (
                <span className="text-xs text-red-500 font-semibold">⚠ 1ヶ月未満 — 要発注</span>
              )}
            </div>
          )}

          {/* ── 重要度 ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">重要度</label>
            <div className="flex gap-2">
              {[
                { value: "high",   label: "高（必須材料）", activeClass: "border-red-400 bg-red-50 text-red-700" },
                { value: "medium", label: "中（通常）",     activeClass: "border-yellow-400 bg-yellow-50 text-yellow-700" },
                { value: "low",    label: "低（任意）",     activeClass: "border-green-400 bg-green-50 text-green-700" },
              ].map(({ value, label, activeClass }) => (
                <label
                  key={value}
                  className={`flex-1 flex items-center justify-center py-2 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${
                    form.importance === value
                      ? activeClass
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <input type="radio" name="importance" value={value} checked={form.importance === value} onChange={handleChange} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* ── メモ（任意） ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ
              <span className="ml-1 text-xs text-gray-400 font-normal">（任意）</span>
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              placeholder="仕入れ先、発注リードタイムなど"
            />
          </div>

          {/* ── ボタン ── */}
          <div className="flex flex-col gap-2 pt-2">
            {/* 新規登録時のみ「保存して次を入力」ボタン（メインアクション） */}
            {!isEditMode && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="w-full px-4 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                ✓ 保存して次を入力
              </button>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {savedCount > 0 ? `閉じる（${savedCount}件保存済み）` : "キャンセル"}
              </button>
              <button
                type="submit"
                className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${
                  isEditMode ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-500 hover:bg-gray-600"
                }`}
              >
                {isEditMode ? "更新して閉じる" : "保存して閉じる"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
