import { render, screen, fireEvent, act } from '@testing-library/react-native';
import React from 'react';
import { useScoreStore } from '../../../../stores/score-store';
import { ScorePanel } from '../ScorePanel';

/**
 * 【目的】ScorePanel コンポーネントのユニットテスト
 * 【根拠】Task 3.1 の受け入れ条件:
 *        - 左右のスコアが表示される
 *        - +1/-1 ボタンタップでスコアが変更される
 *        - useScore hook と接続してリアルタイムにスコアが反映される
 *        useScore は実際のストアを使用し、統合テストとして動作確認する。
 */
describe('ScorePanel', () => {
  /**
   * 【目的】各テストで独立した状態を保証する
   * 【根拠】zustand はモジュールレベルのシングルトンであり、
   *        テスト間で状態がリークしないよう初期化が必要。
   */
  beforeEach(() => {
    useScoreStore.setState({ leftScore: 0, rightScore: 0, isGameEnd: false });
    useScoreStore.temporal.getState().clear();
  });

  describe('初期表示', () => {
    it('左チームのスコア 0 が表示される', () => {
      render(<ScorePanel />);
      const scores = screen.getAllByTestId('score-value');
      expect(scores[0]).toHaveTextContent('0');
    });

    it('右チームのスコア 0 が表示される', () => {
      render(<ScorePanel />);
      const scores = screen.getAllByTestId('score-value');
      expect(scores[1]).toHaveTextContent('0');
    });

    it('+1 ボタンが左右各1つ、計2つ表示される', () => {
      render(<ScorePanel />);
      const buttons = screen.getAllByTestId('increment-button');
      expect(buttons).toHaveLength(2);
    });

    it('-1 ボタンが左右各1つ、計2つ表示される', () => {
      render(<ScorePanel />);
      const buttons = screen.getAllByTestId('decrement-button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('ボタンタップによるスコア変更', () => {
    it('左チームの +1 ボタンタップで左スコアが 1 になる', () => {
      render(<ScorePanel />);
      const incrementButtons = screen.getAllByTestId('increment-button');
      fireEvent.press(incrementButtons[0]);

      const scores = screen.getAllByTestId('score-value');
      expect(scores[0]).toHaveTextContent('1');
    });

    it('右チームの +1 ボタンタップで右スコアが 1 になる', () => {
      render(<ScorePanel />);
      const incrementButtons = screen.getAllByTestId('increment-button');
      fireEvent.press(incrementButtons[1]);

      const scores = screen.getAllByTestId('score-value');
      expect(scores[1]).toHaveTextContent('1');
    });

    it('左チームの -1 ボタンタップで左スコアが減算される', () => {
      useScoreStore.setState({ leftScore: 3 });
      render(<ScorePanel />);

      const decrementButtons = screen.getAllByTestId('decrement-button');
      fireEvent.press(decrementButtons[0]);

      const scores = screen.getAllByTestId('score-value');
      expect(scores[0]).toHaveTextContent('2');
    });

    it('右チームの -1 ボタンタップで右スコアが減算される', () => {
      useScoreStore.setState({ rightScore: 5 });
      render(<ScorePanel />);

      const decrementButtons = screen.getAllByTestId('decrement-button');
      fireEvent.press(decrementButtons[1]);

      const scores = screen.getAllByTestId('score-value');
      expect(scores[1]).toHaveTextContent('4');
    });

    it('複数回の +1 タップでスコアが累積する', () => {
      render(<ScorePanel />);
      const incrementButtons = screen.getAllByTestId('increment-button');

      fireEvent.press(incrementButtons[0]);
      fireEvent.press(incrementButtons[0]);
      fireEvent.press(incrementButtons[0]);

      const scores = screen.getAllByTestId('score-value');
      expect(scores[0]).toHaveTextContent('3');
    });
  });

  describe('スコアのリアルタイム反映', () => {
    it('ストアの状態変更がスコア表示に反映される', () => {
      render(<ScorePanel />);

      act(() => {
        useScoreStore.setState({ leftScore: 15, rightScore: 12 });
      });

      const scores = screen.getAllByTestId('score-value');
      expect(scores[0]).toHaveTextContent('15');
      expect(scores[1]).toHaveTextContent('12');
    });
  });

  describe('中央分割線', () => {
    it('中央の分割線が表示される', () => {
      render(<ScorePanel />);
      expect(screen.getByTestId('center-divider')).toBeTruthy();
    });
  });

  describe('試合終了時のボタン非表示', () => {
    it('isGameEnd=false のとき +1/-1 ボタンが表示される', () => {
      render(<ScorePanel isGameEnd={false} />);
      expect(screen.getAllByTestId('increment-button')).toHaveLength(2);
      expect(screen.getAllByTestId('decrement-button')).toHaveLength(2);
    });

    it('isGameEnd=true のとき +1/-1 ボタンが非表示になる', () => {
      render(<ScorePanel isGameEnd={true} />);
      expect(screen.queryAllByTestId('increment-button')).toHaveLength(0);
      expect(screen.queryAllByTestId('decrement-button')).toHaveLength(0);
    });

    it('isGameEnd=true のときスコア数字は表示される', () => {
      useScoreStore.setState({ leftScore: 25, rightScore: 23 });
      render(<ScorePanel isGameEnd={true} />);
      const scores = screen.getAllByTestId('score-value');
      expect(scores[0]).toHaveTextContent('25');
      expect(scores[1]).toHaveTextContent('23');
    });
  });
});
