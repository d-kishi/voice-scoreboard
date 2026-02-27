/**
 * 【目的】K.I.T.T.スタイル音声状態マシンのオーケストレーション hook
 * 【根拠】design.md の useVoiceStateMachine Contract に準拠。
 *        reducer（純粋な状態遷移）と useEffect（副作用）の分離パターンを採用。
 *        reducer は voiceStateReducer に委譲し、useEffect で状態変化に応じた
 *        サービス呼び出し（音声認識・読み上げ）を実行する。
 *
 *        なぜ useReducer + useEffect を採用するか:
 *        - 状態遷移が 5 つの状態を持つ有限オートマトンであり、
 *          useReducer の「現在の状態 + アクション -> 次の状態」が自然に適合する
 *        - reducer は純粋関数として単体テスト可能
 *        - 副作用を useEffect に分離することで責務が明確になる
 *
 *        Task 8.2: SPEAKING_READY 状態を廃止。WAKEWORD_DETECTED → 直接 LISTENING に遷移し、
 *        speakReady() は fire-and-forget で呼び出す（完了を待たない）。
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
import {
  parseCommand,
  parseCommandFromAlternatives,
  isWakeword,
  isWakewordInAlternatives,
} from '../services/command-parser';
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
 * 【根拠】IDLE → LISTENING → SPEAKING_ROGER → EXECUTING → SPEAKING_SCORE → IDLE
 *        の 5 状態遷移を管理し、各状態で適切なサービスを呼び出す。
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

  // 【目的】isVoiceRecognitionEnabled を onEnd コールバック内で最新値を参照するための ref
  // 【根拠】onEnd コールバックはクロージャで古い値をキャプチャするため、
  //        ref 経由で最新の設定値を参照する必要がある。
  const isVoiceRecognitionEnabledRef = useRef(isVoiceRecognitionEnabled);
  isVoiceRecognitionEnabledRef.current = isVoiceRecognitionEnabled;

  // 【目的】voiceState.state を onEnd コールバック内で最新値を参照するための ref
  // 【根拠】意図的な abort（LISTENING 遷移時等）後の end イベントで
  //        ローグセッションが再開始されるのを防ぐため。
  const voiceStateRef = useRef(voiceState.state);
  voiceStateRef.current = voiceState.state;

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
   *        WAKEWORD_DETECTED を dispatch して LISTENING に直接遷移する。
   *        isFinal のみでウェイクワード検知とする理由:
   *        interim result で「スコア」が検知されても、最終結果で別の単語に
   *        確定する可能性があるため。
   */
  function startWakewordListening(): void {
    startRecognition({
      mode: 'wakeword',
      lang: 'ja-JP',
      onResult: (transcript: string, isFinal: boolean, allTranscripts?: string[]) => {
        if (isFinal) {
          // 【目的】複数候補があれば全候補を走査し、なければ第1候補のみで判定
          const matched = allTranscripts
            ? isWakewordInAlternatives(allTranscripts)
            : isWakeword(transcript);
          log('SM', `wakeword result: "${transcript}" matched=${matched} alternatives=${allTranscripts?.length ?? 1}`);
          if (matched && isMountedRef.current) {
            dispatch({ type: 'WAKEWORD_DETECTED' });
          }
        }
      },
      onEnd: () => {
        // 【根拠】continuous: true でもエラー等でセッションが終了する場合がある。
        //        IDLE 状態かつ音声認識有効な場合のみ再開始する（エラーリカバリ）。
        //        IDLE 以外（LISTENING 等）で end が来た場合は意図的な abort なので
        //        再開始しない（ローグセッション防止）。
        //        ref 経由で最新値を参照し、stale クロージャ問題を回避する。
        log('SM', `wakeword session ended, state=${voiceStateRef.current}`);
        if (
          isMountedRef.current &&
          isVoiceRecognitionEnabledRef.current &&
          voiceStateRef.current === 'IDLE'
        ) {
          log('SM', 'restarting wakeword listening (error recovery)');
          startWakewordListening();
        }
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
   *        interim result（isFinal=false）でもコマンドを処理する理由:
   *        Android SpeechRecognizer は短い単語（「右」「左」）に対して
   *        isFinal=true を返さないことがあり、タイムアウトまで検知不能になるため。
   *        wakeword とは異なり、コマンドは限定語彙の includes マッチなので
   *        interim でも誤検知リスクは極めて低い。
   */
  function startCommandListening(): void {
    startRecognition({
      mode: 'command',
      lang: 'ja-JP',
      onResult: (transcript: string, isFinal: boolean, allTranscripts?: string[]) => {
        if (!isMountedRef.current) return;
        // 【目的】複数候補があれば全候補を走査し、なければ第1候補のみで判定
        const command = allTranscripts
          ? parseCommandFromAlternatives(allTranscripts)
          : parseCommand(transcript);
        if (command) {
          log('SM', `command result: "${transcript}" isFinal=${isFinal} parsed=${command} alternatives=${allTranscripts?.length ?? 1}`);
          dispatch({ type: 'COMMAND_DETECTED', command });
        }
      },
      onEnd: () => {
        // 【根拠】Task 8.2: TTS "Ready" が Audio Focus を奪って command セッションが
        //        終了する場合がある。LISTENING 状態なら再開始する（リカバリ）。
        //        SPEAKING_ROGER 等に遷移済みなら意図的な終了なので再開始しない。
        if (isMountedRef.current && voiceStateRef.current === 'LISTENING') {
          log('SM', 'command session ended during LISTENING, restarting (audio focus recovery)');
          startCommandListening();
        }
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
   * 【根拠】全コマンドで COMMAND_EXECUTED_WITH_SCORE を dispatch し、
   *        SPEAKING_SCORE 状態でスコア読み上げを行う（Req 6.3 変更対応）。
   */
  function executeCommand(): void {
    const command = pendingCommandRef.current;
    if (!command) {
      warn('SM', 'executeCommand: no pendingCommand, returning to IDLE');
      dispatch({ type: 'COMMAND_EXECUTED_WITH_SCORE' });
      return;
    }

    log('SM', `executeCommand: ${command}`);
    switch (command) {
      case 'right':
        incrementScore('right');
        break;
      case 'left':
        incrementScore('left');
        break;
      case 'rollback':
        rollback();
        break;
      case 'reset':
        reset();
        break;
    }
    dispatch({ type: 'COMMAND_EXECUTED_WITH_SCORE' });
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

      case 'LISTENING':
        // 【目的】wakeword セッション停止 + コマンド認識開始 + カウントダウン + Ready TTS fire-and-forget
        // 【根拠】Task 8.2: SPEAKING_READY を廃止し、WAKEWORD_DETECTED → 直接 LISTENING に遷移。
        //        Ready TTS は isSpeechEnabled に関係なく常に再生する（Req 8.4）。
        //        完了を待たずにコマンド認識を即時開始する（fire-and-forget）。
        log('SM', 'entering LISTENING, aborting wakeword + starting command + countdown + ready TTS');
        abortRecognition();
        startCommandListening();
        startCountdownTimer();
        speakReady(() => {
          log('SM', 'Ready TTS finished (fire-and-forget)');
        });
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
   * 【根拠】OFF になったら認識を停止し IDLE に戻す。ON になったら wakeword 認識を開始。
   *        なぜ voiceState.state !== 'IDLE' ガードを外したか:
   *        IDLE 状態でも wakeword の continuous セッションが動作しているため、
   *        OFF 時は状態に関係なく abortRecognition() で停止する必要がある。
   */
  useEffect(() => {
    if (!isVoiceRecognitionEnabled) {
      log('SM', `voiceRecognition toggled OFF in state=${voiceState.state}, aborting recognition`);
      abortRecognition();
      clearCountdownTimer();
      if (voiceState.state !== 'IDLE') {
        dispatch({ type: 'STOP' });
      }
    } else if (voiceState.state === 'IDLE') {
      // 【目的】ON に戻った時、IDLE 状態なら wakeword 認識を再開
      log('SM', 'voiceRecognition toggled ON in IDLE, starting wakeword listening');
      startWakewordListening();
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
