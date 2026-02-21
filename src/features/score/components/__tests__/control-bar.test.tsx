import { render, screen, fireEvent, act } from '@testing-library/react-native';
import React from 'react';
import { useScoreStore } from '../../../../stores/score-store';
import { useSettingsStore } from '../../../../stores/settings-store';
import { ControlBar } from '../ControlBar';

/**
 * 【目的】ControlBar コンポーネントのユニットテスト
 * 【根拠】Task 3.2 の受け入れ条件:
 *        - 左側に音声入力・読み上げトグルボタン
 *        - 右側にロールバック・リセットボタン
 *        - undo 不可時はロールバックボタンを無効化
 *        - リセットボタンタップで確認ダイアログ表示
 *        - ダイアログ承認でリセット実行、キャンセルでダイアログ非表示
 */
describe('ControlBar', () => {
  beforeEach(() => {
    useScoreStore.setState({ leftScore: 0, rightScore: 0, isGameEnd: false });
    useScoreStore.temporal.getState().clear();
    // 【目的】SettingsStore を初期状態にリセットする
    // 【根拠】Task 4.1 で ControlBar がローカル state から useSettings hook に
    //        移行したため、テスト間で設定状態がリークしないよう初期化が必要。
    useSettingsStore.setState({
      isVoiceRecognitionEnabled: true,
      isSpeechEnabled: true,
    });
  });

  describe('トグルボタン', () => {
    it('音声入力トグルボタンが表示される', () => {
      render(<ControlBar />);
      expect(screen.getByTestId('toggle-voice')).toBeTruthy();
      expect(screen.getByText('音声入力')).toBeTruthy();
    });

    it('読み上げトグルボタンが表示される', () => {
      render(<ControlBar />);
      expect(screen.getByTestId('toggle-speech')).toBeTruthy();
      expect(screen.getByText('読み上げ')).toBeTruthy();
    });

    it('音声入力トグルのタップで状態が切り替わる', () => {
      render(<ControlBar />);
      const toggle = screen.getByTestId('toggle-voice');
      fireEvent.press(toggle);
      // 【根拠】トグル ON/OFF の視覚的状態はアクセシビリティ属性で検証する
      expect(toggle.props.accessibilityState?.selected).toBe(false);
    });

    it('読み上げトグルのタップで状態が切り替わる', () => {
      render(<ControlBar />);
      const toggle = screen.getByTestId('toggle-speech');
      fireEvent.press(toggle);
      expect(toggle.props.accessibilityState?.selected).toBe(false);
    });
  });

  describe('ロールバックボタン', () => {
    it('ロールバックボタンが表示される', () => {
      render(<ControlBar />);
      expect(screen.getByTestId('rollback-button')).toBeTruthy();
      expect(screen.getByText('ロールバック')).toBeTruthy();
    });

    it('undo 不可時はロールバックボタンが無効化される', () => {
      render(<ControlBar />);
      const button = screen.getByTestId('rollback-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('undo 可能時はロールバックボタンが有効になる', () => {
      // 【目的】操作履歴を作成して canUndo = true にする
      act(() => {
        useScoreStore.getState().incrementLeft();
      });

      render(<ControlBar />);
      const button = screen.getByTestId('rollback-button');
      expect(button.props.accessibilityState?.disabled).toBe(false);
    });

    it('ロールバックボタン押下で直前の操作が取り消される', () => {
      act(() => {
        useScoreStore.getState().incrementLeft();
      });

      render(<ControlBar />);
      fireEvent.press(screen.getByTestId('rollback-button'));

      expect(useScoreStore.getState().leftScore).toBe(0);
    });
  });

  describe('リセットボタンとダイアログ', () => {
    it('リセットボタンが表示される', () => {
      render(<ControlBar />);
      expect(screen.getByTestId('reset-button')).toBeTruthy();
      expect(screen.getByText('リセット')).toBeTruthy();
    });

    it('リセットボタン押下で確認ダイアログが表示される', () => {
      render(<ControlBar />);
      fireEvent.press(screen.getByTestId('reset-button'));
      expect(screen.getByTestId('reset-dialog')).toBeTruthy();
    });

    it('ダイアログのキャンセルでダイアログが非表示になる', () => {
      render(<ControlBar />);
      fireEvent.press(screen.getByTestId('reset-button'));
      fireEvent.press(screen.getByTestId('reset-dialog-cancel'));
      expect(screen.queryByTestId('reset-dialog')).toBeNull();
    });

    it('ダイアログのリセット承認でスコアが 0-0 にリセットされる', () => {
      act(() => {
        useScoreStore.setState({ leftScore: 15, rightScore: 12 });
      });

      render(<ControlBar />);
      fireEvent.press(screen.getByTestId('reset-button'));
      fireEvent.press(screen.getByTestId('reset-dialog-confirm'));

      expect(useScoreStore.getState().leftScore).toBe(0);
      expect(useScoreStore.getState().rightScore).toBe(0);
    });

    it('リセット承認後にダイアログが非表示になる', () => {
      render(<ControlBar />);
      fireEvent.press(screen.getByTestId('reset-button'));
      fireEvent.press(screen.getByTestId('reset-dialog-confirm'));
      expect(screen.queryByTestId('reset-dialog')).toBeNull();
    });
  });
});
