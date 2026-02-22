/**
 * 【目的】SoundService のユニットテスト
 * 【根拠】TDD の RED フェーズとして、サービスの期待動作を先にテストで定義する。
 *        プリロード、再生開始/完了、エラーハンドリング（Graceful Degradation）をカバーする。
 *        Contract: SoundService Service（design.md 参照）
 *        Requirements: 6.6 — 試合終了時にホイッスル音を5秒間再生する
 */

import {
  Audio,
  __triggerPlaybackFinished,
  __resetState,
  __getMockSoundInstance,
  __setCreateAsyncToFail,
} from 'expo-av';
import { preload, play, _resetForTesting } from '../sound';

// 【目的】各テストの前にモック状態とモジュール内部状態の両方をリセットする
beforeEach(() => {
  jest.clearAllMocks();
  __resetState();
  _resetForTesting();
});

describe('SoundService', () => {
  // =================================================================
  // preload() の基本動作
  // =================================================================
  describe('preload()', () => {
    it('Audio.Sound.createAsync() でホイッスル音アセットをロードする', async () => {
      await preload();

      expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1);
      // 【根拠】第一引数は require() で取得したアセット（数値になる）
      expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
        expect.anything()
      );
    });

    it('プリロード後に Sound インスタンスが保持される（play で使い回す）', async () => {
      await preload();

      // 【根拠】プリロード済みなら play() は createAsync を再度呼ばない
      const playPromise = play('whistle');
      __triggerPlaybackFinished();
      await playPromise;
      // createAsync は preload の1回のみ
      expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1);
    });

    it('プリロード失敗時はエラーログを出力し、例外をスローしない（Graceful Degradation）', async () => {
      __setCreateAsyncToFail(new Error('Load failed'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // 【根拠】design.md のエラー戦略: 効果音ファイル読み込み失敗 → エラーログ出力、音なしで続行
      await expect(preload()).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SoundService'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('複数回呼んでも createAsync は1回のみ実行される', async () => {
      await preload();
      await preload();

      expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1);
    });
  });

  // =================================================================
  // play() の基本動作
  // =================================================================
  describe('play()', () => {
    it('プリロード済みの Sound インスタンスで playAsync() を呼ぶ', async () => {
      await preload();
      const sound = __getMockSoundInstance();

      // 【目的】play の Promise は再生完了（didJustFinish）で解決する
      const playPromise = play('whistle');
      __triggerPlaybackFinished();
      await playPromise;

      expect(sound.playAsync).toHaveBeenCalledTimes(1);
    });

    it('setOnPlaybackStatusUpdate で再生完了を監視する', async () => {
      await preload();
      const sound = __getMockSoundInstance();

      const playPromise = play('whistle');
      __triggerPlaybackFinished();
      await playPromise;

      expect(sound.setOnPlaybackStatusUpdate).toHaveBeenCalled();
    });

    it('再生完了（didJustFinish: true）で Promise が解決する', async () => {
      await preload();

      let resolved = false;
      const playPromise = play('whistle').then(() => {
        resolved = true;
      });

      // 【根拠】再生完了前は Promise が未解決
      await Promise.resolve(); // microtask を進める
      expect(resolved).toBe(false);

      // 【根拠】didJustFinish: true で解決
      __triggerPlaybackFinished();
      await playPromise;
      expect(resolved).toBe(true);
    });

    it('再生完了後に Sound を初期位置に戻す（stopAsync で位置リセット）', async () => {
      await preload();
      const sound = __getMockSoundInstance();

      const playPromise = play('whistle');
      __triggerPlaybackFinished();
      await playPromise;

      // 【根拠】再生完了後に stopAsync で位置を0に戻すことで、次回の再生に備える
      expect(sound.stopAsync).toHaveBeenCalledTimes(1);
    });

    it('プリロード未実行でも自動的にプリロードしてから再生する', async () => {
      // 【根拠】preload() を呼ばなくても play() 単独で動作する（堅牢性）
      const playPromise = play('whistle');
      // 【根拠】play() 内の await preload() → await createAsync() の非同期チェーンを
      //        解決してから triggerPlaybackFinished を呼ぶ必要がある
      await Promise.resolve();
      await Promise.resolve();
      __triggerPlaybackFinished();
      await playPromise;

      expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1);
      expect(__getMockSoundInstance().playAsync).toHaveBeenCalledTimes(1);
    });

    it('プリロード失敗後の play() は音なしで即座に解決する（Graceful Degradation）', async () => {
      __setCreateAsyncToFail(new Error('Load failed'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // プリロード失敗
      await preload();

      // 【根拠】音が読み込めなかった場合、play() は何もせず正常終了する
      await expect(play('whistle')).resolves.toBeUndefined();

      consoleSpy.mockRestore();
    });
  });

  // =================================================================
  // SoundType のバリデーション
  // =================================================================
  describe('SoundType', () => {
    it('whistle タイプが受け付けられる', async () => {
      await preload();
      const playPromise = play('whistle');
      __triggerPlaybackFinished();
      await expect(playPromise).resolves.toBeUndefined();
    });
  });
});
