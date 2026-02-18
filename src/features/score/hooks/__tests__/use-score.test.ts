import { renderHook, act } from '@testing-library/react-native';
import { useScoreStore } from '../../../../stores/score-store';
import { useScore } from '../use-score';

/**
 * 【目的】useScore hook の統合テスト
 * 【根拠】useScore は ScoreStore と GameRules を統合する UseCase 相当の hook であり、
 *        得点操作→試合終了判定の連携、ロールバック後の再判定、ガード動作を
 *        テストすることでアプリの中核ロジックの正確性を保証する。
 */
describe('useScore', () => {
  /**
   * 【目的】各テストで独立した状態を保証する
   * 【根拠】zustand はモジュールレベルのシングルトンであり、
   *        テスト間で状態がリークしないよう初期化が必要。
   */
  beforeEach(() => {
    useScoreStore.setState({ leftScore: 0, rightScore: 0, isGameEnd: false });
    useScoreStore.temporal.getState().clear();
  });

  describe('初期状態', () => {
    it('leftScore が 0 である', () => {
      const { result } = renderHook(() => useScore());
      expect(result.current.leftScore).toBe(0);
    });

    it('rightScore が 0 である', () => {
      const { result } = renderHook(() => useScore());
      expect(result.current.rightScore).toBe(0);
    });

    it('isGameEnd が false である', () => {
      const { result } = renderHook(() => useScore());
      expect(result.current.isGameEnd).toBe(false);
    });

    it('canUndo が false である', () => {
      const { result } = renderHook(() => useScore());
      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('incrementScore', () => {
    it('左チームの得点を 1 加算する', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.incrementScore('left');
      });
      expect(result.current.leftScore).toBe(1);
    });

    it('右チームの得点を 1 加算する', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.incrementScore('right');
      });
      expect(result.current.rightScore).toBe(1);
    });

    it('加算後に canUndo が true になる', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.incrementScore('left');
      });
      expect(result.current.canUndo).toBe(true);
    });
  });

  describe('decrementScore', () => {
    it('左チームの得点を 1 減算する', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.incrementScore('left');
        result.current.incrementScore('left');
      });
      act(() => {
        result.current.decrementScore('left');
      });
      expect(result.current.leftScore).toBe(1);
    });

    it('右チームの得点を 1 減算する', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.incrementScore('right');
        result.current.incrementScore('right');
      });
      act(() => {
        result.current.decrementScore('right');
      });
      expect(result.current.rightScore).toBe(1);
    });
  });

  describe('試合終了判定の連携', () => {
    it('25-0 で試合終了と判定される', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.incrementScore('left');
        }
      });
      expect(result.current.isGameEnd).toBe(true);
    });

    it('25-23 で試合終了と判定される', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        for (let i = 0; i < 23; i++) {
          result.current.incrementScore('left');
          result.current.incrementScore('right');
        }
        result.current.incrementScore('left');
        result.current.incrementScore('left');
      });
      expect(result.current.leftScore).toBe(25);
      expect(result.current.rightScore).toBe(23);
      expect(result.current.isGameEnd).toBe(true);
    });

    it('25-24 は試合継続（デュース）', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        for (let i = 0; i < 24; i++) {
          result.current.incrementScore('left');
          result.current.incrementScore('right');
        }
        result.current.incrementScore('left');
      });
      expect(result.current.leftScore).toBe(25);
      expect(result.current.rightScore).toBe(24);
      expect(result.current.isGameEnd).toBe(false);
    });

    it('26-24（デュース後）で試合終了', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        for (let i = 0; i < 24; i++) {
          result.current.incrementScore('left');
          result.current.incrementScore('right');
        }
        result.current.incrementScore('left');
        result.current.incrementScore('left');
      });
      expect(result.current.leftScore).toBe(26);
      expect(result.current.rightScore).toBe(24);
      expect(result.current.isGameEnd).toBe(true);
    });
  });

  describe('試合終了時のガード', () => {
    beforeEach(() => {
      // 25-0 で試合終了状態にする
      act(() => {
        for (let i = 0; i < 25; i++) {
          useScoreStore.getState().incrementLeft();
        }
        useScoreStore.getState().setGameEnd(true);
      });
    });

    it('incrementScore が無効化される', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.incrementScore('left');
      });
      expect(result.current.leftScore).toBe(25);
    });

    it('decrementScore が無効化される', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.decrementScore('left');
      });
      expect(result.current.leftScore).toBe(25);
    });

    it('reset は試合終了中でも有効', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.reset();
      });
      expect(result.current.leftScore).toBe(0);
      expect(result.current.rightScore).toBe(0);
      expect(result.current.isGameEnd).toBe(false);
    });
  });

  describe('rollback', () => {
    it('直前の得点操作を取り消せる', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.incrementScore('left');
      });
      expect(result.current.leftScore).toBe(1);

      act(() => {
        result.current.rollback();
      });
      expect(result.current.leftScore).toBe(0);
    });

    it('rollback 後に canUndo が更新される', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.incrementScore('left');
      });
      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.rollback();
      });
      expect(result.current.canUndo).toBe(false);
    });

    it('rollback 後に isGameEnd が再計算される', () => {
      const { result } = renderHook(() => useScore());
      // 24-0 まで加算
      act(() => {
        for (let i = 0; i < 24; i++) {
          result.current.incrementScore('left');
        }
      });
      expect(result.current.isGameEnd).toBe(false);

      // 25-0 で試合終了
      act(() => {
        result.current.incrementScore('left');
      });
      expect(result.current.isGameEnd).toBe(true);

      // rollback で 24-0 に戻る → 試合継続
      act(() => {
        result.current.rollback();
      });
      expect(result.current.leftScore).toBe(24);
      expect(result.current.isGameEnd).toBe(false);
    });

    it('履歴が空の場合 rollback しても状態が変わらない', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.rollback();
      });
      expect(result.current.leftScore).toBe(0);
      expect(result.current.rightScore).toBe(0);
    });
  });

  describe('reset', () => {
    it('両チームの得点を 0 にリセットする', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.incrementScore('left');
        result.current.incrementScore('right');
      });
      act(() => {
        result.current.reset();
      });
      expect(result.current.leftScore).toBe(0);
      expect(result.current.rightScore).toBe(0);
    });

    it('isGameEnd を false にリセットする', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.incrementScore('left');
        }
      });
      expect(result.current.isGameEnd).toBe(true);

      act(() => {
        result.current.reset();
      });
      expect(result.current.isGameEnd).toBe(false);
    });

    it('リセット後に canUndo が false になる', () => {
      const { result } = renderHook(() => useScore());
      act(() => {
        result.current.incrementScore('left');
      });
      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.reset();
      });
      expect(result.current.canUndo).toBe(false);
    });
  });
});
