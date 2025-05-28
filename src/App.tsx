// src/App.tsx

import React from 'react';
import { v4 as uuidv4 } from 'uuid'; // ID生成のためにuuidをインポート
import AppLayout from './components/layout/AppLayout';
import RoastLogForm from './components/features/RoastLog/RoastLogForm';
import RoastLogList from './components/features/RoastLog/RoastLogList';
import type { RoastLog } from "./types/roast"; // RoastLog型をインポート

// uuidライブラリをインストール
// ターミナルで `npm install uuid` と実行してください
// そして、型定義のために `npm install -D @types/uuid` も実行してください

function App() {
  const [roastLogs, setRoastLogs] = React.useState<RoastLog[]>([]); // ログを保持するstate

  const handleAddRoastLog = (newLogData: Omit<RoastLog, 'id'>) => {
    const newLog: RoastLog = {
      ...newLogData,
      id: uuidv4(), // 一意のIDを生成
    };
    setRoastLogs((prevLogs) => [...prevLogs, newLog]);
  };

  return (
    <AppLayout>
      <div className="py-10">
        <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-10">
          Welcome to Your Roast Log!
        </h2>

        <div className="max-w-3xl mx-auto">
          <RoastLogForm onSubmit={handleAddRoastLog} />
          <RoastLogList logs={roastLogs} />
        </div>
      </div>
    </AppLayout>
  );
}

export default App;