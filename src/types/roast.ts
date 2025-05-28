// src/types/roast.ts

export interface RoastLog {
  id: string; // ログを一意に識別するID
  date: string; // 焙煎日 (例: "2025-05-28")
  beanName: string; // 豆の名前 (例: "エチオピア イルガチェフェ")
  origin: string; // 原産国/地域 (例: "エチオピア")
  roastDegree: string; // 焙煎度 (例: "シティロースト", "フルシティロースト")
  roastTime: number; // 焙煎時間 (秒単位)
  firstCrackTime?: number; // 1ハゼの時間 (秒単位, オプション)
  secondCrackTime?: number; // 2ハゼの時間 (秒単位, オプション)
  weightBefore: number; // 焙煎前の生豆の重さ (グラム)
  weightAfter: number; // 焙煎後の豆の重さ (グラム)
  memo?: string; // 自由記述メモ (オプション)
  // 追加したい項目があればここに追加できます
}