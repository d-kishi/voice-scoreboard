import { render, screen } from '@testing-library/react-native';
import React from 'react';

import App from './App';

// 【目的】App コンポーネントがクラッシュせずにレンダリングされることを検証
// 【根拠】プロジェクト初期化の最小限のスモークテスト
describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('Voice Scoreboard')).toBeOnTheScreen();
  });
});
