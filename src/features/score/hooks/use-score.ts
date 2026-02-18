/**
 * 【目的】UIとScoreStoreの仲介hookとして、得点操作と試合ルール判定を統合する
 * 【根拠】Clean Architecture 軽量版において hooks は UseCase 相当の役割を担う。
 *        ストア（状態管理）とサービス（ルール判定）を hook 層で結合することで、
 *        UI コンポーネントはスコア操作の詳細を意識せずに済む。
 *        なぜストア内で checkGameEnd を呼ばないか:
 *        ストアは状態の保持と更新に専念し、ビジネスルール判定は hook に委ねる責務分離のため。
 */
import { useStore } from 'zustand';
import { useScoreStore } from '../../../stores/score-store';
import {
  checkGameEnd,
  DEFAULT_GAME_RULES_CONFIG,
} from '../services/game-rules';

/**
 * 【目的】useScore hook の公開インターフェース
 * 【根拠】design.md の Contract 定義に準拠。
 *        UI は side ('left' | 'right') のみ指定すれば良く、
 *        内部のストア操作（incrementLeft/Right 等）を隠蔽する。
 */
export interface UseScoreReturn {
  readonly leftScore: number;
  readonly rightScore: number;
  readonly isGameEnd: boolean;
  readonly canUndo: boolean;
  incrementScore(side: 'left' | 'right'): void;
  decrementScore(side: 'left' | 'right'): void;
  rollback(): void;
  reset(): void;
}

/**
 * 【目的】スコア操作のビジネスロジックを提供するカスタム hook
 * 【根拠】ScoreStore（状態管理）と GameRules（ルール判定）を統合し、
 *        得点操作→試合終了判定→状態更新の一連フローをオーケストレーションする。
 *        zundo の temporal store から canUndo をリアクティブに購読し、
 *        UI が undo 可能かどうかをリアルタイムで表示できるようにする。
 */
export function useScore(): UseScoreReturn {
  const leftScore = useScoreStore((s) => s.leftScore);
  const rightScore = useScoreStore((s) => s.rightScore);
  const isGameEnd = useScoreStore((s) => s.isGameEnd);

  // 【目的】undo 可能かどうかをリアクティブに購読する
  // 【根拠】zundo の temporal store は独立した StoreApi であり、
  //        React の再レンダリングトリガーには useStore で購読する必要がある。
  //        pastStates.length > 0 で履歴の有無を判定する。
  const canUndo = useStore(
    useScoreStore.temporal,
    (s) => s.pastStates.length > 0
  );

  /**
   * 【目的】得点加算後に試合終了判定を実行し、結果をストアに反映する
   * 【根拠】zustand の set() は同期的であるため、呼び出し直後に getState() で
   *        最新スコアを取得し、checkGameEnd に渡すことができる。
   */
  const incrementScore = (side: 'left' | 'right'): void => {
    const store = useScoreStore.getState();
    if (side === 'left') {
      store.incrementLeft();
    } else {
      store.incrementRight();
    }

    const { leftScore: newLeft, rightScore: newRight } =
      useScoreStore.getState();
    const gameEnd = checkGameEnd(newLeft, newRight, DEFAULT_GAME_RULES_CONFIG);
    if (gameEnd) {
      useScoreStore.getState().setGameEnd(true);
    }
  };

  /**
   * 【目的】得点減算後に試合終了判定を再計算する
   * 【根拠】減算により試合終了条件を満たさなくなる可能性があるため、
   *        increment と同様に判定を実行する。
   */
  const decrementScore = (side: 'left' | 'right'): void => {
    const store = useScoreStore.getState();
    if (side === 'left') {
      store.decrementLeft();
    } else {
      store.decrementRight();
    }

    const { leftScore: newLeft, rightScore: newRight } =
      useScoreStore.getState();
    const gameEnd = checkGameEnd(newLeft, newRight, DEFAULT_GAME_RULES_CONFIG);
    useScoreStore.getState().setGameEnd(gameEnd);
  };

  /**
   * 【目的】直前の操作を取り消し、試合終了判定を再計算する
   * 【根拠】zundo の undo() はスコアのみを巻き戻す（partialize で isGameEnd を除外済み）。
   *        undo 後のスコアで試合終了判定を再計算し、isGameEnd を正しい値に更新する。
   */
  const rollback = (): void => {
    useScoreStore.temporal.getState().undo();

    const { leftScore: newLeft, rightScore: newRight } =
      useScoreStore.getState();
    const gameEnd = checkGameEnd(newLeft, newRight, DEFAULT_GAME_RULES_CONFIG);
    useScoreStore.getState().setGameEnd(gameEnd);
  };

  /**
   * 【目的】スコアと履歴をすべてクリアして新しい試合を開始可能にする
   * 【根拠】ScoreStore.reset() が leftScore, rightScore, isGameEnd の初期化と
   *        zundo 履歴のクリアを一括で行う。
   */
  const reset = (): void => {
    useScoreStore.getState().reset();
  };

  return {
    leftScore,
    rightScore,
    isGameEnd,
    canUndo,
    incrementScore,
    decrementScore,
    rollback,
    reset,
  };
}
