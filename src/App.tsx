import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, Square, Plus, Download, Upload, Coffee, TrendingUp, Clock, Thermometer, X, MessageSquare } from 'lucide-react'; // MessageSquareアイコンを追加
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { v4 as uuidv4 } from 'uuid'; // ID 生成のために
import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// 型定義
// 温度記録の各ポイントの型定義
interface TemperaturePoint {
  time: number; // 焙煎開始からの時間（秒）
  temperature: number; // その時点での温度（°C）
  timestamp: Date; // 温度が記録された正確な日時
}

// 焙煎プロファイルの型定義
interface RoastProfile {
  id: string; // プロファイルの一意なID
  name: string; // プロファイル名（例: エチオピア イルガチェフェ）
  bean: string; // 豆の種類（例: エチオピア産 アラビカ種）
  roastLevel: string; // 焙煎度（例: ミディアム、ダーク）
  startTime: Date; // 焙煎開始日時
  endTime?: Date; // 焙煎終了日時（オプション）
  duration: number; // 焙煎時間（秒）
  temperatureLog: TemperaturePoint[]; // 温度ログの配列
  notes: string; // 自由記述メモ
  flavorNotes?: string; // ★焙煎後の味の感想を追加
  weight: { // 焙煎前後の重量
    green: number; // 生豆重量 (g)
    roasted: number; // 焙煎後重量 (g)
  };
}

// 状態管理のためのカスタムフック
// LocalStorageを使用して焙煎プロファイルを永続化します
const useRoastStore = () => {
  // LocalStorageからデータを読み込み、なければ空の配列を初期値とする
  const [profiles, setProfiles] = useState<RoastProfile[]>(() => {
    try {
      const saved = localStorage.getItem('coffee-roast-profiles');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Failed to parse profiles from localStorage:", error);
      return []; // パースエラー時は空の配列を返す
    }
  });

  // 新しいプロファイルを追加する関数
  const addProfile = (profile: RoastProfile) => {
    const newProfiles = [...profiles, profile];
    setProfiles(newProfiles);
    localStorage.setItem('coffee-roast-profiles', JSON.stringify(newProfiles));
  };

  // 既存のプロファイルを更新する関数
  const updateProfile = (id: string, updates: Partial<RoastProfile>) => {
    const newProfiles = profiles.map(p => p.id === id ? { ...p, ...updates } : p);
    setProfiles(newProfiles);
    localStorage.setItem('coffee-roast-profiles', JSON.stringify(newProfiles));
  };

  // プロファイルを削除する関数
  const deleteProfile = (id: string) => {
    const newProfiles = profiles.filter(p => p.id !== id);
    setProfiles(newProfiles);
    localStorage.setItem('coffee-roast-profiles', JSON.stringify(newProfiles));
  };

  return { profiles, addProfile, updateProfile, deleteProfile };
};

