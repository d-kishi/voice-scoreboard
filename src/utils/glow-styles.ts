import { TextStyle } from 'react-native';

/**
 * 【目的】textShadow によるグロー（発光）効果の共通スタイルユーティリティ
 * 【根拠】NativeWind は textShadow をサポートしていないため、
 *        style prop と className prop を併用する必要がある。
 *        グロー効果はスコア数字・試合終了テキスト・LISTENING 表示で
 *        繰り返し使われるため、共通化して一貫性を保つ。
 */

type GlowStyle = Pick<
  TextStyle,
  'textShadowColor' | 'textShadowOffset' | 'textShadowRadius'
>;

const DEFAULT_GLOW_RADIUS = 16;

/**
 * 【目的】任意の色と半径でグロー効果スタイルを生成する
 * 【根拠】プリセット以外のカスタムグロー効果が必要な場面（将来の拡張）に対応
 */
export function createGlow(
  color: string,
  radius: number = DEFAULT_GLOW_RADIUS
): GlowStyle {
  return {
    textShadowColor: color,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: radius,
  };
}

/**
 * 【目的】アプリ全体で使用するグロー効果のプリセット集
 * 【根拠】design.md のカラーパレットに基づく3種類のグロー効果。
 *        - white: スコア数字の白色発光（メイン画面）
 *        - cyan: LISTENING 状態のシアン発光
 *        - gold: 試合終了テキストのゴールド発光
 */
export const glowStyles = {
  white: createGlow('rgba(255, 255, 255, 0.8)'),
  cyan: createGlow('rgba(0, 229, 255, 0.8)'),
  gold: createGlow('rgba(245, 158, 11, 0.8)'),
} as const;
