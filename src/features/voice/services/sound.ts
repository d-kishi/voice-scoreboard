/**
 * 【目的】expo-av のラッパーサービス。効果音（ホイッスル音）のプリロードと再生を提供する
 * 【根拠】ネイティブモジュールを直接使用せず、ラッパーを介することで:
 *        - 音声ファイルのプリロードとキャッシュをカプセル化できる
 *        - 再生完了の Promise ベース API を提供できる
 *        - エラー時の Graceful Degradation（音なしで続行）を統一的に扱える
 *        - テスト時にモック差し替えが容易になる
 *        Contract: SoundService Service（design.md 参照）
 *        Requirements: 6.6 — 試合終了時にホイッスル音を5秒間再生する
 */

import { Audio } from 'expo-av';

// =================================================================
// 型定義
// =================================================================

/**
 * 【目的】再生可能な効果音の種類
 * 【根拠】現時点では whistle のみ。将来の効果音追加に備えて型で管理する
 */
export type SoundType = 'whistle';

// =================================================================
// 効果音アセットのマッピング
// =================================================================

/**
 * 【目的】SoundType と実際のアセットファイルの対応表
 * 【根拠】require() はトップレベルで静的に解決する必要があるため、
 *        動的パスではなくマッピングオブジェクトで管理する
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SOUND_ASSETS: Record<SoundType, number> = {
  whistle: require('../../../../assets/sounds/whistle.wav'),
};

// =================================================================
// モジュールレベル状態
// =================================================================

/**
 * 【目的】プリロード済みの Sound インスタンスを保持するキャッシュ
 * 【根拠】プリロードした Sound を play() で再利用する。
 *        null の場合はプリロード未実行またはプリロード失敗
 */
let soundCache: Record<SoundType, Audio.Sound | null> = {
  whistle: null,
};

/** 【目的】プリロードが実行済みかどうかのフラグ（失敗した場合も true） */
let isPreloaded = false;

// =================================================================
// パブリック API
// =================================================================

/**
 * 【目的】効果音アセットをプリロードする
 * 【根拠】アプリ起動時にサウンドアセットを事前ロードすることで、
 *        試合終了時の再生を遅延なく開始できる。
 *        ロード失敗時はエラーログを出力し、例外をスローしない（Graceful Degradation）。
 *        design.md「効果音ファイル読み込み失敗 → エラーログ出力、音なしで続行」に準拠。
 */
export async function preload(): Promise<void> {
  if (isPreloaded) return;
  isPreloaded = true;

  try {
    const { sound } = await Audio.Sound.createAsync(SOUND_ASSETS.whistle);
    soundCache.whistle = sound;
  } catch (error) {
    console.warn('[SoundService] Failed to preload whistle sound:', error);
    soundCache.whistle = null;
  }
}

/**
 * 【目的】指定した効果音を再生し、再生完了まで待つ
 * 【根拠】Promise を返すことで、呼び出し元（状態マシン等）が
 *        再生完了を await して次の処理に遷移できる。
 *        プリロード未実行の場合は自動的にプリロードを行う（堅牢性）。
 *        Sound インスタンスが null（ロード失敗）の場合は何もせず即座に解決する。
 *
 * @param type 再生する効果音の種類
 * @returns 再生完了時に解決する Promise
 */
export async function play(type: SoundType): Promise<void> {
  // 【目的】プリロード未実行なら自動プリロード
  if (!isPreloaded) {
    await preload();
  }

  const sound = soundCache[type];

  // 【目的】Sound が取得できなかった場合は音なしで続行
  if (!sound) return;

  return new Promise<void>((resolve) => {
    // 【目的】再生完了を didJustFinish で検知する
    // 【根拠】setOnPlaybackStatusUpdate は再生中に複数回呼ばれるが、
    //        didJustFinish: true は再生が最後まで到達した時に1回だけ発火する
    sound.setOnPlaybackStatusUpdate((status: { didJustFinish?: boolean }) => {
      if (status.didJustFinish) {
        // 【目的】リスナーを解除し、再生位置を先頭に戻す
        sound.setOnPlaybackStatusUpdate(null);
        sound.stopAsync().then(() => resolve());
      }
    });

    sound.playAsync();
  });
}

// =================================================================
// テスト用ヘルパー
// =================================================================

/**
 * 【目的】テスト用: モジュールレベル状態をリセットする
 * 【根拠】Jest はモジュールを1回だけロードするため、テスト間の状態リークを防ぐ。
 *        jest.isolateModules() はモック設定が複雑になるため、明示的リセット関数を採用。
 *        プロダクションコードからは呼び出さない。
 */
export function _resetForTesting(): void {
  soundCache = { whistle: null };
  isPreloaded = false;
}
