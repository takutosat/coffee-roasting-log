import React from 'react'; // ★この行を追加します

// Buttonコンポーネントのpropsの型定義
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode; // ボタンの中身（テキスト、アイコンなど）
  onClick?: React.MouseEventHandler<HTMLButtonElement>; // クリックイベントハンドラ
  variant?: 'primary' | 'secondary' | 'danger'; // ボタンの種類（色）
  size?: 'sm' | 'md' | 'lg'; // ボタンのサイズ
  disabled?: boolean; // 無効化状態
  // その他のHTML buttonタグの属性は React.ButtonHTMLAttributes<HTMLButtonElement> でカバーされます
}

// 再利用可能なボタンコンポーネント
const Button: React.FC<ButtonProps> = ({ // ★ここに型定義を追加します
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  ...props
}) => {
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

export { Button };