// ストップウォッチ機能のためのカスタムフック
const useStopwatch = () => {
  const [time, setTime] = useState(0); // 現在の経過時間（秒）
  const [isRunning, setIsRunning] = useState(false); // タイマーが実行中かどうかのフラグ
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // setIntervalのIDを保持するためのref

  // isRunningの状態に応じてタイマーを開始・停止するuseEffect
  useEffect(() => {
    if (isRunning) {
      // 1秒ごとにtimeを更新
      intervalRef.current = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    } else {
      // isRunningがfalseになったらタイマーをクリア
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    // コンポーネントのアンマウント時にタイマーをクリアするためのクリーンアップ関数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]); // isRunningが変更されたときにのみ実行

  // タイマーを開始
  const start = () => setIsRunning(true);
  // タイマーを一時停止
  const pause = () => setIsRunning(false);
  // タイマーをリセット
  const reset = () => {
    setTime(0);
    setIsRunning(false);
  };

  // 秒数をMM:SS形式にフォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return { time, isRunning, start, pause, reset, formatTime };
};

// 再利用可能なボタンコンポーネント
const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, ...props }) => {
  // 基本的なスタイルクラス
  const baseClasses = 'font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2';
  
  // バリアント（色）ごとのスタイル
  const variants = {
    primary: 'bg-amber-600 hover:bg-amber-700 text-white disabled:bg-gray-400',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:bg-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400'
  };
  
  // サイズごとのスタイル
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// 再利用可能な入力フィールドコンポーネント
const Input = ({ label, type = 'text', value, onChange, placeholder, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      {...props}
    />
  </div>
);

// 再利用可能なカードコンポーネント
const Card = ({ children, title, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
    {title && <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>}
    {children}
  </div>
);

// 温度記録コンポーネント
const TemperatureLogger = ({ onTemperatureAdd, currentTime }) => {
  const [temperature, setTemperature] = useState(''); // 入力された温度

  // 温度記録ボタンがクリックされたときのハンドラ
  const handleAdd = () => {
    // 温度が入力されており、数値であることを確認
    if (temperature && !isNaN(Number(temperature))) {
      onTemperatureAdd({
        time: currentTime, // 現在のタイマー時間
        temperature: Number(temperature), // 入力された温度
        timestamp: new Date() // 現在のタイムスタンプ
      });
      setTemperature(''); // 入力フィールドをクリア
    }
  };

  return (
    <Card title="温度記録" className="mb-6">
      <div className="flex gap-2">
        <Input
          type="number"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          placeholder="温度 (°C)"
        />
        <Button onClick={handleAdd} disabled={!temperature}>
          <Plus size={16} />
          記録
        </Button>
      </div>
    </Card>
  );
};

// 温度チャートコンポーネント
const TemperatureChart = ({ temperatureLog }) => {
  // 時間をMM:SS形式にフォーマットするヘルパー関数
  const formatTime = (seconds: number) => { // 型を追加
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card title="温度カーブ" className="mb-6">
      <div className="h-80"> {/* チャートの高さ */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={temperatureLog}>
            <CartesianGrid strokeDasharray="3 3" /> {/* グリッド線 */}
            <XAxis 
              dataKey="time" // X軸のデータキーは時間
              tickFormatter={formatTime} // 目盛りをMM:SS形式にフォーマット
              label={{ value: '時間', position: 'insideBottom', offset: -5 }} // X軸ラベル
            />
            <YAxis 
              label={{ value: '温度 (°C)', angle: -90, position: 'insideLeft' }} // Y軸ラベル
            />
            <Tooltip 
              labelFormatter={(value: number) => `時間: ${formatTime(value)}`} // 型を追加
              formatter={(value: number) => [`${value}°C`, '温度']} // 型を追加
            />
            <Legend /> {/* 凡例 */}
            <Line 
              type="monotone" // スムーズなカーブ
              dataKey="temperature" // Y軸のデータキーは温度
              stroke="#f59e0b" // 線の色（アンバー）
              strokeWidth={2} // 線の太さ
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }} // ドットのスタイル
              name="温度" // 凡例に表示される名前
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// RoastProfileFormから渡されるデータの型定義
interface RoastProfileFormData {
  name: string;
  bean: string;
  roastLevel: string;
  greenWeight: number;
  roastedWeight: number;
  notes: string;
}

// Props for RoastProfileForm
interface RoastProfileFormProps {
  onSave: (profileData: RoastProfileFormData, isEditing: boolean) => void;
  onCancel: () => void;
  currentProfile?: RoastProfile | null;
}

// 焙煎プロファイル作成・編集フォーム
const RoastProfileForm = ({ onSave, onCancel, currentProfile = null }: RoastProfileFormProps) => {
  // フォームの入力値を管理するstate
  const [formData, setFormData] = useState({
    name: currentProfile?.name || '',
    bean: currentProfile?.bean || '',
    roastLevel: currentProfile?.roastLevel || 'ミディアム',
    greenWeight: currentProfile?.weight?.green || '', // string | number
    roastedWeight: currentProfile?.weight?.roasted || '', // string | number
    notes: currentProfile?.notes || ''
  });

  // 焙煎度の選択肢
  const roastLevels = ['ライト', 'ミディアム', 'ミディアムダーク', 'ダーク', 'フレンチ'];

  // フォーム送信時のハンドラ
  const handleSubmit = (e: React.FormEvent) => { // 型を追加
    e.preventDefault(); // デフォルトのフォーム送信を防ぐ
    // 親コンポーネントにデータを渡す
    onSave({
      ...formData,
      greenWeight: Number(formData.greenWeight), // 数値に変換
      roastedWeight: Number(formData.roastedWeight) // 数値に変換
    }, !!currentProfile); // 編集モードかどうかを伝えるフラグ
  };

  return (
    <Card title={currentProfile ? "プロファイル編集" : "新規プロファイル"}>
      <form onSubmit={handleSubmit}>
        <Input
          label="プロファイル名"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})} // 型を追加
          placeholder="例: エチオピア イルガチェフェ"
          required // 必須入力
        />
        
        <Input
          label="豆の種類"
          value={formData.bean}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, bean: e.target.value})} // 型を追加
          placeholder="例: エチオピア産 アラビカ種"
          required // 必須入力
        />
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">焙煎度</label>
          <select
            value={formData.roastLevel}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, roastLevel: e.target.value})} // 型を追加
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {roastLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="生豆重量 (g)"
            type="number"
            value={formData.greenWeight}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, greenWeight: e.target.value})} // 型を追加
            placeholder="100"
          />
          
          <Input
            label="焙煎後重量 (g)"
            type="number"
            value={formData.roastedWeight}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, roastedWeight: e.target.value})} // 型を追加
            placeholder="85"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
          <textarea
            value={formData.notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, notes: e.target.value})} // 型を追加
            placeholder="焙煎の特記事項、風味の特徴など..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 h-24 resize-none"
          />
        </div>
        
        <div className="flex gap-2">
          <Button type="submit" variant="primary">
            {currentProfile ? "更新" : "保存"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            キャンセル
          </Button>
        </div>
      </form>
    </Card>
  );
};

