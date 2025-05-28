// src/components/features/RoastLog/RoastLogForm.tsx

import React from 'react';
import type { RoastLog } from '../../../types/roast'; // RoastLog型をインポート

interface RoastLogFormProps {
  onSubmit: (log: Omit<RoastLog, 'id'>) => void; // idは自動生成するのでOmitで除外
}

const RoastLogForm: React.FC<RoastLogFormProps> = ({ onSubmit }) => {
  // フォームの状態を管理するためのstate（仮）
  // 後で状態管理ライブラリに移行します
  const [beanName, setBeanName] = React.useState('');
  const [roastDegree, setRoastDegree] = React.useState('');
  const [roastTime, setRoastTime] = React.useState(''); // 数値として扱うため文字列で一旦保持

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // ページの再読み込みを防ぐ

    // 簡易的なバリデーション（後で強化）
    if (!beanName || !roastDegree || !roastTime) {
      alert('すべての必須項目を入力してください。');
      return;
    }

    // 日付は今日の日付を自動設定
    const today = new Date();
    const date = today.toISOString().split('T')[0]; // "YYYY-MM-DD" 形式

    const newLog: Omit<RoastLog, 'id'> = {
      date,
      beanName,
      origin: '', // 仮の値、後で入力フィールドを追加
      roastDegree,
      roastTime: parseInt(roastTime, 10), // 文字列から数値に変換
      weightBefore: 0, // 仮の値
      weightAfter: 0, // 仮の値
      memo: '', // 仮の値
    };

    onSubmit(newLog);

    // フォームのリセット
    setBeanName('');
    setRoastDegree('');
    setRoastTime('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">新しい焙煎ログを追加</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="beanName" className="block text-sm font-medium text-gray-700">豆の名前</label>
          <input
            type="text"
            id="beanName"
            value={beanName}
            onChange={(e) => setBeanName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="例: エチオピア イルガチェフェ"
            required
          />
        </div>
        <div>
          <label htmlFor="roastDegree" className="block text-sm font-medium text-gray-700">焙煎度</label>
          <input
            type="text"
            id="roastDegree"
            value={roastDegree}
            onChange={(e) => setRoastDegree(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="例: シティロースト"
            required
          />
        </div>
        <div>
          <label htmlFor="roastTime" className="block text-sm font-medium text-gray-700">焙煎時間 (秒)</label>
          <input
            type="number" // 数値入力に制限
            id="roastTime"
            value={roastTime}
            onChange={(e) => setRoastTime(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="例: 600 (秒)"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          ログを保存
        </button>
      </form>
    </div>
  );
};

export default RoastLogForm;