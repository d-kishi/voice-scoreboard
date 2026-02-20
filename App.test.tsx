import { render, screen, fireEvent, act } from '@testing-library/react-native';
import React from 'react';
import { useScoreStore } from './src/stores/score-store';

import App from './App';

/**
 * 【目的】App コンポーネントの統合テスト
 * 【根拠】スモークテスト + 試合終了フローの統合動作を検証する。
 */
describe('App', () => {
  beforeEach(() => {
    useScoreStore.setState({ leftScore: 0, rightScore: 0, isGameEnd: false });
    useScoreStore.temporal.getState().clear();
  });

  it('ScorePanel がレンダリングされる', () => {
    render(<App />);
    const scores = screen.getAllByTestId('score-value');
    expect(scores).toHaveLength(2);
  });

  describe('試合終了オーバーレイ', () => {
    it('試合未終了時はオーバーレイが表示されない', () => {
      render(<App />);
      expect(screen.queryByTestId('game-end-overlay')).toBeNull();
    });

    it('試合終了状態でオーバーレイが表示される', () => {
      useScoreStore.setState({ leftScore: 25, rightScore: 23, isGameEnd: true });
      render(<App />);
      expect(screen.getByTestId('game-end-overlay')).toBeTruthy();
      expect(screen.getByText('試合終了')).toBeTruthy();
    });

    it('試合終了状態で +1/-1 ボタンが非表示になる', () => {
      useScoreStore.setState({ leftScore: 25, rightScore: 23, isGameEnd: true });
      render(<App />);
      expect(screen.queryAllByTestId('increment-button')).toHaveLength(0);
      expect(screen.queryAllByTestId('decrement-button')).toHaveLength(0);
    });

    it('オーバーレイのリセットでスコアが 0-0 になりオーバーレイが消える', () => {
      useScoreStore.setState({ leftScore: 25, rightScore: 23, isGameEnd: true });
      render(<App />);

      fireEvent.press(screen.getByTestId('game-end-reset'));

      expect(screen.queryByTestId('game-end-overlay')).toBeNull();
      const scores = screen.getAllByTestId('score-value');
      expect(scores[0]).toHaveTextContent('0');
      expect(scores[1]).toHaveTextContent('0');
    });

    it('試合終了状態でも ControlBar は表示される', () => {
      useScoreStore.setState({ leftScore: 25, rightScore: 23, isGameEnd: true });
      render(<App />);
      expect(screen.getByTestId('control-bar')).toBeTruthy();
    });
  });
});
