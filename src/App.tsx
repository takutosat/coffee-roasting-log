import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, Square, Plus, Download, Upload, Coffee, TrendingUp, Clock, Thermometer, X, MessageSquare, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { v4 as uuidv4 } from 'uuid';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot, orderBy } from 'firebase/firestore';
import type { TemperaturePoint, RoastProfile, RoastProfileFormData } from './types/RoastProfile';
import ShareProfileModal from './components/ShareProfileModal';
import { Button } from './components/Button';

// 状態管理のためのカスタムフックをFirestore対応に更新
const useRoastStore = (user: User | null) => {
  const [profiles, setProfiles] = useState<RoastProfile[]>([]);

  // FirestoreのDate型（Timestamp）をJavaScriptのDate型に変換するヘルパー
  const convertFirestoreTimestampToDate = (data: any): RoastProfile => {
    const convertedLog = data.temperatureLog.map((point: any) => ({
      ...point,
      timestamp: point.timestamp?.toDate ? point.timestamp.toDate() : new Date(point.timestamp)
    }));

    return {
      ...data,
      startTime: data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime),
      endTime: data.endTime?.toDate ? data.endTime.toDate() : data.endTime,
      temperatureLog: convertedLog,
    } as RoastProfile;
  };

  // Firestoreへのデータ保存時にDateをTimestampに変換するヘルパー
  const convertDatesToTimestamps = (profile: RoastProfile) => {
    const newTemperatureLog = profile.temperatureLog.map(point => ({
      ...point,
      timestamp: new Date(point.timestamp)
    }));

    return {
      ...profile,
      startTime: new Date(profile.startTime),
      endTime: profile.endTime ? new Date(profile.endTime) : undefined,
      temperatureLog: newTemperatureLog
    };
  };

  // ユーザーがログインしている場合にFirestoreからデータをリアルタイムでロードするuseEffect
  useEffect(() => {
    let unsubscribe: () => void;
    if (user) {
      try {
        const q = query(collection(db, 'users', user.uid, 'roastProfiles'), orderBy('startTime', 'desc')); // startTimeで降順ソート
        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const fetchedProfiles: RoastProfile[] = [];
          querySnapshot.forEach((doc) => {
            fetchedProfiles.push(convertFirestoreTimestampToDate({ ...doc.data(), id: doc.id }));
          });
          setProfiles(fetchedProfiles); // onSnapshotが常にソート済みデータを返す
        }, (error) => {
          console.error("Firestoreからのプロファイルリアルタイム取得中にエラーが発生しました: ", error);
          alert("プロファイルの読み込み中にエラーが発生しました。");
        });
      } catch (error) {
        console.error("Firestoreリスナーの設定中にエラーが発生しました: ", error);
      }
    } else {
      setProfiles([]); // ユーザーがログアウトしたらプロファイルをクリア
    }

    return () => {
      if (unsubscribe) {
        unsubscribe(); // コンポーネントのアンマウント時にリスナーを解除
      }
    };
  }, [user]);

  // 新しいプロファイルをFirestoreに追加する関数
  const addProfile = async (profile: RoastProfile) => {
    if (!user) {
      alert("ログインしていません。プロファイルを保存できません。");
      return;
    }
    try {
      const profileToSave = convertDatesToTimestamps(profile);
      // Firestoreに新しいドキュメントを追加し、自動生成されたIDを取得
      await addDoc(collection(db, 'users', user.uid, 'roastProfiles'), profileToSave);
      // onSnapshotが自動的にローカルの状態を更新するので、ここではsetProfilesを直接呼ばない
    } catch (error) {
      console.error("Firestoreへのプロファイル追加中にエラーが発生しました: ", error);
      alert("プロファイルの保存に失敗しました。");
    }
  };

  // 既存のプロファイルをFirestoreで更新する関数
  const updateProfile = async (id: string, updates: Partial<RoastProfile>) => {
    if (!user) {
      alert("ログインしていません。プロファイルを更新できません。");
      return;
    }
    try {
      const updatesToSave = Object.fromEntries(
        Object.entries(updates).map(([key, value]) => {
          if (value instanceof Date) {
            return [key, new Date(value)];
          }
          if (key === 'weight' && typeof value === 'object' && value !== null) {
            return [key, { ...value }];
          }
          if (key === 'temperatureLog' && Array.isArray(value)) {
            return [key, value.map(point => ({ ...point, timestamp: new Date(point.timestamp) }))];
          }
          return [key, value];
        })
      );

      await updateDoc(doc(db, 'users', user.uid, 'roastProfiles', id), updatesToSave);
      // onSnapshotが自動的にローカルの状態を更新するので、ここではsetProfilesを直接呼ばない
    } catch (error) {
      console.error("Firestoreでのプロファイル更新中にエラーが発生しました: ", error);
      alert("プロファイルの更新に失敗しました。");
    }
  };

  // プロファイルをFirestoreから削除する関数
  const deleteProfile = async (id: string) => {
    if (!user) {
      alert("ログインしていません。プロファイルを削除できません。");
      return;
    }
    if (window.confirm("本当にこのプロファイルを削除しますか？")) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'roastProfiles', id));
        // onSnapshotが自動的にローカルの状態を更新するので、ここではsetProfilesを直接呼ばない
      } catch (error) {
        console.error("Firestoreからのプロファイル削除中にエラーが発生しました: ", error);
        alert("プロファイルの削除に失敗しました。");
      }
    }
  };

  return { profiles, addProfile, updateProfile, deleteProfile };
};

