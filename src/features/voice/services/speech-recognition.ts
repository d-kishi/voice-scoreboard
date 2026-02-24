/**
 * 【目的】expo-speech-recognition のラッパーサービス。音声認識の開始/停止/結果取得を提供する
 * 【根拠】ネイティブモジュールを直接使用せず、ラッパーを介することで:
 *        - wakeword / command 2つのモードを統一的に扱える
 *        - wakeword モードの自動再起動ループをカプセル化できる
 *        - テスト時にモック差し替えが容易になる
 *        Contract: SpeechRecognitionService Service（design.md 参照）
 */

import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { log, warn } from '../../../utils/logger';

// =================================================================
// 型定義
// =================================================================

/** 【目的】認識モードの区別。wakeword はウェイクワード待機、command はコマンド認識 */
export type SpeechRecognitionMode = 'wakeword' | 'command';

/**
 * 【目的】start() に渡すオプション
 * 【根拠】コールバック形式を採用。Promise ではなくコールバックを使う理由は、
 *        認識中に部分的な結果（interimResults）も受け取れるようにするため
 */
export interface SpeechRecognitionOptions {
  readonly mode: SpeechRecognitionMode;
  readonly lang: string;
  readonly onResult: (transcript: string, isFinal: boolean) => void;
  readonly onEnd: () => void;
  readonly onError: (error: string) => void;
}

// =================================================================
// コマンドモード用の定数
// =================================================================

/**
 * 【目的】コマンドモードで認識精度を向上させるための語彙リスト
 * 【根拠】expo-speech-recognition の contextualStrings に渡すことで、
 *        認識エンジンがこれらの語彙を優先的にマッチングする
 */
const COMMAND_VOCABULARY = ['右', '左', 'ロールバック', 'リセット'] as const;

/**
 * 【目的】Android 向けの無音判定時間の延長（ミリ秒）
 * 【根拠】デフォルトの無音判定時間が短すぎると、ユーザーが発話する前に
 *        認識が終了してしまう。3000ms に延長して発話猶予を確保する
 */
const ANDROID_SILENCE_TIMEOUT_MS = 3000;

// =================================================================
// モジュールレベル状態
// =================================================================

/** 【目的】現在の認識セッションが動作中かどうかを示すフラグ */
let isRunning = false;

/** 【目的】現在のオプション（再起動ループで参照するため保持） */
let currentOptions: SpeechRecognitionOptions | null = null;

/** 【目的】登録済みリスナーの Subscription（クリーンアップ用） */
let subscriptions: Array<{ remove: () => void }> = [];

// =================================================================
// 内部ヘルパー
// =================================================================

/**
 * 【目的】登録済みのすべてのイベントリスナーを解除する
 * 【根拠】新しい start() や abort() の前に前のリスナーをクリーンアップし、
 *        二重呼び出しを防止する
 */
function removeAllSubscriptions(): void {
  subscriptions.forEach((sub) => sub.remove());
  subscriptions = [];
}

/**
 * 【目的】イベントリスナーを登録し、subscriptions 配列に追加する
 * 【根拠】リスナーの登録と管理を一元化し、クリーンアップ漏れを防ぐ
 */
function addManagedListener(
  eventName: string,
  callback: (data: unknown) => void
): void {
  const subscription = ExpoSpeechRecognitionModule.addListener(
    eventName,
    callback
  );
  subscriptions.push(subscription);
}

// =================================================================
// パブリック API
// =================================================================

/**
 * 【目的】音声認識を開始する
 * 【根拠】モードに応じて ExpoSpeechRecognitionModule.start() のオプションを切り替える。
 *        wakeword モードでは end イベントで自動再起動ループを実行し、
 *        IDLE 状態での常時リスニングを実現する。
 *        command モードでは contextualStrings でコマンド語彙の認識精度を向上させる。
 *
 * @param options 認識モードとコールバックを含むオプション
 */
