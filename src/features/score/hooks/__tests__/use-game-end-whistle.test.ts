/**
 * 【目的】useGameEndWhistle hook のユニットテスト
 * 【根拠】Task 7.2 の受け入れ条件:
 *        - 試合終了判定時にホイッスル音を再生する
 *        - 試合終了オーバーレイとサウンド再生の同期
 *        - タッチ操作・音声操作の両方で試合終了時に発動する
 *        hook は isGameEnd 状態の変化を監視するため、
 *        スコア変更のトリガーがタッチでも音声でも同一のロジックで発火する。
 *        Requirements: 3.3, 6.6
 */

import { renderHook, act } from '@testing-library/react-native';
import * as SoundService from '../../../voice/services/sound';
import { useGameEndWhistle } from '../use-game-end-whistle';

// 【目的】SoundService をモック化してネイティブモジュールへの依存を排除する
jest.mock('../../../voice/services/sound', () => ({
  preload: jest.fn().mockResolvedValue(undefined),
  play: jest.fn().mockResolvedValue(undefined),
  WHISTLE_DURATION_MS: 3000,
}));

describe('useGameEndWhistle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =================================================================
  // プリロード
  // =================================================================
  describe('プリロード', () => {
    it('マウント時に SoundService.preload() を呼ぶ', () => {
      renderHook(() => useGameEndWhistle(false));

      expect(SoundService.preload).toHaveBeenCalledTimes(1);
    });

    it('再レンダリング時にプリロードを重複実行しない', () => {
      const { rerender } = renderHook(
        ({ isGameEnd }) => useGameEndWhistle(isGameEnd),
        { initialProps: { isGameEnd: false } }
      );

      rerender({ isGameEnd: false });
      rerender({ isGameEnd: false });

      // 【根拠】useEffect の依存配列が空なのでマウント時の1回のみ
      expect(SoundService.preload).toHaveBeenCalledTimes(1);
    });
  });

  // =================================================================
  // ホイッスル音再生トリガー
  // =================================================================
  describe('ホイッスル音再生', () => {
    it('isGameEnd が false → true に遷移した時にホイッスル音を再生する', () => {
      const { rerender } = renderHook(
        ({ isGameEnd }) => useGameEndWhistle(isGameEnd),
        { initialProps: { isGameEnd: false } }
      );

      // 【根拠】状態遷移（false → true）でトリガー
      rerender({ isGameEnd: true });

      expect(SoundService.play).toHaveBeenCalledTimes(1);
      expect(SoundService.play).toHaveBeenCalledWith('whistle', expect.any(Number));
    });

    it('初期値が false の場合、マウント時には再生しない', () => {
      renderHook(() => useGameEndWhistle(false));

      expect(SoundService.play).not.toHaveBeenCalled();
    });

    it('true → false → true と遷移した場合、2回目の true でも再生する', () => {
      const { rerender } = renderHook(
        ({ isGameEnd }) => useGameEndWhistle(isGameEnd),
        { initialProps: { isGameEnd: false } }
      );

      // 1回目: false → true
      rerender({ isGameEnd: true });
      expect(SoundService.play).toHaveBeenCalledTimes(1);

      // リセット: true → false
      rerender({ isGameEnd: false });

      // 2回目: false → true（新しい試合の終了）
      rerender({ isGameEnd: true });
      expect(SoundService.play).toHaveBeenCalledTimes(2);
    });

    it('isGameEnd が true のまま再レンダリングされても重複再生しない', () => {
      const { rerender } = renderHook(
        ({ isGameEnd }) => useGameEndWhistle(isGameEnd),
        { initialProps: { isGameEnd: false } }
      );

      rerender({ isGameEnd: true });
      rerender({ isGameEnd: true });
      rerender({ isGameEnd: true });

      // 【根拠】false → true の遷移は1回のみなので再生も1回のみ
      expect(SoundService.play).toHaveBeenCalledTimes(1);
    });

    it('isGameEnd が false → false のままでは再生しない', () => {
      const { rerender } = renderHook(
        ({ isGameEnd }) => useGameEndWhistle(isGameEnd),
        { initialProps: { isGameEnd: false } }
      );

      rerender({ isGameEnd: false });
      rerender({ isGameEnd: false });

      expect(SoundService.play).not.toHaveBeenCalled();
    });
  });

  // =================================================================
  // エラーハンドリング
  // =================================================================
  describe('エラーハンドリング', () => {
    it('preload が失敗してもクラッシュしない（Graceful Degradation）', () => {
      (SoundService.preload as jest.Mock).mockRejectedValueOnce(
        new Error('Preload failed')
      );
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // 【根拠】SoundService 自体が Graceful Degradation を実装済みだが、
      //        hook 側でも例外伝播を防ぐ
      expect(() => {
        renderHook(() => useGameEndWhistle(false));
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('play が失敗してもクラッシュしない（Graceful Degradation）', async () => {
      (SoundService.play as jest.Mock).mockRejectedValueOnce(
        new Error('Play failed')
      );
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { rerender } = renderHook(
        ({ isGameEnd }) => useGameEndWhistle(isGameEnd),
        { initialProps: { isGameEnd: false } }
      );

      // 【根拠】play の例外が hook の外に漏れないこと
      expect(() => {
        rerender({ isGameEnd: true });
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
