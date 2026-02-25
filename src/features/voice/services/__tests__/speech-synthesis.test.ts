/**
 * 【目的】SpeechSynthesisService のユニットテスト
 * 【根拠】TDD の RED フェーズとして、サービスの期待動作を先にテストで定義する。
 *        読み上げ開始/完了コールバック、isSpeaking 状態の管理をカバーする。
 *        Contract: SpeechSynthesisService Service（design.md 参照）
 */

import Speech, {
  __triggerOnDone,
  __triggerOnStopped,
  __resetState,
  __setIsSpeaking,
} from 'expo-speech';
import {
  speak,
  stopSpeaking,
  isSpeaking,
  speakReady,
  speakRoger,
  speakScore,
} from '../speech-synthesis';

// 【目的】各テストの前にモック状態をリセットする
beforeEach(() => {
  jest.clearAllMocks();
  __resetState();
});

describe('SpeechSynthesisService', () => {
  // =================================================================
  // speak() の基本動作
  // =================================================================
  describe('speak()', () => {
    it('テキストを日本語（ja-JP）で読み上げる', () => {
      const onDone = jest.fn();
      speak('テスト', onDone);

      expect(Speech.speak).toHaveBeenCalledWith(
        'テスト',
        expect.objectContaining({
          language: 'ja-JP',
          pitch: 0.8,
          rate: 1.0,
        })
      );
    });

    it('読み上げ完了時に onDone コールバックが呼ばれる', () => {
      const onDone = jest.fn();
      speak('テスト', onDone);

      expect(onDone).not.toHaveBeenCalled();
      __triggerOnDone();
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('stop() で停止された場合も onDone コールバックが呼ばれる', () => {
      const onDone = jest.fn();
      speak('テスト', onDone);

      __triggerOnStopped();
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('Speech.speak() に onDone と onStopped のコールバックが渡される', () => {
      const onDone = jest.fn();
      speak('テスト', onDone);

      const callArgs = (Speech.speak as jest.Mock).mock.calls[0][1];
      expect(callArgs.onDone).toBeDefined();
      expect(callArgs.onStopped).toBeDefined();
    });
  });

  // =================================================================
  // stopSpeaking()
  // =================================================================
  describe('stopSpeaking()', () => {
    it('Speech.stop() を呼び出す', () => {
      stopSpeaking();
      expect(Speech.stop).toHaveBeenCalledTimes(1);
    });
  });

  // =================================================================
  // isSpeaking()
  // =================================================================
  describe('isSpeaking()', () => {
    it('読み上げ中は true を返す', async () => {
      __setIsSpeaking(true);
      const result = await isSpeaking();
      expect(result).toBe(true);
    });

    it('読み上げ中でなければ false を返す', async () => {
      __setIsSpeaking(false);
      const result = await isSpeaking();
      expect(result).toBe(false);
    });

    it('Speech.isSpeakingAsync() を呼び出す', async () => {
      await isSpeaking();
      expect(Speech.isSpeakingAsync).toHaveBeenCalledTimes(1);
    });
  });

  // =================================================================
  // 定型フレーズのヘルパー関数
  // =================================================================
  describe('speakReady()', () => {
    it('「Ready」を読み上げる', () => {
      const onDone = jest.fn();
      speakReady(onDone);

      expect(Speech.speak).toHaveBeenCalledWith(
        'Ready',
        expect.objectContaining({
          language: 'ja-JP',
          pitch: 0.8,
          rate: 1.0,
        })
      );
    });

    it('読み上げ完了時に onDone が呼ばれる', () => {
      const onDone = jest.fn();
      speakReady(onDone);

      __triggerOnDone();
      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });

  describe('speakRoger()', () => {
    it('「ラージャ」（Roger）を読み上げる', () => {
      const onDone = jest.fn();
      speakRoger(onDone);

      expect(Speech.speak).toHaveBeenCalledWith(
        'ラージャ',
        expect.objectContaining({
          language: 'ja-JP',
          pitch: 0.8,
          rate: 1.0,
        })
      );
    });

    it('読み上げ完了時に onDone が呼ばれる', () => {
      const onDone = jest.fn();
      speakRoger(onDone);

      __triggerOnDone();
      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });

  describe('speakScore()', () => {
    it('「ひだり{点数}、みぎ{点数}」の形式で読み上げる', () => {
      const onDone = jest.fn();
      speakScore(15, 20, onDone);

      expect(Speech.speak).toHaveBeenCalledWith(
        'ひだり15、みぎ20',
        expect.objectContaining({
          language: 'ja-JP',
          pitch: 0.8,
          rate: 1.0,
        })
      );
    });

    it('0-0 のスコアを正しく読み上げる', () => {
      const onDone = jest.fn();
      speakScore(0, 0, onDone);

      expect(Speech.speak).toHaveBeenCalledWith(
        'ひだり0、みぎ0',
        expect.objectContaining({
          language: 'ja-JP',
          pitch: 0.8,
          rate: 1.0,
        })
      );
    });

    it('読み上げ完了時に onDone が呼ばれる', () => {
      const onDone = jest.fn();
      speakScore(10, 5, onDone);

      __triggerOnDone();
      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });

  // =================================================================
  // 連続呼び出しの動作
  // =================================================================
  describe('連続呼び出し', () => {
    it('speak() を連続で呼んでも各呼び出しで Speech.speak() が呼ばれる', () => {
      speak('テスト1', jest.fn());
      speak('テスト2', jest.fn());

      // 【根拠】expo-speech は内部でキュー管理する。
      //        サービス層は単純に Speech.speak() に委譲する
      expect(Speech.speak).toHaveBeenCalledTimes(2);
    });
  });
});
