/**
 * 【目的】音声状態マシンの共通型定義
 * 【根拠】design.md の useVoiceStateMachine Contract に準拠。
 *        VoiceState と VoiceCommand は reducer, hook, UI コンポーネント
 *        （Task 7.1 の ListeningOverlay 等）で横断的に使用される共通型。
 */

/**
 * 【目的】音声状態マシンの状態を定義する
 * 【根拠】6 つの状態で音声認識と読み上げの排他制御を状態マシンレベルで保証する。
 *        SPEAKING_* 状態では音声認識を停止し、読み上げ完了後に次の状態に遷移する。
 */
export type VoiceState =
  | 'IDLE'
  | 'SPEAKING_READY'
  | 'LISTENING'
  | 'SPEAKING_ROGER'
  | 'EXECUTING'
  | 'SPEAKING_SCORE';

/**
 * 【目的】音声コマンドの種類を定義する
 * 【根拠】Requirements 5.1-5.4 の 4 つのコマンドに対応。
 *        日本語テキストからの変換は command-parser.ts が担当する。
 */
export type VoiceCommand = 'right' | 'left' | 'rollback' | 'reset';
