import { useScoreStore } from '../score-store';

/**
 * 【目的】ScoreStore の zustand + zundo によるスコア状態管理をテストする
 * 【根拠】スコアの加算/減算/リセット、試合終了ガード、undo による状態復元は
 *        アプリの中核機能であり、各操作の正確性を保証する必要がある。
 */
describe('ScoreStore', () => {
  /**
   * 【目的】各テストで独立した状態を保証する
   * 【根拠】zustand はモジュールレベルのシングルトンであり、
   *        テスト間で状態がリークしないよう初期化が必要。
   *        zundo の履歴もクリアしないと undo テストに影響する。
   */
  beforeEach(() => {
    // 【根拠】replace: true を使うとアクション関数も消えるため、
    //        状態プロパティのみをマージ形式でリセットする
    useScoreStore.setState({ leftScore: 0, rightScore: 0, isGameEnd: false });
    useScoreStore.temporal.getState().clear();
  });

  describe('初期状態', () => {
    it('leftScore が 0 である', () => {
      expect(useScoreStore.getState().leftScore).toBe(0);
    });

    it('rightScore が 0 である', () => {
      expect(useScoreStore.getState().rightScore).toBe(0);
    });

    it('isGameEnd が false である', () => {
      expect(useScoreStore.getState().isGameEnd).toBe(false);
    });
  });

  describe('incrementLeft', () => {
    it('左チームの得点を 1 加算する', () => {
      useScoreStore.getState().incrementLeft();
      expect(useScoreStore.getState().leftScore).toBe(1);
    });

    it('連続呼び出しで累積加算される', () => {
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().incrementLeft();
      expect(useScoreStore.getState().leftScore).toBe(3);
    });

    it('右チームの得点に影響しない', () => {
      useScoreStore.getState().incrementLeft();
      expect(useScoreStore.getState().rightScore).toBe(0);
    });
  });

  describe('incrementRight', () => {
    it('右チームの得点を 1 加算する', () => {
      useScoreStore.getState().incrementRight();
      expect(useScoreStore.getState().rightScore).toBe(1);
    });

    it('左チームの得点に影響しない', () => {
      useScoreStore.getState().incrementRight();
      expect(useScoreStore.getState().leftScore).toBe(0);
    });
  });

  describe('decrementLeft', () => {
    it('左チームの得点を 1 減算する', () => {
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().decrementLeft();
      expect(useScoreStore.getState().leftScore).toBe(1);
    });

    it('0 未満にはならない', () => {
      useScoreStore.getState().decrementLeft();
      expect(useScoreStore.getState().leftScore).toBe(0);
    });
  });

  describe('decrementRight', () => {
    it('右チームの得点を 1 減算する', () => {
      useScoreStore.getState().incrementRight();
      useScoreStore.getState().incrementRight();
      useScoreStore.getState().decrementRight();
      expect(useScoreStore.getState().rightScore).toBe(1);
    });

    it('0 未満にはならない', () => {
      useScoreStore.getState().decrementRight();
      expect(useScoreStore.getState().rightScore).toBe(0);
    });
  });

  describe('reset', () => {
    it('両チームの得点を 0 にリセットする', () => {
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().incrementRight();
      useScoreStore.getState().reset();
      expect(useScoreStore.getState().leftScore).toBe(0);
      expect(useScoreStore.getState().rightScore).toBe(0);
    });

    it('isGameEnd を false にリセットする', () => {
      useScoreStore.getState().setGameEnd(true);
      useScoreStore.getState().reset();
      expect(useScoreStore.getState().isGameEnd).toBe(false);
    });

    it('zundo の履歴をクリアする', () => {
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().incrementRight();
      useScoreStore.getState().reset();
      const { pastStates } = useScoreStore.temporal.getState();
      expect(pastStates).toHaveLength(0);
    });
  });

  describe('setGameEnd', () => {
    it('isGameEnd を true に設定できる', () => {
      useScoreStore.getState().setGameEnd(true);
      expect(useScoreStore.getState().isGameEnd).toBe(true);
    });

    it('isGameEnd を false に設定できる', () => {
      useScoreStore.getState().setGameEnd(true);
      useScoreStore.getState().setGameEnd(false);
      expect(useScoreStore.getState().isGameEnd).toBe(false);
    });
  });

  describe('試合終了時のガード', () => {
    beforeEach(() => {
      // 試合終了状態にする
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().setGameEnd(true);
    });

    it('incrementLeft が無効化される', () => {
      const scoreBefore = useScoreStore.getState().leftScore;
      useScoreStore.getState().incrementLeft();
      expect(useScoreStore.getState().leftScore).toBe(scoreBefore);
    });

    it('incrementRight が無効化される', () => {
      const scoreBefore = useScoreStore.getState().rightScore;
      useScoreStore.getState().incrementRight();
      expect(useScoreStore.getState().rightScore).toBe(scoreBefore);
    });

    it('decrementLeft が無効化される', () => {
      const scoreBefore = useScoreStore.getState().leftScore;
      useScoreStore.getState().decrementLeft();
      expect(useScoreStore.getState().leftScore).toBe(scoreBefore);
    });

    it('decrementRight が無効化される', () => {
      const scoreBefore = useScoreStore.getState().rightScore;
      useScoreStore.getState().decrementRight();
      expect(useScoreStore.getState().rightScore).toBe(scoreBefore);
    });

    it('reset は試合終了中でも有効', () => {
      useScoreStore.getState().reset();
      expect(useScoreStore.getState().leftScore).toBe(0);
      expect(useScoreStore.getState().rightScore).toBe(0);
      expect(useScoreStore.getState().isGameEnd).toBe(false);
    });
  });

  describe('undo (zundo)', () => {
    it('直前の得点操作を取り消せる', () => {
      useScoreStore.getState().incrementLeft();
      expect(useScoreStore.getState().leftScore).toBe(1);

      useScoreStore.temporal.getState().undo();
      expect(useScoreStore.getState().leftScore).toBe(0);
    });

    it('複数回の操作をそれぞれ取り消せる', () => {
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().incrementRight();
      useScoreStore.getState().incrementLeft();

      useScoreStore.temporal.getState().undo();
      expect(useScoreStore.getState().leftScore).toBe(1);
      expect(useScoreStore.getState().rightScore).toBe(1);

      useScoreStore.temporal.getState().undo();
      expect(useScoreStore.getState().leftScore).toBe(1);
      expect(useScoreStore.getState().rightScore).toBe(0);
    });

    it('decrement 操作も undo できる', () => {
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().decrementLeft();
      expect(useScoreStore.getState().leftScore).toBe(1);

      useScoreStore.temporal.getState().undo();
      expect(useScoreStore.getState().leftScore).toBe(2);
    });

    it('履歴が空の場合 undo しても状態が変わらない', () => {
      useScoreStore.temporal.getState().undo();
      expect(useScoreStore.getState().leftScore).toBe(0);
      expect(useScoreStore.getState().rightScore).toBe(0);
    });

    it('isGameEnd の変更は undo 履歴に含まれない', () => {
      useScoreStore.getState().incrementLeft();
      useScoreStore.getState().setGameEnd(true);

      // undo しても isGameEnd は変わらない（partialize でスコアのみ追跡）
      useScoreStore.temporal.getState().undo();
      // undo で leftScore は戻るが、isGameEnd は setGameEnd で最後に設定された値のまま
      // （ただし partialize の影響で setGameEnd は履歴に記録されないため、
      //   undo は incrementLeft の操作を取り消す）
      expect(useScoreStore.getState().leftScore).toBe(0);
    });
  });
});