// ストップウォッチ機能のためのカスタムフック
const useStopwatch = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const reset = () => {
    setTime(0);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return { time, isRunning, start, pause, reset, formatTime };
};

// 再利用可能な入力フィールドコンポーネント
const Input = ({ label, type = 'text', value, onChange, placeholder, ...props }: any) => (
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
const Card = ({ children, title, className = '' }: any) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
    {title && <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>}
    {children}
  </div>
);

// 温度記録コンポーネント
const TemperatureLogger = ({ onTemperatureAdd, currentTime }: any) => {
  const [temperature, setTemperature] = useState('');

  const handleAdd = () => {
    if (temperature && !isNaN(Number(temperature))) {
      onTemperatureAdd({
        time: currentTime,
        temperature: Number(temperature),
        timestamp: new Date()
      });
      setTemperature('');
    }
  };

  return (
    <Card title="温度記録" className="mb-6">
      <div className="flex gap-2">
        <Input
          type="number"
          value={temperature}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemperature(e.target.value)}
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
const TemperatureChart = ({ temperatureLog }: any) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card title="温度カーブ" className="mb-6">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={temperatureLog}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickFormatter={formatTime}
              label={{ value: '時間', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: '温度 (°C)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              labelFormatter={(value: number) => `時間: ${formatTime(value)}`}
              formatter={(value: number) => [`${value}°C`, '温度']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              name="温度"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// Props for RoastProfileForm
interface RoastProfileFormProps {
  onSave: (profileData: RoastProfileFormData, isEditing: boolean) => void;
  onCancel: () => void;
  currentProfile?: RoastProfile | null;
}

// 焙煎プロファイル作成・編集フォーム
const RoastProfileForm = ({ onSave, onCancel, currentProfile = null }: RoastProfileFormProps) => {
  const [formData, setFormData] = useState({
    name: currentProfile?.name || '',
    bean: currentProfile?.bean || '',
    roastLevel: currentProfile?.roastLevel || 'ミディアム',
    greenWeight: currentProfile?.weight?.green || '',
    roastedWeight: currentProfile?.weight?.roasted || '',
    notes: currentProfile?.notes || ''
  });

  const roastLevels = ['ライト', 'ミディアム', 'ミディアムダーク', 'ダーク', 'フレンチ'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      greenWeight: Number(formData.greenWeight),
      roastedWeight: Number(formData.roastedWeight)
    }, !!currentProfile);
  };

  return (
    <Card title={currentProfile ? "プロファイル編集" : "新規プロファイル"}>
      <form onSubmit={handleSubmit}>
        <Input
          label="プロファイル名"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})}
          placeholder="例: エチオピア イルガチェフェ"
          required
        />
        
        <Input
          label="豆の種類"
          value={formData.bean}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, bean: e.target.value})}
          placeholder="例: エチオピア産 アラビカ種"
          required
        />
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">焙煎度</label>
          <select
            value={formData.roastLevel}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, roastLevel: e.target.value})}
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, greenWeight: e.target.value})}
            placeholder="100"
          />
          
          <Input
            label="焙煎後重量 (g)"
            type="number"
            value={formData.roastedWeight}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, roastedWeight: e.target.value})}
            placeholder="85"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
          <textarea
            value={formData.notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, notes: e.target.value})}
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
  onViewChart: (profile: RoastProfile) => void;
  onAddFlavorNotes: (profile: RoastProfile) => void;
  onShare: (profileId: string) => void;
  onToggleFavorite: (profileId: string, currentFavoriteStatus: boolean) => Promise<void>;
  activeTab: string;
}

