/**
 * 【目的】expo-speech のラッパーサービス。音声読み上げの開始/停止/状態確認を提供する
 * 【根拠】ネイティブモジュールを直接使用せず、ラッパーを介することで:
 *        - 日本語（ja-JP）ロケールをデフォルト設定としてカプセル化できる
 *        - 定型フレーズ（Ready/Roger/スコア読み上げ）を便利関数として提供できる
 *        - テスト時にモック差し替えが容易になる
 *        Contract: SpeechSynthesisService Service（design.md 参照）
 */

import * as Speech from 'expo-speech';
import { log } from '../../../utils/logger';

// =================================================================
// 定数
// =================================================================

/**
 * 【目的】読み上げに使用する言語ロケール
 * 【根拠】日本語音声認識アプリのため ja-JP を固定で使用する
 */
const LANGUAGE = 'ja-JP';

// =================================================================
// パブリック API
// =================================================================

/**
 * 【目的】テキストを音声で読み上げる
 * 【根拠】expo-speech の Speech.speak() をラップし、言語設定と完了通知を統一する。
 *        onDone コールバックは、正常終了（onDone）と停止（onStopped）の両方で呼ばれる。
 *        これにより、上位層（状態マシン）は終了理由を区別せず次の状態に遷移できる。
 *
 * @param text 読み上げるテキスト
 * @param onDone 読み上げ完了時（停止含む）に呼ばれるコールバック
 */
export function speak(text: string, onDone: () => void): void {
  log('SS', `speak: "${text}"`);
  Speech.speak(text, {
    language: LANGUAGE,
    onDone: () => {
      log('SS', `speak done: "${text}"`);
      onDone();
    },
    onStopped: () => {
      log('SS', `speak stopped: "${text}"`);
      onDone();
    },
  });
}

/**
 * 【目的】読み上げを停止する
 * 【根拠】状態マシンが SPEAKING_* 状態から別の状態に遷移する際に、
 *        進行中の読み上げを中断するために使用する
 */
export function stopSpeaking(): void {
  log('SS', 'stopSpeaking');
  Speech.stop();
}

/**
 * 【目的】現在読み上げ中かどうかを確認する
 * 【根拠】状態マシンが読み上げの完了を待つ際や、
 *        排他制御（読み上げ中は音声認識を停止）の判定に使用する
 */
export async function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

// =================================================================
// 定型フレーズのヘルパー関数
// =================================================================

/**
 * 【目的】ウェイクワード検知時の「Ready」応答を読み上げる
 * 【根拠】Requirements 6.1: ウェイクワード検知時に「Ready」と音声で読み上げる
 *
 * @param onDone 読み上げ完了時に呼ばれるコールバック
 */
export function speakReady(onDone: () => void): void {
  speak('Ready', onDone);
}

/**
 * 【目的】コマンド検知時の「Roger」応答を読み上げる
 * 【根拠】Requirements 6.2: 音声コマンド検知時に「Roger」と音声で読み上げる
 *
 * @param onDone 読み上げ完了時に呼ばれるコールバック
 */
export function speakRoger(onDone: () => void): void {
  speak('Roger', onDone);
}

/**
 * 【目的】現在のスコアを「左{点数} 右{点数}」形式で読み上げる
 * 【根拠】Requirements 6.3: ロールバック/リセット後に現在のスコアを読み上げる。
 *        「左15 右20」のように、方向 + 点数の形式で読み上げることで、
 *        画面を見なくてもスコアを把握できる。
 *
 * @param leftScore 左チームの得点
 * @param rightScore 右チームの得点
 * @param onDone 読み上げ完了時に呼ばれるコールバック
 */
export function speakScore(
  leftScore: number,
  rightScore: number,
  onDone: () => void
): void {
  speak(`左${leftScore} 右${rightScore}`, onDone);
}