export function startRecognition(options: SpeechRecognitionOptions): void {
  // 【目的】前のセッションのリスナーをクリーンアップ
  removeAllSubscriptions();

  isRunning = true;
  currentOptions = options;
  log('SR', `startRecognition mode=${options.mode} lang=${options.lang}`);

  // 【目的】認識結果のイベントリスナー
  addManagedListener('result', (data: unknown) => {
    const event = data as {
      results: Array<{ transcript: string }>;
      isFinal: boolean;
    };
    const transcript = event.results[0]?.transcript ?? '';
    log('SR', `result: transcript="${transcript}" isFinal=${event.isFinal}`);
    currentOptions?.onResult(transcript, event.isFinal);
  });

  // 【目的】認識終了のイベントリスナー
  // 【根拠】wakeword モードでは再起動ループを実行し、command モードでは onEnd を通知する
  addManagedListener('end', () => {
    if (isRunning && currentOptions?.mode === 'wakeword') {
      // 【目的】wakeword モードの自動再起動。onEnd は通知しない
      log('SR', 'end: wakeword mode, restarting');
      ExpoSpeechRecognitionModule.start(buildStartOptions(currentOptions));
    } else {
      // 【目的】command モード、または stop/abort 後の終了通知
      log('SR', `end: mode=${currentOptions?.mode ?? 'null'}, notifying onEnd`);
      removeAllSubscriptions();
      currentOptions?.onEnd();
    }
  });

  // 【目的】エラーのイベントリスナー
  addManagedListener('error', (data: unknown) => {
    const event = data as { error: string; message: string };
    warn('SR', `error: code=${event.error} message=${event.message}`);
    currentOptions?.onError(event.error);
  });

  // 【目的】認識を開始
  ExpoSpeechRecognitionModule.start(buildStartOptions(options));
}

/**
 * 【目的】モードに応じた start() オプションを構築する
 * 【根拠】wakeword モードと command モードで異なる設定を適用する。
 *        共通設定: lang, interimResults: true, continuous: false
 *        command 固有: contextualStrings, androidIntentOptions
 */
function buildStartOptions(
  options: SpeechRecognitionOptions
): Record<string, unknown> {
  const baseOptions: Record<string, unknown> = {
    lang: options.lang,
    interimResults: true,
    continuous: false,
  };

  if (options.mode === 'command') {
    baseOptions.contextualStrings = [...COMMAND_VOCABULARY];
    baseOptions.androidIntentOptions = {
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS:
        ANDROID_SILENCE_TIMEOUT_MS,
    };
  }

  return baseOptions;
}

/**
 * 【目的】音声認識を停止する（最終結果を処理してから停止）
 * 【根拠】stop() は再起動ループフラグを false にし、
 *        ExpoSpeechRecognitionModule.stop() を呼ぶ。
 *        end イベントで onEnd が通知される。
 */
export function stopRecognition(): void {
  log('SR', 'stopRecognition');
  isRunning = false;
  ExpoSpeechRecognitionModule.stop();
}

/**
 * 【目的】音声認識を即座に中断する（最終結果なし）
 * 【根拠】abort() は再起動ループフラグを false にし、リスナーを解除してから
 *        ExpoSpeechRecognitionModule.abort() を呼ぶ。
 *        end イベントで onEnd が通知される。
 *        abort 後のイベント（result 等）は無視される。
 */
export function abortRecognition(): void {
  const hadSession = isRunning;
  log('SR', `abortRecognition (${hadSession ? 'had active session' : 'no session'})`);
  isRunning = false;

  // 【目的】abort 用の end リスナーだけを残す
  // 【根拠】abort 後に result イベントが来ても無視するため、
  //        現在のリスナーをすべて解除してから end 専用リスナーを再登録する
  const savedOptions = currentOptions;
  removeAllSubscriptions();

  addManagedListener('end', () => {
    removeAllSubscriptions();
    savedOptions?.onEnd();
  });

  ExpoSpeechRecognitionModule.abort();
}

/**
 * 【目的】音声認識エンジンが利用可能かどうかを確認する
 * 【根拠】デバイスやプラットフォームによって音声認識が利用できない場合がある。
 *        UI 層で音声機能の表示/非表示を制御するために使用する。
 */
export async function isAvailable(): Promise<boolean> {
  return ExpoSpeechRecognitionModule.isRecognitionAvailable();
}

/**
 * 【目的】マイク権限の現在の状態を確認する（ダイアログを表示しない）
 * 【根拠】既に権限が付与済みかどうかを事前チェックし、
 *        不要な requestPermissions 呼び出しを回避する。
 */
export async function checkPermissions(): Promise<boolean> {
  const result =
    await ExpoSpeechRecognitionModule.getPermissionsAsync();
  return result.granted;
}

/**
 * 【目的】マイク権限を要求し、結果を返す
 * 【根拠】音声認識にはマイク権限が必須。権限フローを簡潔に扱えるよう、
 *        granted の boolean のみを返す。
 */
export async function requestPermissions(): Promise<boolean> {
  const result =
    await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return result.granted;
}