// Props for RoastHistoryList
interface RoastHistoryListProps {
  profiles: RoastProfile[];
  onEdit: (profile: RoastProfile) => void;
  onDelete: (id: string) => void;
  onViewChart: (profile: RoastProfile) => void; // チャート表示用
  onAddFlavorNotes: (profile: RoastProfile) => void; // ★味の感想追加用
}

// 焙煎履歴一覧コンポーネント
const RoastHistoryList = ({ profiles, onEdit, onDelete, onViewChart, onAddFlavorNotes }: RoastHistoryListProps) => { // 型を追加
  // 日付を整形するヘルパー関数
  const formatDate = (date: Date) => { // 型を追加
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 時間を整形するヘルパー関数
  const formatDuration = (seconds: number) => { // 型を追加
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  return (
    <Card title="焙煎履歴">
      {profiles.length === 0 ? (
        <p className="text-gray-500 text-center py-8">まだ焙煎記録がありません</p>
      ) : (
        <div className="space-y-4">
          {profiles.map(profile => (
            <div key={profile.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg">{profile.name}</h4>
                <div className="flex gap-2">
                  {/* ★味の感想ボタンを追加 */}
                  <Button size="sm" variant="secondary" onClick={() => onAddFlavorNotes(profile)}>
                    <MessageSquare size={16} />
                    {profile.flavorNotes ? "感想を編集" : "感想を追加"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onViewChart(profile)} disabled={profile.temperatureLog.length === 0}> {/* チャート表示ボタン */}
                    チャート表示
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onEdit(profile)}>
                    編集
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => onDelete(profile.id)}>
                    削除
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">豆の種類:</span>
                  <p className="font-medium">{profile.bean}</p>
                </div>
                <div>
                  <span className="text-gray-600">焙煎度:</span>
                  <p className="font-medium">{profile.roastLevel}</p>
                </div>
                <div>
                  <span className="text-gray-600">時間:</span>
                  <p className="font-medium">{formatDuration(profile.duration)}</p>
                </div>
                <div>
                  <span className="text-gray-600">日付:</span>
                  <p className="font-medium">{formatDate(profile.startTime)}</p>
                </div>
              </div>
              
              {profile.notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded">
                  <span className="text-gray-600 text-sm">メモ:</span>
                  <p className="mt-1">{profile.notes}</p>
                </div>
              )}
              {/* ★味の感想を表示 */}
              {profile.flavorNotes && (
                <div className="mt-3 p-3 bg-blue-50 rounded">
                  <span className="text-blue-700 text-sm">味の感想:</span>
                  <p className="mt-1">{profile.flavorNotes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// チャート表示用モーダルコンポーネント
interface ChartModalProps {
  profile: RoastProfile;
  onClose: () => void;
}

const ChartModal = ({ profile, onClose }: ChartModalProps) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {profile.name} - 温度カーブ
          </h3>
          {profile.temperatureLog.length > 0 ? (
            <TemperatureChart temperatureLog={profile.temperatureLog} />
          ) : (
            <p className="text-center text-gray-500 py-8">このプロファイルには温度ログがありません。</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ★味の感想入力用モーダルコンポーネント
interface FlavorNotesModalProps {
  profile: RoastProfile;
  onSave: (profileId: string, flavorNotes: string) => void;
  onClose: () => void;
}

const FlavorNotesModal = ({ profile, onSave, onClose }: FlavorNotesModalProps) => {
  const [notes, setNotes] = useState(profile.flavorNotes || '');

  const handleSubmit = () => {
    onSave(profile.id, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {profile.name} - 味の感想
          </h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">感想</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="焙煎後の味の特徴、香り、酸味、苦味、甘味など..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 h-32 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};


// メインアプリケーションコンポーネント
const FirebaseTest = () => {
  const [testData, setTestData] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "test_collection"));
        const data: string[] = [];
        querySnapshot.forEach((doc) => {
          data.push(doc.data().message);
        });
        setTestData(data);
      } catch (e) {
        console.error("Error fetching documents: ", e);
      }
    };
    fetchData();
  }, []);

  const addMessage = async () => {
    if (input.trim() === '') return;
    try {
      const docRef = await addDoc(collection(db, "test_collection"), {
        message: input,
        timestamp: new Date()
      });
      console.log("Document written with ID: ", docRef.id);
      setTestData(prev => [...prev, input]);
      setInput('');
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  return (
    <Card title="Firebase テスト (一時的)">
      <div className="flex flex-col gap-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ここにメッセージを入力"
        />
        <Button onClick={addMessage}>Firestoreに保存</Button>
        <h4 className="font-semibold mt-4">Firestoreのメッセージ:</h4>
        {testData.length > 0 ? (
          <ul className="list-disc list-inside">
            {testData.map((msg, index) => (
              <li key={index}>{msg}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">まだメッセージがありません。</p>
        )}
      </div>
    </Card>
  );
};
const CoffeeRoastingApp = () => {
  // 焙煎プロファイルのストアから状態と関数を取得
  const { profiles, addProfile, updateProfile, deleteProfile } = useRoastStore();
  // ストップウォッチフックから状態と関数を取得
  const { time, isRunning, start, pause, reset, formatTime } = useStopwatch();
  
  // 現在アクティブな焙煎プロファイル
  const [currentProfile, setCurrentProfile] = useState<RoastProfile | null>(null);
  // 現在の焙煎の温度ログ
  const [temperatureLog, setTemperatureLog] = useState<TemperaturePoint[]>([]);
  // アクティブなタブ（'roast', 'history', 'profile'）
  const [activeTab, setActiveTab] = useState('roast');
  // プロファイル作成フォームの表示/非表示
  const [showProfileForm, setShowProfileForm] = useState(false);
  // 編集中のプロファイルデータ
  const [editingProfile, setEditingProfile] = useState<RoastProfile | null>(null);
  // チャート表示のために選択された履歴プロファイル
  const [selectedProfileForChart, setSelectedProfileForChart] = useState<RoastProfile | null>(null);
  // ★味の感想入力のために選択された履歴プロファイル
  const [selectedProfileForFlavorNotes, setSelectedProfileForFlavorNotes] = useState<RoastProfile | null>(null);

  // 焙煎開始ハンドラ
  const handleStartRoast = () => {
    if (!isRunning && currentProfile) { // タイマーが停止中で、かつ現在のプロファイルが設定されている場合のみ開始
      start(); // タイマーを開始
      setTemperatureLog([]); // 温度ログをリセット
      // 焙煎開始時間を現在のプロファイルに設定
      setCurrentProfile(prevProfile => prevProfile ? { ...prevProfile, startTime: new Date() } : null);
    }
  };

  // 焙煎一時停止ハンドラ
  const handlePauseRoast = () => {
    pause(); // タイマーを一時停止
  };

  // 焙煎停止・保存ハンドラ
  const handleStopRoast = () => {
    // 現在のプロファイルがあり、温度ログが記録されている場合のみ保存
    if (currentProfile && temperatureLog.length > 0) {
      // 新しい焙煎プロファイルオブジェクトを作成
      const finishedProfile: RoastProfile = {
        ...currentProfile, // 既存のcurrentProfileのデータをスプレッド
        endTime: new Date(), // 焙煎終了時間
        duration: time, // 焙煎時間
        temperatureLog: temperatureLog, // 温度ログ
        // weightとnotesはcurrentProfileに既に正しく含まれている
      };
      
      addProfile(finishedProfile); // プロファイルをストアに追加
      reset(); // タイマーをリセット
      setTemperatureLog([]); // 温度ログをクリア
      setCurrentProfile(null); // 現在のプロファイルをクリア
      setActiveTab('history'); // 履歴タブに切り替え
    }
  };

  // 温度記録追加ハンドラ
  const handleTemperatureAdd = (tempPoint: TemperaturePoint) => {
    setTemperatureLog(prev => [...prev, tempPoint]); // 温度ログに新しいポイントを追加
  };

  // プロファイル保存ハンドラ（新規作成・編集共通）
  const handleSaveProfile = (profileData: RoastProfileFormData, isEditing: boolean) => {
    if (isEditing && editingProfile) {
      // 編集中のプロファイルがある場合、更新
      updateProfile(editingProfile.id, {
        name: profileData.name,
        bean: profileData.bean,
        roastLevel: profileData.roastLevel,
        notes: profileData.notes,
        weight: { // weightオブジェクトを正しくネストして更新
          green: profileData.greenWeight,
          roasted: profileData.roastedWeight
        }
      });
      setEditingProfile(null); // 編集状態を終了
    } else {
      // 新規プロファイルの場合、完全なRoastProfileオブジェクトを作成して現在のプロファイルとして設定
      const newProfile: RoastProfile = {
        id: uuidv4(), // 新しいIDを生成
        name: profileData.name,
        bean: profileData.bean,
        roastLevel: profileData.roastLevel,
        startTime: new Date(), // 初期値として現在時刻を設定（焙煎開始時に更新される）
        duration: 0, // 初期値
        temperatureLog: [], // 初期値
        notes: profileData.notes,
        flavorNotes: '', // ★味の感想の初期値
        weight: { // weightオブジェクトを正しくネスト
          green: profileData.greenWeight,
          roasted: profileData.roastedWeight
        }
      };
      setCurrentProfile(newProfile); // 完全なRoastProfileオブジェクトをセット
    }
    setShowProfileForm(false); // フォームを非表示
  };

  // プロファイル編集開始ハンドラ
  const handleEditProfile = (profile: RoastProfile) => {
    setEditingProfile(profile); // 編集対象のプロファイルをセット
    setShowProfileForm(true); // フォームを表示
  };

  // 履歴からチャート表示を開始するハンドラ
  const handleViewChart = (profile: RoastProfile) => {
    setSelectedProfileForChart(profile); // 選択されたプロファイルを状態にセット
  };

  // チャートモーダルを閉じるハンドラ
  const handleCloseChartModal = () => {
    setSelectedProfileForChart(null); // 状態をクリアしてモーダルを閉じる
  };

  // ★履歴から味の感想入力/編集を開始するハンドラ
  const handleAddFlavorNotes = (profile: RoastProfile) => {
    setSelectedProfileForFlavorNotes(profile); // 選択されたプロファイルを状態にセット
  };

  // ★味の感想モーダルを閉じるハンドラ
  const handleCloseFlavorNotesModal = () => {
    setSelectedProfileForFlavorNotes(null); // 状態をクリアしてモーダルを閉じる
  };

  // ★味の感想を保存するハンドラ
  const handleSaveFlavorNotes = (profileId: string, flavorNotes: string) => {
    updateProfile(profileId, { flavorNotes: flavorNotes });
  };

  // データエクスポート機能
  const exportData = () => {
    const data = JSON.stringify(profiles, null, 2); // プロファイルをJSON形式で整形
    const blob = new Blob([data], { type: 'application/json' }); // Blobオブジェクトを作成
    const url = URL.createObjectURL(blob); // オブジェクトURLを生成
    const a = document.createElement('a'); // <a>要素を作成
    a.href = url;
    a.download = 'coffee-roast-profiles.json'; // ダウンロードファイル名
    a.click(); // クリックイベントをシミュレートしてダウンロード
    URL.revokeObjectURL(url); // オブジェクトURLを解放
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coffee className="text-amber-600" size={32} />
              <h1 className="text-2xl font-bold text-gray-800">コーヒー焙煎ログ</h1>
            </div>
            
            <div className="flex gap-2">
              <Button variant="secondary" onClick={exportData}>
                <Download size={16} />
                エクスポート
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ナビゲーション */}
      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'roast', label: '焙煎', icon: Timer },
              { id: 'history', label: '履歴', icon: TrendingUp },
              { id: 'profile', label: 'プロファイル', icon: Coffee }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <FirebaseTest />
        {activeTab === 'roast' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {/* タイマーセクション */}
              <Card title="焙煎タイマー" className="mb-6">
                <div className="text-center">
                  <div className="text-6xl font-mono font-bold text-amber-600 mb-6">
                    {formatTime(time)}
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    {!isRunning ? (
                      <Button 
                        onClick={handleStartRoast} 
                        variant="primary" 
                        size="lg"
                        disabled={!currentProfile} // プロファイルが選択されていないと開始できない
                      >
                        <Play size={20} />
                        開始
                      </Button>
                    ) : (
                      <Button onClick={handlePauseRoast} variant="secondary" size="lg">
                        <Pause size={20} />
                        一時停止
                      </Button>
                    )}
                    
                    <Button 
                      onClick={handleStopRoast} 
                      variant="danger" 
                      size="lg"
                      disabled={!isRunning || temperatureLog.length === 0} // 実行中で温度ログがないと停止・保存できない
                    >
                      <Square size={20} />
                      停止・保存
                    </Button>
                  </div>
                  
                  {!currentProfile && (
                    <p className="text-sm text-gray-500 mt-4">
                      焙煎を開始するには、まずプロファイルを作成してください
                    </p>
                  )}
                </div>
              </Card>

              {/* 現在のプロファイル表示 */}
              {currentProfile && (
                <Card title="現在のプロファイル" className="mb-6">
                  <div className="space-y-2">
                    <p><strong>名前:</strong> {currentProfile.name}</p>
                    <p><strong>豆:</strong> {currentProfile.bean}</p>
                    <p><strong>焙煎度:</strong> {currentProfile.roastLevel}</p>
                    <p><strong>生豆重量:</strong> {currentProfile.weight.green}g</p>
                  </div>
                </Card>
              )}

              {/* 温度記録 */}
              {isRunning && ( // タイマー実行中のみ表示
                <TemperatureLogger 
                  onTemperatureAdd={handleTemperatureAdd}
                  currentTime={time}
                />
              )}
            </div>

            <div>
              {/* 温度チャート */}
              {temperatureLog.length > 0 && ( // 温度ログがある場合のみ表示
                <TemperatureChart temperatureLog={temperatureLog} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <RoastHistoryList 
            profiles={profiles}
            onEdit={handleEditProfile}
            onDelete={deleteProfile}
            onViewChart={handleViewChart}
            onAddFlavorNotes={handleAddFlavorNotes} // ★新しいpropを渡す
          />
        )}

        {activeTab === 'profile' && (
          <div>
            {!showProfileForm ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">プロファイル管理</h2>
                  <Button onClick={() => setShowProfileForm(true)}>
                    <Plus size={16} />
                    新規プロファイル
                  </Button>
                </div>
                
                {currentProfile ? (
                  <Card title="アクティブなプロファイル">
                    <div className="space-y-2">
                      <p><strong>名前:</strong> {currentProfile.name}</p>
                      <p><strong>豆:</strong> {currentProfile.bean}</p>
                      <p><strong>焙煎度:</strong> {currentProfile.roastLevel}</p>
                      <p><strong>生豆重量:</strong> {currentProfile.weight.green}g</p>
                      <p><strong>焙煎後重量:</strong> {currentProfile.weight.roasted}g</p>
                      {currentProfile.notes && <p><strong>メモ:</strong> {currentProfile.notes}</p>}
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <p className="text-center text-gray-500 py-8">
                      アクティブなプロファイルがありません。<br />
                      新規プロファイルを作成して焙煎を開始しましょう。
                    </p>
                  </Card>
                )}
              </div>
            ) : (
              <RoastProfileForm
                onSave={handleSaveProfile}
                onCancel={() => {
                  setShowProfileForm(false);
                  setEditingProfile(null);
                }}
                currentProfile={editingProfile}
              />
            )}
          </div>
        )}
      </main>

      {/* チャートモーダル */}
      {selectedProfileForChart && (
        <ChartModal profile={selectedProfileForChart} onClose={handleCloseChartModal} />
      )}

      {/* ★味の感想モーダル */}
      {selectedProfileForFlavorNotes && (
        <FlavorNotesModal
          profile={selectedProfileForFlavorNotes}
          onSave={handleSaveFlavorNotes}
          onClose={handleCloseFlavorNotesModal}
        />
      )}
    </div>
  );
};

export default CoffeeRoastingApp;
