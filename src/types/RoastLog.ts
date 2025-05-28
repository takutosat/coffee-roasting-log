// src/types/RoastLog.ts

// RoastLogForm.tsx から読み取ったデータ構造と合わせます
export type RoastLog = {
  id?: string; // FirestoreのIDはオプション
  date: string; // "YYYY-MM-DD" 形式
  beanName: string;
  origin: string; // フォームにはないが型として定義
  roastDegree: string;
  roastTime: number; // 秒数
  weightBefore: number; // 仮の値
  weightAfter: number; // 仮の値
  memo: string; // 仮の値
};

// もしRoastLogに付随するイベントがあるなら、ここにRoastEventなどを定義することもできますが、
// 現在のRoastLogFormからは読み取れないため、今回は含めません。