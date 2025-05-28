import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button'; // 既存のButtonコンポーネントをインポート

interface ShareProfileModalProps {
  profileId: string;
  onClose: () => void;
}

const ShareProfileModal = ({ profileId, onClose }: ShareProfileModalProps) => {
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    // ここで共有リンクを生成するロジックを実装します
    // 例: https://example.com/profiles/{profileId} のような形式
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/profiles/${profileId}`; // 現在のサイトのURLを取得
    setShareLink(link);
  }, [profileId]);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(shareLink);
    alert('リンクをクリップボードにコピーしました！');
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
            焙煎プロファイル共有
          </h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">共有リンク</label>
            <div className="flex items-center">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Button onClick={handleCopyClick} variant="secondary" className="ml-2">
                コピー
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            このリンクを他のユーザーに共有すると、あなたの焙煎プロファイルを見ることができます。
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareProfileModal;