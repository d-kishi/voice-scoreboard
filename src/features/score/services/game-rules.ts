/**
 * 【目的】6人制バレーボールの試合ルール判定を純粋関数として提供する
 * 【根拠】試合終了判定とデュース判定は副作用のない計算ロジックであり、
 *        純粋関数として実装することでテスト容易性と再利用性を確保する。
 *        ルールパラメータを外部から注入可能にし、将来の複数競技対応に備える。
 */

/**
 * 【目的】試合ルールのパラメータを定義する型
 * 【根拠】競技ごとに異なるルール（得点上限、デュース閾値、必要点差）を
 *        設定可能にするため、パラメータをオブジェクトとして型定義する。
 */
export interface GameRulesConfig {
  /** 試合終了に必要な最低得点（6人制バレー: 25） */
  readonly matchPoint: number;
  /** デュースに突入する両者の最低得点（6人制バレー: 24） */
  readonly deuceThreshold: number;
  /** 試合終了に必要な最低点差（6人制バレー: 2） */
  readonly pointGap: number;
}

/**
 * 【目的】6人制バレーボールのデフォルトルール設定
 * 【根拠】v1.0では6人制バレーボール（25点マッチ・デュース対応）のみを対象とする。
 *        呼び出し側でconfigを省略できるようデフォルト値を提供する。
 */
export const DEFAULT_GAME_RULES_CONFIG: GameRulesConfig = {
  matchPoint: 25,
  deuceThreshold: 24,
  pointGap: 2,
} as const;

/**
 * 【目的】試合終了かどうかを判定する
 * 【根拠】ビジネスルール: いずれかのチームが matchPoint 以上に到達し、
 *        かつ両チームの点差が pointGap 以上であれば試合終了。
 *        デュース中（両者 deuceThreshold 以上）は matchPoint に関係なく
 *        pointGap の差がつくまで継続する。
 *
 * @param leftScore  左チームの得点（>= 0）
 * @param rightScore 右チームの得点（>= 0）
 * @param config     試合ルール設定
 * @returns 試合が終了していれば true
 */
export function checkGameEnd(
  leftScore: number,
  rightScore: number,
  config: GameRulesConfig
): boolean {
  const maxScore = Math.max(leftScore, rightScore);
  const scoreDiff = Math.abs(leftScore - rightScore);

  return maxScore >= config.matchPoint && scoreDiff >= config.pointGap;
}

/**
 * 【目的】デュース状態かどうかを判定する
 * 【根拠】両チームが deuceThreshold 以上のスコアに達し、
 *        かつまだ pointGap の差がついていない状態をデュースと定義する。
 *        デュースが解消された（2点差がついた）場合は false を返す。
 *
 * @param leftScore  左チームの得点（>= 0）
 * @param rightScore 右チームの得点（>= 0）
 * @param config     試合ルール設定
 * @returns デュース中であれば true
 */
export function isDeuce(
  leftScore: number,
  rightScore: number,
  config: GameRulesConfig
): boolean {
  const bothAboveThreshold =
    leftScore >= config.deuceThreshold && rightScore >= config.deuceThreshold;
  const scoreDiff = Math.abs(leftScore - rightScore);

  return bothAboveThreshold && scoreDiff < config.pointGap;
}
