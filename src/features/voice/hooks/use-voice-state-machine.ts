/**
 * 【目的】K.I.T.T.スタイル音声状態マシンのオーケストレーション hook
 * 【根拠】design.md の useVoiceStateMachine Contract に準拠。
 *        reducer（純粋な状態遷移）と useEffect（副作用）の分離パターンを採用。
 *        reducer は voiceStateReducer に委譲し、useEffect で状態変化に応じた
 *        サービス呼び出し（音声認識・読み上げ）を実行する。
 *
 *        なぜ useReducer + useEffect を採用するか:
 *        - 状態遷移が 6 つの状態を持つ複雑な有限オートマトンであり、
 *          useReducer の「現在の状態 + アクション -> 次の状態」が自然に適合する
 *        - reducer は純粋関数として単体テスト可能
 *        - 副作用を useEffect に分離することで責務が明確になる
 */

import { useReducer, useEffect, useRef, useCallback } from 'react';
import type { VoiceState, VoiceCommand } from '../types/voice-types';
import {
  voiceStateReducer,
  INITIAL_VOICE_STATE,
  LISTENING_DURATION,
} from './voice-state-reducer';
import {
  startRecognition,
  abortRecognition,
} from '../services/speech-recognition';
import {
  speakReady,
  speakRoger,
  speakScore,
  stopSpeaking,
} from '../services/speech-synthesis';
import { parseCommand, isWakeword } from '../services/command-parser';
import { useScore } from '../../score/hooks/use-score';
import { useSettings } from '../../settings/hooks/use-settings';
import { log, warn } from '../../../utils/logger';

// =================================================================
// 公開インターフェース
// =================================================================

/**
 * 【目的】useVoiceStateMachine hook の戻り値の型定義
 * 【根拠】design.md の Contract に準拠。
 *        state と countdown は UI（ListeningOverlay 等）が参照する。
 *        start/stop は外部からの制御用。
 */
export interface UseVoiceStateMachineReturn {
  readonly state: VoiceState;
  readonly countdown: number;
  start(): void;
  stop(): void;
}

// =================================================================
// hook 本体
// =================================================================

/**
 * 【目的】K.I.T.T.スタイル音声状態マシンを提供するカスタム hook
 * 【根拠】IDLE → SPEAKING_READY → LISTENING → SPEAKING_ROGER → EXECUTING
 *        → SPEAKING_SCORE → IDLE の状態遷移を管理し、各状態で適切なサービスを呼び出す。
 *        音声認識と読み上げの排他制御を状態マシンレベルで保証する。
 */
