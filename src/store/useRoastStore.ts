// src/store/useRoastStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { db, auth } from '../firebase'; // FirestoreとAuthインスタンスをインポート
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot, // リアルタイムリスナー用
  orderBy
} from 'firebase/firestore';
import type { User } from 'firebase/auth'; // User型を明示的にインポート

import type { RoastLog } from '../types/RoastLog'; // ★RoastLog型をインポート★

// Zustandストアの型定義
interface RoastLogStore {
  roastLogs: RoastLog[]; // 焙煎ログのリスト (RoastLog型を使用)
  user: User | null; // ログインユーザー情報
  currentUnsubscribe: (() => void) | null; // Firestoreリスナーの解除関数を保持

  // アクション
  setUser: (user: User | null) => void;
  addRoastLog: (log: Omit<RoastLog, 'id'>) => Promise<void>; // idはFirestoreが生成
  updateRoastLog: (log: RoastLog) => Promise<void>;
  deleteRoastLog: (id: string) => Promise<void>;
  loadRoastLogsFromFirestore: (user: User | null) => void;
  unsubscribeFirestoreListener: () => void;
}

export const useRoastStore = create<RoastLogStore>()(
  persist(
    (set, get) => ({
      roastLogs: [],
      user: null,
      currentUnsubscribe: null,

      setUser: (user) => set({ user }),

      // Firestoreから焙煎ログをロードする関数（リアルタイムリスナー付き）
      loadRoastLogsFromFirestore: (user) => {
        const currentUnsubscribe = get().currentUnsubscribe;

        // 既存のリスナーがあれば解除
        if (currentUnsubscribe) {
          currentUnsubscribe();
          set({ currentUnsubscribe: null }); // リスナー解除後はnullに
        }

        if (user) {
          const logsCollection = collection(db, 'roastLogs'); // 'roastLogs' コレクションを使用
          const userLogsQuery = query(
            logsCollection,
            where('userId', '==', user.uid), // ログインユーザーのログのみ取得
            orderBy('date', 'desc') // 日付で降順ソート
          );

          // リアルタイムリスナーを設定
          const unsubscribe = onSnapshot(userLogsQuery, (snapshot) => {
            const fetchedLogs: RoastLog[] = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            } as RoastLog)); // 型アサーション
            set({ roastLogs: fetchedLogs });
          }, (error) => {
            console.error("Firestoreリアルタイムリスナーエラー:", error);
            // エラー時も現在のリストをクリアする可能性もあるが、今回は維持
          });

          // リスナー解除関数を保存
          set({ currentUnsubscribe: unsubscribe });

        } else {
          // ユーザーがログアウトしたらログをクリア
          set({ roastLogs: [] });
        }
      },

      // Firestoreリスナーを解除する関数
      unsubscribeFirestoreListener: () => {
        const currentUnsubscribe = get().currentUnsubscribe;
        if (currentUnsubscribe) {
          currentUnsubscribe();
          set({ currentUnsubscribe: null });
        }
      },

      // 新しい焙煎ログをFirestoreに追加
      addRoastLog: async (log) => {
        const user = get().user;
        if (!user) {
          alert('ログインしてください。');
          return;
        }
        try {
          const docRef = await addDoc(collection(db, 'roastLogs'), { // 'roastLogs' コレクションを使用
            ...log,
            userId: user.uid, // ユーザーIDを追加
            createdAt: new Date(), // 作成日時を追加
          });
          console.log("Document written with ID: ", docRef.id);
          // リアルタイムリスナーが自動でstateを更新するため、setは不要
        } catch (e) {
          console.error("Error adding document: ", e);
          alert('ログの追加に失敗しました。');
        }
      },

      // 既存の焙煎ログをFirestoreで更新
      updateRoastLog: async (log) => {
        const user = get().user;
        if (!user) {
          alert('ログインしてください。');
          return;
        }
        if (!log.id) {
          console.error("更新するログにIDがありません。");
          alert('ログの更新に失敗しました: IDがありません。');
          return;
        }
        try {
          const logRef = doc(db, 'roastLogs', log.id);
          await updateDoc(logRef, {
            ...log,
            updatedAt: new Date(), // 更新日時を追加
          });
          console.log("Document updated with ID: ", log.id);
          // リアルタイムリスナーが自動でstateを更新するため、setは不要
        } catch (e) {
          console.error("Error updating document: ", e);
          alert('ログの更新に失敗しました。');
        }
      },

      // 焙煎ログをFirestoreから削除
      deleteRoastLog: async (id) => {
        const user = get().user;
        if (!user) {
          alert('ログインしてください。');
          return;
        }
        try {
          await deleteDoc(doc(db, 'roastLogs', id));
          console.log("Document deleted with ID: ", id);
          // リアルタイムリスナーが自動でstateを更新するため、setは不要
        } catch (e) {
          console.error("Error deleting document: ", e);
          alert('ログの削除に失敗しました。');
        }
      },
    }),
    {
      name: 'roast-logs-storage', // ローカルストレージのキー
      getStorage: () => createJSONStorage(() => localStorage),
      // Zustandのpersistミドルウェアがuser状態をローカルストレージに保存しないようにする
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([key]) => !['user', 'currentUnsubscribe'].includes(key))
      ),
    }
  )
);