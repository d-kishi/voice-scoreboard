/**
 * 【目的】voiceStateReducer のユニットテスト
 * 【根拠】TDD の RED フェーズとして、状態マシンの遷移ルールを先にテストで定義する。
 *        reducer は純粋関数のため renderHook 不要。直接関数呼び出しでテストする。
 */

import {
  voiceStateReducer,
  INITIAL_VOICE_STATE,
  LISTENING_DURATION,
} from '../voice-state-reducer';
import type { VoiceReducerState, VoiceAction } from '../voice-state-reducer';

describe('voiceStateReducer', () => {
  // =================================================================
  // IDLE 状態
  // =================================================================
  describe('IDLE 状態', () => {
    const idleState: VoiceReducerState = { ...INITIAL_VOICE_STATE };

    it('WAKEWORD_DETECTED で SPEAKING_READY に遷移する', () => {
      const next = voiceStateReducer(idleState, { type: 'WAKEWORD_DETECTED' });
      expect(next.state).toBe('SPEAKING_READY');
    });

    it('COMMAND_DETECTED を無視する（IDLE では受け付けない）', () => {
      const next = voiceStateReducer(idleState, {
        type: 'COMMAND_DETECTED',
        command: 'right',
      });
      expect(next.state).toBe('IDLE');
    });

    it('LISTENING_TIMEOUT を無視する', () => {
      const next = voiceStateReducer(idleState, {
        type: 'LISTENING_TIMEOUT',
      });
      expect(next.state).toBe('IDLE');
    });

    it('STOP で IDLE のまま変化しない', () => {
      const next = voiceStateReducer(idleState, { type: 'STOP' });
      expect(next.state).toBe('IDLE');
      expect(next.pendingCommand).toBeNull();
      expect(next.countdown).toBe(0);
    });
  });

  // =================================================================
  // SPEAKING_READY 状態
  // =================================================================
  describe('SPEAKING_READY 状態', () => {
    const speakingReadyState: VoiceReducerState = {
      state: 'SPEAKING_READY',
      pendingCommand: null,
      countdown: 0,
    };

    it('SPEECH_READY_DONE で LISTENING に遷移する', () => {
      const next = voiceStateReducer(speakingReadyState, {
        type: 'SPEECH_READY_DONE',
      });
      expect(next.state).toBe('LISTENING');
    });

    it('LISTENING 遷移時に countdown が LISTENING_DURATION に設定される', () => {
      const next = voiceStateReducer(speakingReadyState, {
        type: 'SPEECH_READY_DONE',
      });
      expect(next.countdown).toBe(LISTENING_DURATION);
    });

    it('WAKEWORD_DETECTED を無視する', () => {
      const next = voiceStateReducer(speakingReadyState, {
        type: 'WAKEWORD_DETECTED',
      });
      expect(next.state).toBe('SPEAKING_READY');
    });

    it('COMMAND_DETECTED を無視する', () => {
      const next = voiceStateReducer(speakingReadyState, {
        type: 'COMMAND_DETECTED',
        command: 'right',
      });
      expect(next.state).toBe('SPEAKING_READY');
    });

    it('STOP で IDLE に遷移する', () => {
      const next = voiceStateReducer(speakingReadyState, { type: 'STOP' });
      expect(next).toEqual(INITIAL_VOICE_STATE);
    });
  });

  // =================================================================
  // LISTENING 状態
  // =================================================================
  describe('LISTENING 状態', () => {
    const listeningState: VoiceReducerState = {
      state: 'LISTENING',
      pendingCommand: null,
      countdown: LISTENING_DURATION,
    };

    it('COMMAND_DETECTED で SPEAKING_ROGER に遷移する', () => {
      const next = voiceStateReducer(listeningState, {
        type: 'COMMAND_DETECTED',
        command: 'right',
      });
      expect(next.state).toBe('SPEAKING_ROGER');
    });

    it('COMMAND_DETECTED で pendingCommand が設定される', () => {
      const next = voiceStateReducer(listeningState, {
        type: 'COMMAND_DETECTED',
        command: 'rollback',
      });
      expect(next.pendingCommand).toBe('rollback');
    });

    it('COMMAND_DETECTED で countdown が 0 にクリアされる', () => {
      const next = voiceStateReducer(listeningState, {
        type: 'COMMAND_DETECTED',
        command: 'left',
      });
      expect(next.countdown).toBe(0);
    });

    it('COUNTDOWN_TICK で countdown が 1 減る', () => {
      const next = voiceStateReducer(listeningState, {
        type: 'COUNTDOWN_TICK',
      });
      expect(next.countdown).toBe(LISTENING_DURATION - 1);
      expect(next.state).toBe('LISTENING');
    });

    it('LISTENING_TIMEOUT で IDLE に遷移する', () => {
      const next = voiceStateReducer(listeningState, {
        type: 'LISTENING_TIMEOUT',
      });
      expect(next).toEqual(INITIAL_VOICE_STATE);
    });

    it('LISTENING_TIMEOUT で pendingCommand が null にクリアされる', () => {
      const next = voiceStateReducer(listeningState, {
        type: 'LISTENING_TIMEOUT',
      });
      expect(next.pendingCommand).toBeNull();
    });

    it('WAKEWORD_DETECTED を無視する', () => {
      const next = voiceStateReducer(listeningState, {
        type: 'WAKEWORD_DETECTED',
      });
      expect(next.state).toBe('LISTENING');
    });

    it('STOP で IDLE に遷移する', () => {
      const next = voiceStateReducer(listeningState, { type: 'STOP' });
      expect(next).toEqual(INITIAL_VOICE_STATE);
    });
  });

  // =================================================================
  // SPEAKING_ROGER 状態
  // =================================================================
  describe('SPEAKING_ROGER 状態', () => {
    const speakingRogerState: VoiceReducerState = {
      state: 'SPEAKING_ROGER',
      pendingCommand: 'right',
      countdown: 0,
    };

    it('SPEECH_ROGER_DONE で EXECUTING に遷移する', () => {
      const next = voiceStateReducer(speakingRogerState, {
        type: 'SPEECH_ROGER_DONE',
      });
      expect(next.state).toBe('EXECUTING');
    });

    it('EXECUTING 遷移時に pendingCommand が保持される', () => {
      const next = voiceStateReducer(speakingRogerState, {
        type: 'SPEECH_ROGER_DONE',
      });
      expect(next.pendingCommand).toBe('right');
    });

    it('WAKEWORD_DETECTED を無視する', () => {
      const next = voiceStateReducer(speakingRogerState, {
        type: 'WAKEWORD_DETECTED',
      });
      expect(next.state).toBe('SPEAKING_ROGER');
    });

    it('STOP で IDLE に遷移する', () => {
      const next = voiceStateReducer(speakingRogerState, { type: 'STOP' });
      expect(next).toEqual(INITIAL_VOICE_STATE);
    });
  });

  // =================================================================
  // EXECUTING 状態
  // =================================================================
  describe('EXECUTING 状態', () => {
    const executingState: VoiceReducerState = {
      state: 'EXECUTING',
      pendingCommand: 'right',
      countdown: 0,
    };

    it('COMMAND_EXECUTED で IDLE に遷移する（得点加算時）', () => {
      const next = voiceStateReducer(executingState, {
        type: 'COMMAND_EXECUTED',
      });
      expect(next).toEqual(INITIAL_VOICE_STATE);
    });

    it('COMMAND_EXECUTED_WITH_SCORE で SPEAKING_SCORE に遷移する', () => {
      const stateWithRollback: VoiceReducerState = {
        ...executingState,
        pendingCommand: 'rollback',
      };
      const next = voiceStateReducer(stateWithRollback, {
        type: 'COMMAND_EXECUTED_WITH_SCORE',
      });
      expect(next.state).toBe('SPEAKING_SCORE');
    });

    it('COMMAND_EXECUTED_WITH_SCORE で pendingCommand がクリアされる', () => {
      const next = voiceStateReducer(executingState, {
        type: 'COMMAND_EXECUTED_WITH_SCORE',
      });
      expect(next.pendingCommand).toBeNull();
    });

    it('WAKEWORD_DETECTED を無視する', () => {
      const next = voiceStateReducer(executingState, {
        type: 'WAKEWORD_DETECTED',
      });
      expect(next.state).toBe('EXECUTING');
    });

    it('STOP で IDLE に遷移する', () => {
      const next = voiceStateReducer(executingState, { type: 'STOP' });
      expect(next).toEqual(INITIAL_VOICE_STATE);
    });
  });

  // =================================================================
  // SPEAKING_SCORE 状態
  // =================================================================
  describe('SPEAKING_SCORE 状態', () => {
    const speakingScoreState: VoiceReducerState = {
      state: 'SPEAKING_SCORE',
      pendingCommand: null,
      countdown: 0,
    };

    it('SPEECH_SCORE_DONE で IDLE に遷移する', () => {
      const next = voiceStateReducer(speakingScoreState, {
        type: 'SPEECH_SCORE_DONE',
      });
      expect(next).toEqual(INITIAL_VOICE_STATE);
    });

    it('WAKEWORD_DETECTED を無視する', () => {
      const next = voiceStateReducer(speakingScoreState, {
        type: 'WAKEWORD_DETECTED',
      });
      expect(next.state).toBe('SPEAKING_SCORE');
    });

    it('STOP で IDLE に遷移する', () => {
      const next = voiceStateReducer(speakingScoreState, { type: 'STOP' });
      expect(next).toEqual(INITIAL_VOICE_STATE);
    });
  });

  // =================================================================
  // STOP アクション（全状態共通）
  // =================================================================
  describe('STOP アクション', () => {
    const allStates: VoiceReducerState[] = [
      { state: 'IDLE', pendingCommand: null, countdown: 0 },
      { state: 'SPEAKING_READY', pendingCommand: null, countdown: 0 },
      { state: 'LISTENING', pendingCommand: null, countdown: 3 },
      { state: 'SPEAKING_ROGER', pendingCommand: 'right', countdown: 0 },
      { state: 'EXECUTING', pendingCommand: 'left', countdown: 0 },
      { state: 'SPEAKING_SCORE', pendingCommand: null, countdown: 0 },
    ];

    it.each(allStates)(
      '$state 状態から IDLE に遷移する',
      (currentState) => {
        const next = voiceStateReducer(currentState, { type: 'STOP' });
        expect(next).toEqual(INITIAL_VOICE_STATE);
      }
    );
  });

  // =================================================================
  // 不正なアクションの無視
  // =================================================================
  describe('不正なアクション', () => {
    it('未知のアクションは現在の状態を返す', () => {
      const state: VoiceReducerState = { ...INITIAL_VOICE_STATE };
      const next = voiceStateReducer(state, {
        type: 'UNKNOWN_ACTION' as VoiceAction['type'],
      } as VoiceAction);
      expect(next).toBe(state);
    });
  });
});
