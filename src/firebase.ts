// src/firebase.ts

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore'; // ★追加！
import { getAuth } from 'firebase/auth'; // ★追加！

// あなたのFirebaseプロジェクトの設定情報（前のスクリーンショットからコピーしたもの）
const firebaseConfig = {
  apiKey: "AIzaSyAn3GA64zhpku2rUYyI_XiDBXEPdkIWw1Y",
  authDomain: "coffee-roast-log-app.firebaseapp.com",
  projectId: "coffee-roast-log-app",
  storageBucket: "coffee-roast-log-app.firebasestorage.app",
  messagingSenderId: "597738661568",
  appId: "1:597738661568:web:46d442ef3f923a50eeaf25",
  measurementId: "G-F99GQP2XQR"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// Firestore（データベース）のインスタンスを取得してエクスポート ★追加！
export const db = getFirestore(app);

// Firebase Authenticationのインスタンスを取得してエクスポート ★追加！
export const auth = getAuth(app);

// 後で参照できるように、アプリのインスタンスもエクスポートしておくと便利です
export default app;