export function useVoiceStateMachine(): UseVoiceStateMachineReturn {
  const [voiceState, rawDispatch] = useReducer(
    voiceStateReducer,
    INITIAL_VOICE_STATE
  );

  // 【目的】全アクションをログ付きで dispatch する
  const dispatch: typeof rawDispatch = useCallback((action) => {
    const detail = 'command' in action ? ` cmd=${action.command}` : '';
    log('SM', `dispatch: ${action.type}${detail}`);
    rawDispatch(action);
  }, []);
  const { incrementScore, rollback, reset, leftScore, rightScore } =
    useScore();
  const { isVoiceRecognitionEnabled, isSpeechEnabled } = useSettings();

  // 【目的】タイマー ID の保持（クリーンアップ用）
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // 【目的】マウント状態の追跡（アンマウント後の dispatch 防止）
  const isMountedRef = useRef(true);

  // 【目的】pendingCommand を副作用で参照するための ref
  // 【根拠】useEffect のコールバック内で最新の pendingCommand を参照するため。
  //        useEffect の依存配列に voiceState.pendingCommand を含めると、
  //        pendingCommand の変化だけで副作用が再実行されてしまう。
  const pendingCommandRef = useRef<VoiceCommand | null>(null);
  pendingCommandRef.current = voiceState.pendingCommand;

  // 【目的】最新のスコアを読み上げ時に参照するための ref
  // 【根拠】SPEAKING_SCORE 状態に入った時点のスコアを読み上げるため。
  //        useEffect の依存配列に leftScore/rightScore を含めない。
  const scoreRef = useRef({ leftScore: 0, rightScore: 0 });
  scoreRef.current = { leftScore, rightScore };

  // 【目的】isSpeechEnabled を副作用内で最新値を参照するための ref
  // 【根拠】SPEAKING_* 状態に入った時点の設定値で読み上げの有無を判断する。
  //        useEffect の依存配列に含めると、設定変更のたびに副作用が再実行される。
  const isSpeechEnabledRef = useRef(isSpeechEnabled);
  isSpeechEnabledRef.current = isSpeechEnabled;

  // =================================================================
  // タイマーヘルパー
  // =================================================================

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // =================================================================
  // クリーンアップ
  // =================================================================

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearCountdownTimer();
      abortRecognition();
      stopSpeaking();
    };
  }, [clearCountdownTimer]);

  // =================================================================
  // 内部関数
  // =================================================================

  /**
   * 【目的】ウェイクワード認識（wakeword モード）を開始する
   * 【根拠】IDLE 状態で常時リスニングし、「スコア」を検知したら
   *        WAKEWORD_DETECTED を dispatch して SPEAKING_READY に遷移する。
   *        isFinal のみでウェイクワード検知とする理由:
   *        interim result で「スコア」が検知されても、最終結果で別の単語に
   *        確定する可能性があるため。
   */
  function startWakewordListening(): void {
    startRecognition({
      mode: 'wakeword',
      lang: 'ja-JP',
      onResult: (transcript: string, isFinal: boolean) => {
        if (isFinal) {
          const matched = isWakeword(transcript);
          log('SM', `wakeword result: "${transcript}" matched=${matched}`);
          if (matched && isMountedRef.current) {
            dispatch({ type: 'WAKEWORD_DETECTED' });
          }
        }
      },
      onEnd: () => {
        // 【根拠】wakeword モードの end は自動再起動ループで処理される
        //        （speech-recognition サービス内部で再起動するため、ここでは何もしない）
      },
      onError: (err: string) => {
        warn('SM', `wakeword recognition error: ${err}`);
      },
    });
  }

  /**
   * 【目的】コマンド認識（command モード）を開始する
   * 【根拠】LISTENING 状態でコマンド語彙（右/左/ロールバック/リセット）を認識し、
   *        検出したら COMMAND_DETECTED を dispatch して SPEAKING_ROGER に遷移する。
   */
  function startCommandListening(): void {
    startRecognition({
      mode: 'command',
      lang: 'ja-JP',
      onResult: (transcript: string, isFinal: boolean) => {
        if (!isFinal || !isMountedRef.current) return;
        const command = parseCommand(transcript);
        log('SM', `command result: "${transcript}" parsed=${command ?? 'null'}`);
        if (command) {
          dispatch({ type: 'COMMAND_DETECTED', command });
        }
      },
      onEnd: () => {
        // 【根拠】command モードの end は認識エンジンの自然終了。
        //        タイムアウトタイマーが別途管理しているため、ここでは何もしない。
      },
      onError: (err: string) => {
        warn('SM', `command recognition error: ${err}`);
      },
    });
  }

  /**
   * 【目的】LISTENING 状態の 3 秒カウントダウンタイマーを開始する
   * 【根拠】1 秒間隔で COUNTDOWN_TICK を dispatch し、
   *        3 秒経過で LISTENING_TIMEOUT を dispatch して IDLE に戻る。
   */
  function startCountdownTimer(): void {
    clearCountdownTimer();
    let remaining = LISTENING_DURATION;
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearCountdownTimer();
        log('SM', 'countdown timeout');
        if (isMountedRef.current) {
          dispatch({ type: 'LISTENING_TIMEOUT' });
        }
      } else {
        if (isMountedRef.current) {
          dispatch({ type: 'COUNTDOWN_TICK' });
        }
      }
    }, 1000);
  }

  /**
   * 【目的】pendingCommand に基づいてスコア操作を実行する
   * 【根拠】right/left は得点加算のみ（COMMAND_EXECUTED → IDLE）。
   *        rollback/reset はスコア読み上げが必要（COMMAND_EXECUTED_WITH_SCORE → SPEAKING_SCORE）。
   */
  function executeCommand(): void {
    const command = pendingCommandRef.current;
    if (!command) {
      warn('SM', 'executeCommand: no pendingCommand, returning to IDLE');
      dispatch({ type: 'COMMAND_EXECUTED' });
      return;
    }

    log('SM', `executeCommand: ${command}`);
    switch (command) {
      case 'right':
        incrementScore('right');
        dispatch({ type: 'COMMAND_EXECUTED' });
        break;
      case 'left':
        incrementScore('left');
        dispatch({ type: 'COMMAND_EXECUTED' });
        break;
      case 'rollback':
        rollback();
        dispatch({ type: 'COMMAND_EXECUTED_WITH_SCORE' });
        break;
      case 'reset':
        reset();
        dispatch({ type: 'COMMAND_EXECUTED_WITH_SCORE' });
        break;
    }
  }

  // =================================================================
  // 状態遷移に連動する副作用
  // =================================================================

  /**
   * 【目的】voiceState.state が変わるたびに適切なサービスを呼び出す
   * 【根拠】依存配列は [voiceState.state] のみ。countdown の変化では
   *        副作用を再実行しない（COUNTDOWN_TICK のたびに認識が再起動されるバグを防ぐ）。
   *        読み上げ OFF 時は speakXxx を呼ばず、即座に完了アクションを dispatch する。
   */
  useEffect(() => {
    switch (voiceState.state) {
      case 'IDLE':
        // 【目的】ウェイクワード認識を開始（isVoiceRecognitionEnabled の場合のみ）
        log('SM', `entering IDLE, voiceRecognition=${isVoiceRecognitionEnabled}`);
        clearCountdownTimer();
        if (isVoiceRecognitionEnabled) {
          startWakewordListening();
        }
        break;

      case 'SPEAKING_READY':
        // 【目的】認識を停止し、Ready を読み上げ
        log('SM', `entering SPEAKING_READY, speech=${isSpeechEnabledRef.current}`);
        abortRecognition();
        if (isSpeechEnabledRef.current) {
          speakReady(() => {
            if (isMountedRef.current) {
              dispatch({ type: 'SPEECH_READY_DONE' });
            }
          });
        } else {
          // 【根拠】読み上げ OFF 時は即座に次の状態へ遷移
          dispatch({ type: 'SPEECH_READY_DONE' });
        }
        break;

      case 'LISTENING':
        // 【目的】コマンド認識を開始 + カウントダウンタイマー開始
        log('SM', 'entering LISTENING, starting command + countdown');
        startCommandListening();
        startCountdownTimer();
        break;

      case 'SPEAKING_ROGER':
        // 【目的】認識を停止し、Roger を読み上げ
        log('SM', `entering SPEAKING_ROGER, pendingCommand=${voiceState.pendingCommand}, speech=${isSpeechEnabledRef.current}`);
        abortRecognition();
        clearCountdownTimer();
        if (isSpeechEnabledRef.current) {
          speakRoger(() => {
            if (isMountedRef.current) {
              dispatch({ type: 'SPEECH_ROGER_DONE' });
            }
          });
        } else {
          dispatch({ type: 'SPEECH_ROGER_DONE' });
        }
        break;

      case 'EXECUTING':
        // 【目的】pendingCommand に基づいてスコア操作を実行
        log('SM', `entering EXECUTING, pendingCommand=${voiceState.pendingCommand}`);
        executeCommand();
        break;

      case 'SPEAKING_SCORE': {
        // 【目的】現在のスコアを読み上げ
        const { leftScore: l, rightScore: r } = scoreRef.current;
        log('SM', `entering SPEAKING_SCORE, score=${l}-${r}, speech=${isSpeechEnabledRef.current}`);
        if (isSpeechEnabledRef.current) {
          speakScore(l, r, () => {
            if (isMountedRef.current) {
              dispatch({ type: 'SPEECH_SCORE_DONE' });
            }
          });
        } else {
          dispatch({ type: 'SPEECH_SCORE_DONE' });
        }
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState.state]);

  // =================================================================
  // 設定変更への反応
  // =================================================================

  /**
   * 【目的】isVoiceRecognitionEnabled の変更に反応する
   * 【根拠】OFF になったら即座に STOP。ON になったら IDLE 状態で認識を開始。
   */
  useEffect(() => {
    if (!isVoiceRecognitionEnabled && voiceState.state !== 'IDLE') {
      log('SM', `voiceRecognition toggled OFF in state=${voiceState.state}, dispatching STOP`);
      dispatch({ type: 'STOP' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoiceRecognitionEnabled]);

  // =================================================================
  // public API
  // =================================================================

  const start = useCallback(() => {
    if (isVoiceRecognitionEnabled) {
      startWakewordListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoiceRecognitionEnabled]);

  const stop = useCallback(() => {
    log('SM', 'stop() called, cleaning up all services');
    clearCountdownTimer();
    abortRecognition();
    stopSpeaking();
    dispatch({ type: 'STOP' });
  }, [clearCountdownTimer, dispatch]);

  return {
    state: voiceState.state,
    countdown: voiceState.countdown,
    start,
    stop,
  };
}
