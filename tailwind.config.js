/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './index.js',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // 【目的】design.md のカラーパレットをデザイントークンとして定義
        // 【根拠】Tailwind のテーマカラーとして統一管理し、className で参照可能にする
        background: '#0f172a',
        score: '#ffffff',
        'accent-cyan': '#00e5ff',
        'accent-gold': '#f59e0b',
        danger: '#ef4444',
        btn: '#334155',
        'btn-border': '#475569',
        'toggle-active': '#06b6d4',
        bar: '#1e293b',
      },
    },
  },
  plugins: [],
};
