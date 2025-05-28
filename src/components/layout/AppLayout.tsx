// src/components/layout/AppLayout.tsx

import React from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-teal-500 to-teal-700 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">☕️ Coffee Roast Log</h1>
          {/* 今後ナビゲーションリンクなどをここに追加 */}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-grow container mx-auto p-4">
        {children}
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-white p-4 text-center text-sm mt-8">
        &copy; {new Date().getFullYear()} Coffee Roast Log App
      </footer>
    </div>
  );
};

export default AppLayout;