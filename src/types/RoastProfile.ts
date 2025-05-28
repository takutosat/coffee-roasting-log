// src/types/RoastProfile.ts
export interface RoastProfile {
  id: string; // プロファイルの一意なID
  name: string; // プロファイル名（例: エチオピア イルガチェフェ）
  bean: string; // 豆の種類（例: エチオピア産 アラビカ種）
  roastLevel: string; // 焙煎度（例: ミディアム、ダーク）
  startTime: Date; // 焙煎開始日時
  endTime?: Date; // 焙煎終了日時（オプション）
  duration: number; // 焙煎時間（秒）
  temperatureLog: TemperaturePoint[]; // 温度ログの配列
  notes: string; // 自由記述メモ
  flavorNotes?: string; // 焙煎後の味の感想
  isFavorite?: boolean; // ★21行目: この行を追加します
  weight: { // 焙煎前後の重量
    green: number; // 生豆重量 (g)
    roasted: number; // 焙煎後重量 (g)
  };
}

// 温度記録の各ポイントの型定義
export interface TemperaturePoint {
  time: number; // 焙煎開始からの時間（秒）
  temperature: number; // その時点での温度（°C）
  timestamp: Date; // 温度が記録された正確な日時
}

// 焙煎プロファイルの型定義
export interface RoastProfile {
  id: string; // プロファイルの一意なID
  name: string; // プロファイル名（例: エチオピア イルガチェフェ）
  bean: string; // 豆の種類（例: エチオピア産 アラビカ種）
  roastLevel: string; // 焙煎度（例: ミディアム、ダーク）
  startTime: Date; // 焙煎開始日時
  endTime?: Date; // 焙煎終了日時（オプション）
  duration: number; // 焙煎時間（秒）
  temperatureLog: TemperaturePoint[]; // 温度ログの配列
  notes: string; // 自由記述メモ
  flavorNotes?: string; // 焙煎後の味の感想
  weight: { // 焙煎前後の重量
    green: number; // 生豆重量 (g)
    roasted: number; // 焙煎後重量 (g)
  };
}

// RoastProfileFormから渡されるデータの型定義
export interface RoastProfileFormData {
  name: string;
  bean: string;
  roastLevel: string;
  greenWeight: number;
  roastedWeight: number;
  notes: string;
}