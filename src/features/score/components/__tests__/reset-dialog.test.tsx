import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { ResetDialog } from '../ResetDialog';

/**
 * 【目的】ResetDialog コンポーネントのユニットテスト
 * 【根拠】Task 3.2 の受け入れ条件:
 *        - リセットボタンタップ時に確認ダイアログを表示
 *        - ダイアログにタイトル「リセット確認」、説明文「スコアを 0-0 にリセットしますか？」
 *        - 「キャンセル」ボタンでダイアログを閉じる
 *        - 「リセット」ボタンでリセットを実行する
 */
describe('ResetDialog', () => {
  const defaultProps = {
    visible: true,
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示制御', () => {
    it('visible=true のときダイアログが表示される', () => {
      render(<ResetDialog {...defaultProps} visible={true} />);
      expect(screen.getByTestId('reset-dialog')).toBeTruthy();
    });

    it('visible=false のときダイアログが表示されない', () => {
      render(<ResetDialog {...defaultProps} visible={false} />);
      expect(screen.queryByTestId('reset-dialog')).toBeNull();
    });
  });

  describe('ダイアログ内容', () => {
    it('タイトル「リセット確認」が表示される', () => {
      render(<ResetDialog {...defaultProps} />);
      expect(screen.getByText('リセット確認')).toBeTruthy();
    });

    it('説明文「スコアを 0-0 にリセットしますか？」が表示される', () => {
      render(<ResetDialog {...defaultProps} />);
      expect(
        screen.getByText('スコアを 0-0 にリセットしますか？')
      ).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      render(<ResetDialog {...defaultProps} />);
      expect(screen.getByTestId('reset-dialog-cancel')).toBeTruthy();
      expect(screen.getByText('キャンセル')).toBeTruthy();
    });

    it('「リセット」ボタンが表示される', () => {
      render(<ResetDialog {...defaultProps} />);
      expect(screen.getByTestId('reset-dialog-confirm')).toBeTruthy();
      expect(screen.getByText('リセット')).toBeTruthy();
    });
  });

  describe('ボタン操作', () => {
    it('キャンセルボタン押下で onCancel が呼ばれる', () => {
      render(<ResetDialog {...defaultProps} />);
      fireEvent.press(screen.getByTestId('reset-dialog-cancel'));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('リセットボタン押下で onConfirm が呼ばれる', () => {
      render(<ResetDialog {...defaultProps} />);
      fireEvent.press(screen.getByTestId('reset-dialog-confirm'));
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
