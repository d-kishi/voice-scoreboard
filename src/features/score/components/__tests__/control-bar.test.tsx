import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { useScoreStore } from '../../../../stores/score-store';
import { useSettingsStore } from '../../../../stores/settings-store';
import { ControlBar } from '../ControlBar';

// 【目的】speech-recognition の checkPermissions / requestPermissions をモック化
// 【根拠】権限チェック・リクエストの結果に応じた ControlBar の振る舞いをテストする
jest.mock('../../../voice/services/speech-recognition', () => ({
  checkPermissions: jest.fn(),
  requestPermissions: jest.fn(),
}));

// 【目的】Alert.alert をスパイしてダイアログ表示を検証する
jest.spyOn(Alert, 'alert');

/**
 * 【目的】ControlBar コンポーネントのユニットテスト
 * 【根拠】Task 3.2 の受け入れ条件 + Task 7.3 のマイク権限フロー:
 *        - 左側に音声入力・読み上げトグルボタン
 *        - 右側にロールバック・リセットボタン
 *        - undo 不可時はロールバックボタンを無効化
 *        - リセットボタンタップで確認ダイアログ表示
 *        - ダイアログ承認でリセット実行、キャンセルでダイアログ非表示
 *        - 音声入力 ON 時にマイク権限をリクエストし、拒否時はトグルを ON にしない
 */
describe('ControlBar', () => {
  const { checkPermissions, requestPermissions } = require('../../../voice/services/speech-recognition');

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
    jest.clearAllMocks();
    // 【目的】デフォルトでは権限が許可される想定
    // 【根拠】checkPermissions は既に許可済みの場合 true を返す。
    //        requestPermissions は checkPermissions が false の場合のみ呼ばれる。
    checkPermissions.mockResolvedValue(true);
    requestPermissions.mockResolvedValue(true);
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

    it('音声入力トグルの OFF→ON で権限チェックが呼ばれる', async () => {
      // 【目的】OFF 状態からトグル ON 時に checkPermissions が呼ばれることを検証
      useSettingsStore.setState({ isVoiceRecognitionEnabled: false });

      render(<ControlBar />);
      await act(async () => {
        fireEvent.press(screen.getByTestId('toggle-voice'));
      });

      expect(checkPermissions).toHaveBeenCalled();
    });

    it('権限が既に許可済みの場合、requestPermissions を呼ばずに ON になる', async () => {
      useSettingsStore.setState({ isVoiceRecognitionEnabled: false });
      checkPermissions.mockResolvedValue(true);

      render(<ControlBar />);
      await act(async () => {
        fireEvent.press(screen.getByTestId('toggle-voice'));
      });

      expect(requestPermissions).not.toHaveBeenCalled();
      expect(useSettingsStore.getState().isVoiceRecognitionEnabled).toBe(true);
    });

    it('権限未許可 → requestPermissions で許可された場合、ON になる', async () => {
      useSettingsStore.setState({ isVoiceRecognitionEnabled: false });
      checkPermissions.mockResolvedValue(false);
      requestPermissions.mockResolvedValue(true);

      render(<ControlBar />);
      await act(async () => {
        fireEvent.press(screen.getByTestId('toggle-voice'));
      });

      expect(requestPermissions).toHaveBeenCalled();
      expect(useSettingsStore.getState().isVoiceRecognitionEnabled).toBe(true);
    });

    it('権限が拒否された場合、音声入力がOFFのままでAlertが表示される', async () => {
      useSettingsStore.setState({ isVoiceRecognitionEnabled: false });
      checkPermissions.mockResolvedValue(false);
      requestPermissions.mockResolvedValue(false);

      render(<ControlBar />);
      await act(async () => {
        fireEvent.press(screen.getByTestId('toggle-voice'));
      });

      // 【根拠】権限拒否時はトグルを ON にしない
      expect(useSettingsStore.getState().isVoiceRecognitionEnabled).toBe(false);
      // 【根拠】ユーザーに通知する
      expect(Alert.alert).toHaveBeenCalledWith(
        'マイク権限が必要です',
        '音声入力を使用するにはマイクへのアクセスを許可してください。',
        expect.arrayContaining([
          expect.objectContaining({ text: 'キャンセル' }),
          expect.objectContaining({ text: '設定を開く' }),
        ]),
      );
    });

    it('音声入力トグルの ON→OFF では権限リクエストが呼ばれない', async () => {
      // 【目的】ON → OFF は権限不要
      useSettingsStore.setState({ isVoiceRecognitionEnabled: true });

      render(<ControlBar />);
      await act(async () => {
        fireEvent.press(screen.getByTestId('toggle-voice'));
      });

      expect(requestPermissions).not.toHaveBeenCalled();
      expect(useSettingsStore.getState().isVoiceRecognitionEnabled).toBe(false);
    });

    it('読み上げトグルのタップで状態が切り替わる（権限リクエストなし）', () => {
      render(<ControlBar />);
      const toggle = screen.getByTestId('toggle-speech');
      fireEvent.press(toggle);
      expect(toggle.props.accessibilityState?.selected).toBe(false);
      // 【根拠】読み上げトグルは権限リクエスト不要
      expect(requestPermissions).not.toHaveBeenCalled();
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
