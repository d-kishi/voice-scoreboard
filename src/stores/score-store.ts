/**
 * 【目的】スコア状態の管理と操作履歴の保持を zustand + zundo で実現する
 * 【根拠】zustand はシンプルな API でリアクティブな状態管理を提供し、
 *        zundo の temporal ミドルウェアでスコア変更の undo/redo を自動管理できる。
 *        試合終了状態のガードをストアレベルで実装することで、
 *        UI層に依存しない安全なスコア操作を保証する。
 */
import { create } from 'zustand';
import { temporal } from 'zundo';

/**
 * 【目的】スコアの状態を定義する型
 * 【根拠】左右チームの得点と試合終了フラグが、
 *        スコアボードの最小限の状態として必要。
 */
export interface ScoreState {
  readonly leftScore: number;
  readonly rightScore: number;
  readonly isGameEnd: boolean;
}

/**
 * 【目的】スコアに対する操作を定義する型
 * 【根拠】加算/減算/リセットはタッチ操作で必要。
 *        setGameEnd は useScore hook から試合終了判定結果を反映するための内部API。
 *        なぜ checkGameEnd をストア内で呼ばないか: ストアは状態管理に専念し、
 *        ビジネスルール判定は hook 層（Task 2.3）に委ねる責務分離のため。
 */
export interface ScoreActions {
  incrementLeft(): void;
  incrementRight(): void;
  decrementLeft(): void;
  decrementRight(): void;
  reset(): void;
  setGameEnd(value: boolean): void;
}

export type ScoreStore = ScoreState & ScoreActions;

const INITIAL_STATE: ScoreState = {
  leftScore: 0,
  rightScore: 0,
  isGameEnd: false,
};

/**
 * 【目的】zustand + zundo によるスコアストアのシングルトンインスタンス
 * 【根拠】temporal ミドルウェアの partialize でスコアのみを履歴追跡対象とし、
 *        isGameEnd は除外する。isGameEnd は useScore hook が
 *        GameRules の判定結果から設定するため、undo 時には hook 側で再計算する。
 */
export const useScoreStore = create<ScoreStore>()(
  temporal(
    (set, get) => ({
      ...INITIAL_STATE,

      incrementLeft: () => {
        if (get().isGameEnd) return;
        set((state) => ({ leftScore: state.leftScore + 1 }));
      },

      incrementRight: () => {
        if (get().isGameEnd) return;
        set((state) => ({ rightScore: state.rightScore + 1 }));
      },

      decrementLeft: () => {
        if (get().isGameEnd) return;
        set((state) => ({ leftScore: Math.max(0, state.leftScore - 1) }));
      },

      decrementRight: () => {
        if (get().isGameEnd) return;
        set((state) => ({ rightScore: Math.max(0, state.rightScore - 1) }));
      },

      reset: () => {
        set(INITIAL_STATE);
        // 【目的】リセット時に操作履歴もクリアする
        // 【根拠】新しい試合として0-0から始めるため、
        //        過去のスコア履歴を持ち越す意味がない
        useScoreStore.temporal.getState().clear();
      },

      setGameEnd: (value: boolean) => {
        set({ isGameEnd: value });
      },
    }),
    {
      // 【目的】スコアのみを undo/redo 履歴で追跡する
      // 【根拠】isGameEnd はビジネスルール判定の結果であり、
      //        スコア変更とは独立して管理される。undo 時に isGameEnd まで
      //        巻き戻すと不整合が発生するため、partialize で除外する。
      partialize: (state) => ({
        leftScore: state.leftScore,
        rightScore: state.rightScore,
      }),
      // 【目的】スコア値が変わっていない setState 呼び出しを履歴に記録しない
      // 【根拠】partialize が毎回新しいオブジェクトを返すため、
      //        デフォルトの参照比較では setGameEnd のような非スコア変更も
      //        履歴エントリとして記録されてしまう。値比較に変更することで回避する。
      equality: (pastState, currentState) =>
        pastState.leftScore === currentState.leftScore &&
        pastState.rightScore === currentState.rightScore,
    },
  ),
);
