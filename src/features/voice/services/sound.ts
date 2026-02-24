/**
 * 【目的】expo-av のラッパーサービス。効果音（ホイッスル音）のプリロードと再生を提供する
 * 【根拠】ネイティブモジュールを直接使用せず、ラッパーを介することで:
 *        - 音声ファイルのプリロードとキャッシュをカプセル化できる
 *        - 再生完了の Promise ベース API を提供できる
 *        - エラー時の Graceful Degradation（音なしで続行）を統一的に扱える
 *        - テスト時にモック差し替えが容易になる
 *        Contract: SoundService Service（design.md 参照）
 *        Requirements: 6.6 — 試合終了時にホイッスル音を3秒間再生する
 */

import { Audio } from 'expo-av';
import { log, warn } from '../../../utils/logger';

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

/**
 * 【目的】ホイッスル音の再生上限時間（ミリ秒）
 * 【根拠】アセットファイル（whistle.wav）は5秒だが、実地検証で3秒が適切と判断。
 *        play() の maxDurationMs で指定して打ち切る。
 */
export const WHISTLE_DURATION_MS = 3000;

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
    log('SND', 'preload: whistle loaded');
  } catch (err) {
    warn('SND', `preload: whistle failed: ${err}`);
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
 * @param maxDurationMs 再生上限時間（ミリ秒）。指定すると、この時間で再生を打ち切る。
 *        アセットファイルの長さに関わらず、所望の長さで再生を止めるために使用。
 * @returns 再生完了時に解決する Promise
 */
export async function play(
  type: SoundType,
  maxDurationMs?: number
): Promise<void> {
  // 【目的】プリロード未実行なら自動プリロード
  if (!isPreloaded) {
    await preload();
  }

  const sound = soundCache[type];

  // 【目的】Sound が取得できなかった場合は音なしで続行
  if (!sound) {
    warn('SND', `play: ${type} not loaded, skipping`);
    return;
  }

  log('SND', `play: ${type}${maxDurationMs ? ` maxDuration=${maxDurationMs}ms` : ''}`);

  // 【根拠】TypeScript のクロージャ推論で sound が null と推論されるのを防ぐ。
  //        上の null ガード後なので、ここで non-null が保証されている。
  const validSound = sound;

  return new Promise<void>((resolve) => {
    let cutoffTimer: ReturnType<typeof setTimeout> | null = null;

    // 【目的】再生を停止してクリーンアップする共通関数
    function finish(): void {
      log('SND', `play done: ${type}`);
      if (cutoffTimer !== null) {
        clearTimeout(cutoffTimer);
        cutoffTimer = null;
      }
      validSound.setOnPlaybackStatusUpdate(null);
      validSound.stopAsync().then(() => resolve());
    }

    // 【目的】再生完了を didJustFinish で検知する
    // 【根拠】setOnPlaybackStatusUpdate は再生中に複数回呼ばれるが、
    //        didJustFinish: true は再生が最後まで到達した時に1回だけ発火する
    validSound.setOnPlaybackStatusUpdate(
      (status: { didJustFinish?: boolean }) => {
        if (status.didJustFinish) {
          finish();
        }
      }
    );

    // 【目的】maxDurationMs が指定された場合、タイマーで再生を打ち切る
    // 【根拠】アセットファイルが長い場合でも、所望の長さで再生を止められる
    if (maxDurationMs !== undefined) {
      cutoffTimer = setTimeout(() => {
        finish();
      }, maxDurationMs);
    }

    validSound.playAsync();
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
