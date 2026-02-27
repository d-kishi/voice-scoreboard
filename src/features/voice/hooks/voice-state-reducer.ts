/**
 * 【目的】音声状態マシンの状態遷移を純粋関数として定義する reducer
 * 【根拠】useReducer に渡す純粋関数。副作用（サービス呼び出し）は含まない。
 *        状態遷移ロジックを分離することで:
 *        - reducer 単体での単体テストが可能
 *        - 副作用は useVoiceStateMachine hook の useEffect が担当する責務分離
 *        Contract: useVoiceStateMachine State（design.md 参照）
 */

import type { VoiceCommand } from '../types/voice-types';

// =================================================================
// 型定義
// =================================================================

/**
 * 【目的】reducer が管理する内部状態
 * 【根拠】state（現在の状態マシンの状態）に加え、
 *        pendingCommand（SPEAKING_ROGER → EXECUTING で使用する保留コマンド）、
 *        countdown（LISTENING 状態の残り秒数）を保持する。
 *        認識されたコマンドを SPEAKING_ROGER 状態を経由して
 *        EXECUTING に引き渡すために pendingCommand が必要。
 *        Task 8.2: SPEAKING_READY を廃止し 5 状態で動作する。
 */
export interface VoiceReducerState {
  readonly state:
    | 'IDLE'
    | 'LISTENING'
    | 'SPEAKING_ROGER'
    | 'EXECUTING'
    | 'SPEAKING_SCORE';
  readonly pendingCommand: VoiceCommand | null;
  readonly countdown: number;
}

/**
 * 【目的】状態マシンに送信できるアクションの型
 * 【根拠】各アクションが 1 つの状態遷移トリガーに対応する。
 *        SKIP 系アクションは設けない — 読み上げ OFF 時のスキップは
 *        hook 側の useEffect で通常のアクション（例: SPEECH_ROGER_DONE）を
 *        即座に dispatch することで実現する。
 *        Task 8.2: SPEECH_READY_DONE を廃止（WAKEWORD_DETECTED → LISTENING 直接遷移）。
 */
export type VoiceAction =
  | { type: 'WAKEWORD_DETECTED' }
  | { type: 'COMMAND_DETECTED'; command: VoiceCommand }
  | { type: 'COUNTDOWN_TICK' }
  | { type: 'LISTENING_TIMEOUT' }
  | { type: 'SPEECH_ROGER_DONE' }
  | { type: 'COMMAND_EXECUTED_WITH_SCORE' }
  | { type: 'SPEECH_SCORE_DONE' }
  | { type: 'STOP' };

// =================================================================
// 定数
// =================================================================

/** 【目的】reducer の初期状態 */
export const INITIAL_VOICE_STATE: VoiceReducerState = {
  state: 'IDLE',
  pendingCommand: null,
  countdown: 0,
};

/** 【目的】LISTENING 状態のカウントダウン秒数 */
export const LISTENING_DURATION = 10;

// =================================================================
// reducer 本体
// =================================================================

/**
 * 【目的】状態遷移を純粋関数として定義する reducer
 * 【根拠】不正な遷移（現在の状態で受け付けないアクション）は
 *        現在の状態をそのまま返す（サイレント無視）。
 *        これにより、非同期コールバックが遅延して到着した場合でも
 *        状態マシンの一貫性が保たれる。
 */
export function voiceStateReducer(
  current: VoiceReducerState,
  action: VoiceAction
): VoiceReducerState {
  switch (action.type) {
    // IDLE → LISTENING: ウェイクワード検知（Task 8.2: 直接遷移）
    case 'WAKEWORD_DETECTED':
      if (current.state !== 'IDLE') return current;
      return { ...current, state: 'LISTENING', countdown: LISTENING_DURATION };

    // LISTENING → SPEAKING_ROGER: コマンド検知
    case 'COMMAND_DETECTED':
      if (current.state !== 'LISTENING') return current;
      return {
        ...current,
        state: 'SPEAKING_ROGER',
        pendingCommand: action.command,
        countdown: 0,
      };

    // LISTENING: カウントダウン 1 秒経過
    case 'COUNTDOWN_TICK':
      if (current.state !== 'LISTENING') return current;
      return { ...current, countdown: current.countdown - 1 };

    // LISTENING → IDLE: 5 秒タイムアウト
    case 'LISTENING_TIMEOUT':
      if (current.state !== 'LISTENING') return current;
      return { ...INITIAL_VOICE_STATE };

    // SPEAKING_ROGER → EXECUTING: Roger 読み上げ完了
    case 'SPEECH_ROGER_DONE':
      if (current.state !== 'SPEAKING_ROGER') return current;
      return { ...current, state: 'EXECUTING' };

    // EXECUTING → SPEAKING_SCORE: 全コマンド共通（得点加算・ロールバック・リセット）
    case 'COMMAND_EXECUTED_WITH_SCORE':
      if (current.state !== 'EXECUTING') return current;
      return { ...current, state: 'SPEAKING_SCORE', pendingCommand: null };

    // SPEAKING_SCORE → IDLE: スコア読み上げ完了
    case 'SPEECH_SCORE_DONE':
      if (current.state !== 'SPEAKING_SCORE') return current;
      return { ...INITIAL_VOICE_STATE };

    // 任意の状態 → IDLE: 外部停止
    case 'STOP':
      return { ...INITIAL_VOICE_STATE };

    default:
      return current;
  }
}
