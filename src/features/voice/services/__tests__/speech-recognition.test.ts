/**
 * 【目的】SpeechRecognitionService のユニットテスト
 * 【根拠】TDD の RED フェーズとして、サービスの期待動作を先にテストで定義する。
 *        モード切替、認識結果のコールバック呼び出し、権限リクエストをカバーする。
 */

import {
  ExpoSpeechRecognitionModule,
  __emitEvent,
  __resetListeners,
} from 'expo-speech-recognition';
import {
  startRecognition,
  stopRecognition,
  abortRecognition,
  isAvailable,
  requestPermissions,
} from '../speech-recognition';
import type { SpeechRecognitionOptions } from '../speech-recognition';

// 【目的】各テストの前にモックとリスナーをリセットする
beforeEach(() => {
  jest.clearAllMocks();
  __resetListeners();
});

describe('SpeechRecognitionService', () => {
  // =================================================================
  // wakeword モード
  // =================================================================
  describe('wakeword モード', () => {
    const createWakewordOptions = (
      overrides?: Partial<SpeechRecognitionOptions>
    ): SpeechRecognitionOptions => ({
      mode: 'wakeword',
      lang: 'ja-JP',
      onResult: jest.fn(),
      onEnd: jest.fn(),
      onError: jest.fn(),
      ...overrides,
    });

    it('wakeword モードで start() を呼ぶと continuous: true, maxAlternatives: 5 で開始される', () => {
      const options = createWakewordOptions();
      startRecognition(options);

      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
        expect.objectContaining({
          lang: 'ja-JP',
          interimResults: true,
          continuous: true,
          maxAlternatives: 5,
        })
      );
    });

    it('wakeword モードでは contextualStrings に「スコア」が設定される', () => {
      const options = createWakewordOptions();
      startRecognition(options);

      const callArgs = (ExpoSpeechRecognitionModule.start as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.contextualStrings).toEqual(['スコア', 'スコアー', 'すこあ', 'すこあー']);
    });

    it('認識結果を受け取ると onResult コールバックが呼ばれる（allTranscripts 付き）', () => {
      const onResult = jest.fn();
      const options = createWakewordOptions({ onResult });
      startRecognition(options);

      __emitEvent('result', {
        results: [{ transcript: 'スコア' }],
        isFinal: true,
      });

      expect(onResult).toHaveBeenCalledWith('スコア', true, ['スコア']);
    });

    it('部分的な認識結果（isFinal: false）でも onResult が呼ばれる', () => {
      const onResult = jest.fn();
      const options = createWakewordOptions({ onResult });
      startRecognition(options);

      __emitEvent('result', {
        results: [{ transcript: 'すこ' }],
        isFinal: false,
      });

      expect(onResult).toHaveBeenCalledWith('すこ', false, ['すこ']);
    });

    it('複数候補がある場合 allTranscripts に全候補が含まれる', () => {
      const onResult = jest.fn();
      const options = createWakewordOptions({ onResult });
      startRecognition(options);

      __emitEvent('result', {
        results: [
          { transcript: 'こんにちは' },
          { transcript: 'スコア' },
        ],
        isFinal: true,
      });

      expect(onResult).toHaveBeenCalledWith('こんにちは', true, ['こんにちは', 'スコア']);
    });

    it('end イベントで onEnd が通知される（continuous モードのため再起動しない）', () => {
      const onEnd = jest.fn();
      const options = createWakewordOptions({ onEnd });
      startRecognition(options);

      // 【根拠】continuous: true ではセッションが維持されるため、end は stop/abort/エラー時のみ発火。
      //        再起動ループは不要で、onEnd を通知して上位層（状態マシン）に委ねる。
      __emitEvent('end', {});
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('stop() 後の end イベントで onEnd が通知される', () => {
      const onEnd = jest.fn();
      const options = createWakewordOptions({ onEnd });
      startRecognition(options);

      stopRecognition();
      __emitEvent('end', {});

      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });
  });

  // =================================================================
  // command モード
  // =================================================================
  describe('command モード', () => {
    const createCommandOptions = (
      overrides?: Partial<SpeechRecognitionOptions>
    ): SpeechRecognitionOptions => ({
      mode: 'command',
      lang: 'ja-JP',
      onResult: jest.fn(),
      onEnd: jest.fn(),
      onError: jest.fn(),
      ...overrides,
    });

    it('command モードで start() を呼ぶと contextualStrings が設定される', () => {
      const options = createCommandOptions();
      startRecognition(options);

      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
        expect.objectContaining({
          lang: 'ja-JP',
          interimResults: true,
          continuous: false,
          contextualStrings: [
            '右', '左', 'ロールバック', 'リセット',
            'みぎ', 'みぎー', 'ひだり', 'ひだりー',
            'ろーるばっく', 'りせっと',
          ],
        })
      );
    });

    it('command モードで androidIntentOptions が設定される', () => {
      const options = createCommandOptions();
      startRecognition(options);

      const callArgs = (ExpoSpeechRecognitionModule.start as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.androidIntentOptions).toBeDefined();
      expect(callArgs.androidIntentOptions.EXTRA_LANGUAGE_MODEL).toBe(
        'web_search'
      );
      expect(
        callArgs.androidIntentOptions
          .EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS
      ).toBeDefined();
    });

    it('認識結果を受け取ると onResult コールバックが呼ばれる（allTranscripts 付き）', () => {
      const onResult = jest.fn();
      const options = createCommandOptions({ onResult });
      startRecognition(options);

      __emitEvent('result', {
        results: [{ transcript: '右' }],
        isFinal: true,
      });

      expect(onResult).toHaveBeenCalledWith('右', true, ['右']);
    });

    it('end イベントで自動再起動しない', () => {
      const onEnd = jest.fn();
      const options = createCommandOptions({ onEnd });
      startRecognition(options);

      __emitEvent('end', {});

      // 【根拠】command モードは単発認識。end で再起動せず onEnd を通知する
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });
  });

  // =================================================================
  // 共通: stop / abort
  // =================================================================
  describe('stop / abort', () => {
    const createOptions = (): SpeechRecognitionOptions => ({
      mode: 'wakeword',
      lang: 'ja-JP',
      onResult: jest.fn(),
      onEnd: jest.fn(),
      onError: jest.fn(),
    });

    it('stop() を呼ぶと ExpoSpeechRecognitionModule.stop() が呼ばれる', () => {
      startRecognition(createOptions());
      stopRecognition();
      expect(ExpoSpeechRecognitionModule.stop).toHaveBeenCalledTimes(1);
    });

    it('abort() を呼ぶと ExpoSpeechRecognitionModule.abort() が呼ばれる', () => {
      startRecognition(createOptions());
      abortRecognition();
      expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalledTimes(1);
    });

    it('abort() 後の end イベントでは再起動しない', () => {
      const onEnd = jest.fn();
      startRecognition(createOptions());
      abortRecognition();
      __emitEvent('end', {});

      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
    });

    it('abort() 後の end イベントで onEnd が呼ばれる', () => {
      const onEnd = jest.fn();
      startRecognition({ ...createOptions(), onEnd });
      abortRecognition();
      __emitEvent('end', {});

      expect(onEnd).toHaveBeenCalledTimes(1);
    });
  });

  // =================================================================
  // エラーハンドリング
  // =================================================================
  describe('エラーハンドリング', () => {
    it('error イベントで onError コールバックが呼ばれる', () => {
      const onError = jest.fn();
      startRecognition({
        mode: 'wakeword',
        lang: 'ja-JP',
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError,
      });

      __emitEvent('error', {
        error: 'not-allowed',
        message: 'Permission denied',
      });

      expect(onError).toHaveBeenCalledWith('not-allowed');
    });
  });

  // =================================================================
  // 権限管理
  // =================================================================
  describe('権限管理', () => {
    it('requestPermissions() が権限を要求し結果を返す', async () => {
      (
        ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        granted: true,
        status: 'granted',
      });

      const result = await requestPermissions();
      expect(result).toBe(true);
      expect(
        ExpoSpeechRecognitionModule.requestPermissionsAsync
      ).toHaveBeenCalled();
    });

    it('権限が拒否された場合 false を返す', async () => {
      (
        ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        granted: false,
        status: 'denied',
      });

      const result = await requestPermissions();
      expect(result).toBe(false);
    });
  });

  // =================================================================
  // 利用可否チェック
  // =================================================================
  describe('利用可否チェック', () => {
    it('isAvailable() が認識エンジンの利用可否を返す', async () => {
      (
        ExpoSpeechRecognitionModule.isRecognitionAvailable as jest.Mock
      ).mockReturnValue(true);

      const result = await isAvailable();
      expect(result).toBe(true);
    });

    it('認識エンジンが利用不可の場合 false を返す', async () => {
      (
        ExpoSpeechRecognitionModule.isRecognitionAvailable as jest.Mock
      ).mockReturnValue(false);

      const result = await isAvailable();
      expect(result).toBe(false);
    });
  });

  // =================================================================
  // リスナークリーンアップ
  // =================================================================
  describe('リスナークリーンアップ', () => {
    it('abort() でリスナーが解除される', () => {
      const options: SpeechRecognitionOptions = {
        mode: 'wakeword',
        lang: 'ja-JP',
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn(),
      };

      startRecognition(options);
      abortRecognition();

      // 【根拠】abort 後にイベントを発火しても、解除されているためコールバックは呼ばれない
      //        （ただし end イベントは stop/abort 後のクリーンアップで 1 回は通知する）
      __emitEvent('result', {
        results: [{ transcript: 'test' }],
        isFinal: true,
      });

      expect(options.onResult).not.toHaveBeenCalled();
    });

    it('新しい start() で前のリスナーが解除される', () => {
      const firstOnResult = jest.fn();
      const secondOnResult = jest.fn();

      startRecognition({
        mode: 'wakeword',
        lang: 'ja-JP',
        onResult: firstOnResult,
        onEnd: jest.fn(),
        onError: jest.fn(),
      });

      startRecognition({
        mode: 'command',
        lang: 'ja-JP',
        onResult: secondOnResult,
        onEnd: jest.fn(),
        onError: jest.fn(),
      });

      __emitEvent('result', {
        results: [{ transcript: '右' }],
        isFinal: true,
      });

      // 【根拠】2 つ目の start で 1 つ目のリスナーは解除されるため、1 つ目の onResult は呼ばれない
      expect(firstOnResult).not.toHaveBeenCalled();
      expect(secondOnResult).toHaveBeenCalledWith('右', true, ['右']);
    });
  });
});