// 焙煎履歴一覧コンポーネント
const RoastHistoryList = ({ profiles, onEdit, onDelete, onViewChart, onAddFlavorNotes, onShare, onToggleFavorite, activeTab }: RoastHistoryListProps) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  // 表示するプロファイルをフィルタリング
  const displayedProfiles = activeTab === 'favorites'
    ? profiles.filter(profile => profile.isFavorite)
    : profiles;

  return (
    <Card title={activeTab === 'favorites' ? "お気に入り" : "焙煎履歴"}>
      {displayedProfiles.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          {activeTab === 'favorites' ? "まだお気に入り登録された焙煎記録がありません。" : "まだ焙煎記録がありません。"}
        </p>
      ) : (
        <div className="space-y-4">
          {displayedProfiles.map(profile => (
            <div key={profile.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg">{profile.name}</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onToggleFavorite(profile.id, profile.isFavorite || false)}
                    className={profile.isFavorite ? 'text-amber-500' : 'text-gray-400'}
                  >
                    <Star size={16} fill={profile.isFavorite ? 'currentColor' : 'none'} />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onAddFlavorNotes(profile)}>
                    <MessageSquare size={16} />
                    {profile.flavorNotes ? "感想を編集" : "感想を追加"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onViewChart(profile)} disabled={profile.temperatureLog.length === 0}>
                    チャート表示
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onShare(profile.id)}>
                   共有
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

// 味の感想入力用モーダルコンポーネント
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
const CoffeeRoastingApp = () => {
  const [user, setUser] = useState<User | null>(null);
  const { profiles, addProfile, updateProfile, deleteProfile } = useRoastStore(user);
  const { time, isRunning, start, pause, reset, formatTime } = useStopwatch();
  
  const [currentProfile, setCurrentProfile] = useState<RoastProfile | null>(null);
  const [temperatureLog, setTemperatureLog] = useState<TemperaturePoint[]>([]);
  const [activeTab, setActiveTab] = useState('roast');
  const [shareProfileId, setShareProfileId] = useState<string | null>(null);

  const handleShareProfile = (profileId: string) => {
    setShareProfileId(profileId);
  };

  const handleCloseShareModal = () => {
    setShareProfileId(null);
  };

  const handleToggleFavorite = async (profileId: string, currentFavoriteStatus: boolean) => {
    if (!user) {
      alert('ログインしてお気に入り機能を有効にしてください。');
      return;
    }

    try {
      const profileRef = doc(db, 'users', user.uid, 'roastProfiles', profileId);
      await updateDoc(profileRef, {
        isFavorite: !currentFavoriteStatus,
      });
      // onSnapshotが自動的にローカルの状態を更新するので、ここではupdateProfileを直接呼ばない
      alert(
        !currentFavoriteStatus
          ? 'お気に入りに追加しました！'
          : 'お気に入りから削除しました。'
      );
    } catch (error) {
      console.error('お気に入り状態の更新に失敗しました:', error);
      alert('お気に入り状態の更新に失敗しました。');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      console.log("Googleサインイン成功！");
    } catch (error) {
      console.error("Googleサインインエラー: ", error);
      alert("Googleサインイン中にエラーが発生しました。");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("サインアウト成功！");
    } catch (error) {
      console.error("サインアウトエラー: ", error);
      alert("サインアウト中にエラーが発生しました。");
    }
  };        

  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<RoastProfile | null>(null);
  const [selectedProfileForChart, setSelectedProfileForChart] = useState<RoastProfile | null>(null);
  const [selectedProfileForFlavorNotes, setSelectedProfileForFlavorNotes] = useState<RoastProfile | null>(null);

  const handleStartRoast = () => {
    if (!isRunning && currentProfile) {
      start();
      setTemperatureLog([]);
      setCurrentProfile(prevProfile => prevProfile ? { ...prevProfile, startTime: new Date() } : null);
    }
  };

  const handlePauseRoast = () => {
    pause();
  };

  const handleStopRoast = () => {
    if (currentProfile && temperatureLog.length > 0) {
      const finishedProfile: RoastProfile = {
        ...currentProfile,
        endTime: new Date(),
        duration: time,
        temperatureLog: temperatureLog,
      };
      addProfile(finishedProfile);
      reset();
      setTemperatureLog([]);
      setCurrentProfile(null);
      setActiveTab('history');
    }
  };

  const handleTemperatureAdd = (tempPoint: TemperaturePoint) => {
    setTemperatureLog(prev => [...prev, tempPoint]);
  };

  const handleSaveProfile = (profileData: RoastProfileFormData, isEditing: boolean) => {
    if (isEditing && editingProfile) {
      updateProfile(editingProfile.id, {
        name: profileData.name,
        bean: profileData.bean,
        roastLevel: profileData.roastLevel,
        notes: profileData.notes,
        weight: {
          green: profileData.greenWeight,
          roasted: profileData.roastedWeight
        }
      });
      setEditingProfile(null);
    } else {
      const newProfile: RoastProfile = {
        id: uuidv4(),
        name: profileData.name,
        bean: profileData.bean,
        roastLevel: profileData.roastLevel,
        startTime: new Date(),
        duration: 0,
        temperatureLog: [],
        notes: profileData.notes,
        flavorNotes: '',
        isFavorite: false, // 新規作成時の初期値を追加
        weight: {
          green: profileData.greenWeight,
          roasted: profileData.roastedWeight
        }
      };
      setCurrentProfile(newProfile);
    }
    setShowProfileForm(false);
  };

  const handleEditProfile = (profile: RoastProfile) => {
    setEditingProfile(profile);
    setShowProfileForm(true);
  };

  const handleViewChart = (profile: RoastProfile) => {
    setSelectedProfileForChart(profile);
  };

  const handleCloseChartModal = () => {
    setSelectedProfileForChart(null);
  };

  const handleAddFlavorNotes = (profile: RoastProfile) => {
    setSelectedProfileForFlavorNotes(profile);
  };

  const handleCloseFlavorNotesModal = () => {
    setSelectedProfileForFlavorNotes(null);
  };

  const handleSaveFlavorNotes = (profileId: string, flavorNotes: string) => {
    updateProfile(profileId, { flavorNotes: flavorNotes });
  };

  const exportData = () => {
    const data = JSON.stringify(profiles, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coffee-roast-profiles.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">☕️ コーヒー焙煎ログ</h1>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-600 text-sm">
                  {user.displayName ? user.displayName : user.email} でログイン中
                </span>
                <Button onClick={handleSignOut} variant="secondary" size="md">
                  ログアウト
                </Button>
              </>
            ) : (
              <Button onClick={handleGoogleSignIn} variant="primary" size="md">
                Googleでログイン
              </Button>
            )}
            <Button onClick={exportData} variant="secondary" size="md">
              エクスポート
            </Button>
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
              { id: 'favorites', label: 'お気に入り', icon: Star },
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
                        <Play size={24} />
                        焙煎開始
                      </Button>
                    ) : (
                      <>
                        <Button onClick={handlePauseRoast} variant="secondary" size="lg">
                          <Pause size={24} />
                          一時停止
                        </Button>
                        <Button onClick={handleStopRoast} variant="danger" size="lg">
                          <Square size={24} />
                          停止・保存
                        </Button>
                      </>
                    )}
                  </div>
                  {!currentProfile && (
                    <p className="mt-4 text-sm text-red-500">
                      焙煎を開始するには、まず「プロファイル」タブで新しいプロファイルを作成してください。
                    </p>
                  )}
                </div>
              </Card>

              {/* 現在のプロファイル情報 */}
              <Card title="現在の焙煎プロファイル" className="mb-6">
                {currentProfile ? (
                  <div>
                    <p className="text-lg font-semibold">{currentProfile.name}</p>
                    <p className="text-sm text-gray-600 mb-2">{currentProfile.bean} - {currentProfile.roastLevel}</p>
                    {currentProfile.weight && (currentProfile.weight.green || currentProfile.weight.roasted) && (
                      <p className="text-sm text-gray-600">
                        生豆: {currentProfile.weight.green || 'N/A'}g / 焙煎後: {currentProfile.weight.roasted || 'N/A'}g
                      </p>
                    )}
                    {currentProfile.notes && (
                      <p className="mt-2 text-sm text-gray-700 border-t pt-2 mt-2">メモ: {currentProfile.notes}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">プロファイルが選択されていません。下のボタンから作成してください。</p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => { setShowProfileForm(true); setEditingProfile(null); }} variant="secondary">
                    <Plus size={16} />
                    新規プロファイル作成
                  </Button>
                  {currentProfile && (
                    <Button onClick={() => handleEditProfile(currentProfile)} variant="secondary">
                      <Coffee size={16} />
                      プロファイルを編集
                    </Button>
                  )}
                </div>
              </Card>

              {/* 温度記録 */}
              <TemperatureLogger onTemperatureAdd={handleTemperatureAdd} currentTime={time} />

            </div>
            
            <div>
              {/* 温度カーブチャート */}
              <TemperatureChart temperatureLog={temperatureLog} />

              {/* 温度ログ詳細 */}
              <Card title="温度ログ詳細">
                {temperatureLog.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">まだ温度ログがありません。</p>
                ) : (
                  <div className="h-64 overflow-y-auto border rounded-lg p-2">
                    <table className="min-w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                          <th scope="col" className="py-2 px-4">時間</th>
                          <th scope="col" className="py-2 px-4">温度 (°C)</th>
                          <th scope="col" className="py-2 px-4">記録時刻</th>
                        </tr>
                      </thead>
                      <tbody>
                        {temperatureLog.map((point, index) => (
                          <tr key={index} className="bg-white border-b">
                            <td className="py-2 px-4">{formatTime(point.time)}</td>
                            <td className="py-2 px-4">{point.temperature}°C</td>
                            <td className="py-2 px-4">{new Date(point.timestamp).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <RoastHistoryList 
            profiles={profiles} 
            onEdit={handleEditProfile} 
            onDelete={deleteProfile} 
            onViewChart={handleViewChart}
            onAddFlavorNotes={handleAddFlavorNotes}
            onShare={handleShareProfile}
            onToggleFavorite={handleToggleFavorite}
            activeTab={activeTab} // activeTab プロパティを渡す
          />
        )}

        {activeTab === 'favorites' && ( // お気に入りタブのコンテンツ
          <RoastHistoryList 
            profiles={profiles} 
            onEdit={handleEditProfile} 
            onDelete={deleteProfile} 
            onViewChart={handleViewChart}
            onAddFlavorNotes={handleAddFlavorNotes}
            onShare={handleShareProfile}
            onToggleFavorite={handleToggleFavorite}
            activeTab={activeTab} // activeTab プロパティを渡す
          />
        )}


        {activeTab === 'profile' && (
          <>
            {showProfileForm ? (
              <RoastProfileForm 
                onSave={handleSaveProfile} 
                onCancel={() => { setShowProfileForm(false); setEditingProfile(null); }} 
                currentProfile={editingProfile || currentProfile} // 編集中のプロファイルがあればそれを渡す
              />
            ) : (
              <Card title="プロファイル管理">
                <p className="mb-4 text-gray-700">
                  焙煎を開始する前に、豆の種類や焙煎度などのプロファイルを登録しましょう。
                  これにより、各焙煎の詳細な記録を残すことができます。
                </p>
                <Button onClick={() => { setShowProfileForm(true); setEditingProfile(null); }} variant="primary">
                  <Plus size={16} />
                  新しいプロファイルを作成
                </Button>
                {/* 既存のプロファイル一覧表示や編集機能は「履歴」タブに統合済み */}
              </Card>
            )}
          </>
        )}
      </main>

      {selectedProfileForChart && (
        <ChartModal profile={selectedProfileForChart} onClose={handleCloseChartModal} />
      )}

      {selectedProfileForFlavorNotes && (
        <FlavorNotesModal 
          profile={selectedProfileForFlavorNotes} 
          onSave={handleSaveFlavorNotes} 
          onClose={handleCloseFlavorNotesModal} 
        />
      )}

      {shareProfileId && (
        <ShareProfileModal
          profileId={shareProfileId}
          onClose={handleCloseShareModal}
          // shareUrl={`https://your-app-domain.com/share/${shareProfileId}`} // 実際の共有URLに置き換える
        />
      )}
    </div>
  );
};

export default CoffeeRoastingApp;