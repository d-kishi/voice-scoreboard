import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { GameEndOverlay } from '../GameEndOverlay';

/**
 * 【目的】GameEndOverlay コンポーネントのユニットテスト
 * 【根拠】Task 3.3 の受け入れ条件:
 *        - 「試合終了」テキストが表示される
 *        - リセットボタンが表示される
 *        - ディム背景が表示される
 *        - リセットボタン押下で onReset コールバックが呼ばれる
 */
describe('GameEndOverlay', () => {
  const defaultProps = {
    onReset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示内容', () => {
    it('「試合終了」テキストが表示される', () => {
      render(<GameEndOverlay {...defaultProps} />);
      expect(screen.getByText('試合終了')).toBeTruthy();
    });

    it('リセットボタンが表示される', () => {
      render(<GameEndOverlay {...defaultProps} />);
      expect(screen.getByTestId('game-end-reset')).toBeTruthy();
      expect(screen.getByText('リセット')).toBeTruthy();
    });

    it('ディム背景が表示される', () => {
      render(<GameEndOverlay {...defaultProps} />);
      expect(screen.getByTestId('game-end-overlay')).toBeTruthy();
    });

    it('ゴールドカードが表示される', () => {
      render(<GameEndOverlay {...defaultProps} />);
      expect(screen.getByTestId('game-end-card')).toBeTruthy();
    });
  });

  describe('リセット操作', () => {
    it('リセットボタン押下で onReset が呼ばれる', () => {
      render(<GameEndOverlay {...defaultProps} />);
      fireEvent.press(screen.getByTestId('game-end-reset'));
      expect(defaultProps.onReset).toHaveBeenCalledTimes(1);
    });
  });
});
