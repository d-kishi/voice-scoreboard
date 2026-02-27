/**
 * 【目的】音声認識結果のテキストからコマンドとウェイクワードを解析する純粋関数群
 * 【根拠】コマンド解析ロジックを独立したモジュールに分離することで:
 *        - 純粋関数として単体テストが容易になる
 *        - 将来のロケール追加や語彙拡張に対応しやすくなる
 *        - 状態マシン hook（useVoiceStateMachine）から参照する
 */

import type { VoiceCommand } from '../types/voice-types';
import { log } from '../../../utils/logger';
import { katakanaToHiragana, removeLongVowelMark } from '../../../utils/kana-normalize';

// =================================================================
// コマンドマッピング
// =================================================================

/**
 * 【目的】日本語のコマンド語彙と VoiceCommand のマッピング（ひらがなエイリアス付き）
 * 【根拠】音声認識エンジンが漢字/カタカナ/ひらがなのいずれで返すか一貫性がないため、
 *        ひらがなエイリアスを追加して検知率を向上させる。
 *        配列の順序は長い文字列を先にすることで、短い語彙への誤マッチを防ぐ。
 */
const COMMAND_MAP: ReadonlyArray<{
  readonly keyword: string;
  readonly command: VoiceCommand;
}> = [
  { keyword: 'ロールバック', command: 'rollback' },
  { keyword: 'ろーるばっく', command: 'rollback' },
  { keyword: 'リセット', command: 'reset' },
  { keyword: 'りせっと', command: 'reset' },
  { keyword: '右', command: 'right' },
  { keyword: 'みぎ', command: 'right' },
  { keyword: '左', command: 'left' },
  { keyword: 'ひだり', command: 'left' },
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
  // 【目的】カタカナ→ひらがな正規化で「ミギ」「ヒダリ」等にも対応する
  const normalized = katakanaToHiragana(transcript);

  // 【第一優先】既存 includes マッチング
  for (const { keyword, command } of COMMAND_MAP) {
    if (transcript.includes(keyword) || normalized.includes(keyword)) {
      log('CMD', `parseCommand("${transcript}") = ${command}`);
      return command;
    }
  }

  // 【フォールバック】長音記号除去マッチング
  // 【根拠】認識エンジンが「スコーア」「みぎー」のように長音記号を挿入/付加する
  //        ケースに対応する。第一優先で不一致の場合のみ実行し、誤マッチを最小化する。
  const strippedTranscript = removeLongVowelMark(transcript);
  const strippedNormalized = removeLongVowelMark(normalized);
  for (const { keyword, command } of COMMAND_MAP) {
    const strippedKeyword = removeLongVowelMark(keyword);
    if (strippedTranscript.includes(strippedKeyword) || strippedNormalized.includes(strippedKeyword)) {
      log('CMD', `parseCommand("${transcript}") = ${command} (long-vowel fallback)`);
      return command;
    }
  }

  log('CMD', `parseCommand("${transcript}") = null`);
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
  // 【目的】カタカナ→ひらがな正規化で「すこあ」にも対応する
  const normalized = katakanaToHiragana(transcript);

  // 【第一優先】既存マッチング
  if (transcript.includes('スコア') || normalized.includes('すこあ')) {
    log('CMD', `isWakeword("${transcript}") = true`);
    return true;
  }

  // 【フォールバック】長音記号除去マッチング
  // 【根拠】「スコーア」のように中間に長音記号が挿入されたケースに対応する
  const stripped = removeLongVowelMark(normalized);
  const result = stripped.includes('すこあ');
  log('CMD', `isWakeword("${transcript}") = ${result}${result ? ' (long-vowel fallback)' : ''}`);
  return result;
}

/**
 * 【目的】複数候補（maxAlternatives）からコマンドを走査する
 * 【根拠】第1候補が不一致でも第2候補以降にコマンドが含まれる可能性を拾う。
 *        各候補に対して parseCommand を順に適用し、最初にマッチしたものを返す。
 * @param transcripts maxAlternatives による全候補の配列
 * @returns 検出されたコマンド、または null（全候補不一致）
 */
export function parseCommandFromAlternatives(transcripts: string[]): VoiceCommand | null {
  for (const transcript of transcripts) {
    const command = parseCommand(transcript);
    if (command) return command;
  }
  return null;
}

/**
 * 【目的】複数候補（maxAlternatives）からウェイクワードを走査する
 * 【根拠】第1候補が不一致でも後続候補にウェイクワードが含まれる可能性を拾う。
 * @param transcripts maxAlternatives による全候補の配列
 * @returns いずれかの候補にウェイクワードが含まれていれば true
 */
export function isWakewordInAlternatives(transcripts: string[]): boolean {
  return transcripts.some((t) => isWakeword(t));
}
