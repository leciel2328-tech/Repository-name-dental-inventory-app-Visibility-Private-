"use client";

import { useState, useEffect } from "react";

// ─── 医院リスト（page.tsx と同じ定数を使う）───────────────
// 将来的に増える場合は、別ファイル（constants.ts など）に切り出すと管理しやすくなります
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
  material: Material | null;      // null = 新規登録、値 = 編集
  defaultClinic: string;          // 現在選択中の医院（新規登録時の初期値）
  onSave: (data: Omit<Material, "id">) => void;
  onClose: () => void;
}

// カテゴリの選択肢
const CATEGORIES = ["麻酔", "衛生用品", "滅菌・消毒", "その他"];

// 単位の選択肢
const UNITS = ["本", "枚", "個", "双", "kg", "g", "ml", "袋", "箱", "セット", "パック"];

// ─── コンポーネント ───────────────────────────────────────
export default function MaterialModal({ material, defaultClinic, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    name:         "",
    size:         "",
    clinic:       defaultClinic,   // 現在の医院を初期値にセット
    category:     "衛生用品",
    currentStock: "",
    unit:         "個",
    dailyUsage:   "",
    importance:   "medium",
    notes:        "",
  });

  // 編集モード: 既存データをフォームにセット
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name:         form.name.trim(),
      size:         form.size.trim(),
      clinic:       form.clinic,
      category:     form.category,
      currentStock: parseFloat(form.currentStock) || 0,
      unit:         form.unit,
      dailyUsage:   parseFloat(form.dailyUsage)   || 0,
      importance:   form.importance,
      notes:        form.notes.trim(),
    });
  }

  // モーダル外クリックで閉じる
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // 残り日数のリアルタイムプレビュー
  const previewDays =
    parseFloat(form.dailyUsage) > 0
      ? Math.floor(parseFloat(form.currentStock) / parseFloat(form.dailyUsage))
      : null;

  function getPreviewColor(days: number | null) {
    if (days === null) return "text-gray-400";
    if (days < 7)  return "text-red-600 font-bold";
    if (days < 14) return "text-orange-600 font-bold";
    if (days < 30) return "text-yellow-600";
    return "text-green-600";
  }

  // 表示名プレビュー（名前＋サイズ）
  const displayNamePreview = form.size
    ? `${form.name} ${form.size}`
    : form.name;

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
              {material ? "材料を編集" : "材料を新規登録"}
            </h2>
            {form.name && (
              <p className="text-sm text-gray-400 mt-0.5">
                表示名：<span className="text-blue-600 font-medium">{displayNamePreview}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* ── 医院選択（必須） ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              医院 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CLINICS.map((clinic) => (
                <label
                  key={clinic}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                    form.clinic === clinic
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                      : "border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="clinic"
                    value={clinic}
                    checked={form.clinic === clinic}
                    onChange={handleChange}
                    className="sr-only"  // ラジオボタン本体は非表示にしてラベル全体をクリック可能にする
                  />
                  <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                    form.clinic === clinic
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300"
                  }`} />
                  {clinic}
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: グローブ、滅菌パック、浸潤麻酔"
            />
          </div>

          {/* ── サイズ・規格（任意） ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              サイズ・規格
              <span className="ml-1 text-xs text-gray-400 font-normal">（任意 — サイズ展開がある場合）</span>
            </label>
            <input
              name="size"
              value={form.size}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: SS / S / L / M / MS / 27G"
            />
            {form.size && (
              <p className="text-xs text-gray-400 mt-1">
                一覧の表示名：「<span className="font-medium text-gray-600">{displayNamePreview}</span>」
              </p>
            )}
          </div>

          {/* ── カテゴリ・重要度 ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                カテゴリ <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">重要度</label>
              <select
                name="importance"
                value={form.importance}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">高（必須材料）</option>
                <option value="medium">中（通常材料）</option>
                <option value="low">低（あれば良い）</option>
              </select>
            </div>
          </div>

          {/* ── 現在庫数・単位 ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              現在庫数 <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <input
                name="currentStock"
                type="number" min="0" step="any"
                value={form.currentStock}
                onChange={handleChange}
                required
                className="flex-1 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
              <select
                name="unit"
                value={form.unit}
                onChange={handleChange}
                className="border border-gray-300 rounded-r-lg px-2 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
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
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 10"
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">{form.unit}/日</span>
            </div>
          </div>

          {/* 残り日数プレビュー */}
          {previewDays !== null && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm flex items-center gap-2">
              <span className="text-gray-500">残り日数（計算結果）：</span>
              <span className={`text-lg ${getPreviewColor(previewDays)}`}>{previewDays}日</span>
              {previewDays < 7 && <span className="text-xs text-red-500">⚠ 要発注</span>}
            </div>
          )}

          {/* ── メモ ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              placeholder="仕入れ先、規格、発注リードタイムなど"
            />
          </div>

          {/* ── ボタン ── */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {material ? "更新する" : "登録する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
