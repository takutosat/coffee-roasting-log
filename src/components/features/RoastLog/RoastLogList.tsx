// src/components/features/RoastLog/RoastLogList.tsx

import React from 'react';
import { RoastLog } from '../../../types/roast'; // RoastLog型をインポート

interface RoastLogListProps {
  logs: RoastLog[]; // 表示するログの配列
}

const RoastLogList: React.FC<RoastLogListProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg text-center text-gray-600">
        まだ焙煎ログがありません。新しいログを追加してください。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {logs.map((log) => (
        <div key={log.id} className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{log.beanName}</h3>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-semibold">日付:</span> {log.date}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-semibold">焙煎度:</span> {log.roastDegree}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-semibold">焙煎時間:</span> {log.roastTime}秒
          </p>
          {/* その他の情報もここに追加できます */}
        </div>
      ))}
    </div>
  );
};

export default RoastLogList;