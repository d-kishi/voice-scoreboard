/**
 * 【目的】expo-speech-recognition のラッパーサービス。音声認識の開始/停止/結果取得を提供する
 * 【根拠】ネイティブモジュールを直接使用せず、ラッパーを介することで:
 *        - wakeword / command 2つのモードを統一的に扱える
 *        - wakeword モードの continuous セッションを管理できる
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
  /** 【目的】認識結果のコールバック。allTranscripts は maxAlternatives による全候補 */
  readonly onResult: (transcript: string, isFinal: boolean, allTranscripts?: string[]) => void;
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
/**
 * 【目的】コマンドモードで認識精度を向上させるための語彙リスト（ひらがなエイリアス含む）
 * 【根拠】音声認識エンジンがひらがなで返すケースにも対応するため、
 *        漢字/カタカナとひらがなの両方を contextualStrings に含める。
 */
const COMMAND_VOCABULARY = [
  '右', '左', 'ロールバック', 'リセット',
  'みぎ', 'みぎー', 'ひだり', 'ひだりー',
  'ろーるばっく', 'りせっと',
] as const;

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

/** 【目的】現在のオプション（コールバック呼び出しで参照するため保持） */
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
 *        wakeword モードでは continuous: true でセッションを維持し、
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
  // 【根拠】maxAlternatives で取得した全候補を allTranscripts として渡す。
  //        第1候補が不一致でも後続候補でコマンド/ウェイクワードを検知できる。
  addManagedListener('result', (data: unknown) => {
    const event = data as {
      results: Array<{ transcript: string }>;
      isFinal: boolean;
    };
    const allTranscripts = event.results.map((r) => r.transcript);
    const transcript = allTranscripts[0] ?? '';
    log('SR', `result: transcript="${transcript}" isFinal=${event.isFinal} alternatives=${allTranscripts.length}`);
    currentOptions?.onResult(transcript, event.isFinal, allTranscripts);
  });

  // 【目的】認識終了のイベントリスナー
  // 【根拠】continuous: true ではセッションが維持されるため、end は stop/abort/エラーによる
  //        セッション終了時のみ発火する。全モード共通で onEnd を通知する。
  addManagedListener('end', () => {
    log('SR', `end: mode=${currentOptions?.mode ?? 'null'}, isRunning=${isRunning}, notifying onEnd`);
    removeAllSubscriptions();
    currentOptions?.onEnd();
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
 *        wakeword: continuous: true（セッション維持）, command: continuous: false（単発認識）
 *        command 固有: contextualStrings, androidIntentOptions
 */
function buildStartOptions(
  options: SpeechRecognitionOptions
): Record<string, unknown> {
  const baseOptions: Record<string, unknown> = {
    lang: options.lang,
    interimResults: true,
    continuous: options.mode === 'wakeword',
    // 【目的】複数候補を取得して認識精度を向上させる
    // 【根拠】第1候補が不一致でも第2候補以降にコマンドが含まれる可能性を拾う
    maxAlternatives: 5,
  };

  // 【目的】短い単語の認識精度を向上させる（全モード共通）
  // 【根拠】デフォルトの free_form モデルは自由発話向けだが、
  //        ウェイクワード（「スコア」）もコマンド（「右」「左」等）も短い単語のため
  //        web_search モデルの方が適している。
  //        Google 開発チームが単一ワード認識に web_search を推奨している。
  baseOptions.androidIntentOptions = {
    EXTRA_LANGUAGE_MODEL: 'web_search',
  };

  if (options.mode === 'wakeword') {
    // 【目的】ウェイクワード「スコア」の認識精度を向上させる
    // 【根拠】contextualStrings に指定することで認識エンジンが優先マッチングする
    // 【目的】伸ばしバリエーションも含めて認識精度を向上させる
    // 【根拠】遠距離からの発話で「スコアー」と伸ばすケースに対応する
    baseOptions.contextualStrings = ['スコア', 'スコアー', 'すこあ', 'すこあー'];
  }

  if (options.mode === 'command') {
    baseOptions.contextualStrings = [...COMMAND_VOCABULARY];
    (baseOptions.androidIntentOptions as Record<string, unknown>).EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS =
      ANDROID_SILENCE_TIMEOUT_MS;
  }

  return baseOptions;
}

/**
 * 【目的】音声認識を停止する（最終結果を処理してから停止）
 * 【根拠】stop() は isRunning を false にし、
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
 * 【根拠】abort() は isRunning を false にし、リスナーを解除してから
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
