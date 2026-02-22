/**
 * 【目的】音声認識結果のテキストからコマンドとウェイクワードを解析する純粋関数群
 * 【根拠】コマンド解析ロジックを独立したモジュールに分離することで:
 *        - 純粋関数として単体テストが容易になる
 *        - 将来のロケール追加や語彙拡張に対応しやすくなる
 *        - 状態マシン hook（useVoiceStateMachine）から参照する
 */

import type { VoiceCommand } from '../types/voice-types';

// =================================================================
// コマンドマッピング
// =================================================================

/**
 * 【目的】日本語のコマンド語彙と VoiceCommand のマッピング
 * 【根拠】配列の順序は長い文字列を先にすることで、短い語彙への誤マッチを防ぐ。
 *        現在の語彙では衝突しないが、将来の拡張に備えた設計。
 */
const COMMAND_MAP: ReadonlyArray<{
  readonly keyword: string;
  readonly command: VoiceCommand;
}> = [
  { keyword: 'ロールバック', command: 'rollback' },
  { keyword: 'リセット', command: 'reset' },
  { keyword: '右', command: 'right' },
  { keyword: '左', command: 'left' },
];

// =================================================================
// パブリック API
// =================================================================

/**
 * 【目的】音声認識結果のテキストからコマンドを解析する
 * 【根拠】部分一致（includes）を使用する理由:
 *        音声認識エンジンが「右側」「右です」のように余分な文字を付加する場合がある。
 *        完全一致では認識できないケースを救済するため。
 * @param transcript 音声認識結果のテキスト
 * @returns 検出されたコマンド、または null（該当なし）
 */
export function parseCommand(transcript: string): VoiceCommand | null {
  for (const { keyword, command } of COMMAND_MAP) {
    if (transcript.includes(keyword)) {
      return command;
    }
  }
  return null;
}

/**
 * 【目的】音声認識結果がウェイクワード「スコア」を含むかどうかを判定する
 * 【根拠】ウェイクワードも部分一致で判定する。
 *        「スコアボード」「スコアを」等の発話もウェイクワードとして認識する。
 * @param transcript 音声認識結果のテキスト
 * @returns ウェイクワードが含まれていれば true
 */
export function isWakeword(transcript: string): boolean {
  return transcript.includes('スコア');
}
