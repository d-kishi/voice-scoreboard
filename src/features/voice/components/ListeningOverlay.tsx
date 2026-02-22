import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { glowStyles } from '../../../utils/glow-styles';

/**
 * 【目的】ListeningOverlay の props 定義
 * 【根拠】Task 7.3 で useVoiceStateMachine と接続する際、
 *        親コンポーネントが visible と countdown を制御する。
 *        プレゼンテーションコンポーネントとして設計し、
 *        状態マシンへの直接依存を避ける。
 */
interface ListeningOverlayProps {
  /** LISTENING 状態かどうか */
  readonly visible: boolean;
  /** 残り秒数（3→2→1） */
  readonly countdown: number;
}

/**
 * 【目的】LISTENING 状態のオーバーレイ表示
 * 【根拠】design.md の LISTENING 状態仕様に準拠。
 *        画面中央にシアンの同心円発光リングとマイクアイコンを表示し、
 *        背景のスコア・ボタンにディム効果を適用する。
 *        なぜ Modal ではなく absolute positioning を使うか:
 *        GameEndOverlay と同様に、下部バー（ControlBar）はディム対象外。
 *        スコアエリアのみを覆う必要があるため、親コンテナ内の absolute 配置を使用する。
 *        なぜ expo-blur を使わないか:
 *        未インストールであり、追加すると prebuild + ネイティブ再ビルドが必要。
 *        ResetDialog・GameEndOverlay でもディム効果のみで一貫しているため、
 *        bg-black/60 で統一する。
 */
export function ListeningOverlay({ visible, countdown }: ListeningOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <View testID="listening-overlay" style={StyleSheet.absoluteFill}>
      {/* 【目的】背景のディム効果（スコアエリアのみ） */}
      <View testID="listening-dim-bg" className="absolute inset-0 bg-black/60" />

      {/* 【目的】中央配置のコンテンツ（リング + アイコン + テキスト） */}
      <View className="flex-1 items-center justify-center">
        {/* 【目的】同心円発光リング
         * 【根拠】3 層のネスト View で外側→中間→内側の opacity 段階変化を表現する。
         *        react-native-svg は不要。border + opacity の組み合わせで
         *        シアンのグラデーション発光リングを疑似的に表現する。
         *        Android は elevation でシアン色グローが不可のため、
         *        borderColor + backgroundColor の opacity で補完する
         *        （GameEndOverlay の cardGlow パターンと同じアプローチ）。
         */}
        <View
          testID="listening-ring-outer"
          style={styles.ringOuter}
          className="items-center justify-center rounded-full"
        >
          <View
            testID="listening-ring-middle"
            style={styles.ringMiddle}
            className="items-center justify-center rounded-full"
          >
            <View
              testID="listening-ring-inner"
              style={styles.ringInner}
              className="items-center justify-center rounded-full"
            >
              {/* 【目的】マイクアイコン（白）
               * 【根拠】design.md: LISTENING 状態で画面中央にマイクアイコン（白）。
               *        View ラッパーで testID を付与する。
               *        __mocks__/@expo/vector-icons.js のモックは testID を透過しないため。
               */}
              <View testID="listening-mic-icon">
                <Feather name="mic" size={40} color="white" />
              </View>
            </View>
          </View>
        </View>

        {/* 【目的】「Ready」テキスト（シアン + グロー効果）
         * 【根拠】design.md: リングの下に「Ready」（シアン）を表示。
         *        glowStyles.cyan で発光効果を適用する。
         */}
        <Text
          style={glowStyles.cyan}
          className="mt-4 text-2xl font-bold text-accent-cyan"
        >
          Ready
        </Text>

        {/* 【目的】カウントダウン秒数表示
         * 【根拠】design.md: 「Ready」の下に秒数表示（例: 1s）。白またはグレー。
         *        `{countdown}s` 形式で表示する。
         */}
        <Text className="mt-2 text-lg text-gray-400">
          {countdown}s
        </Text>
      </View>
    </View>
  );
}

/**
 * 【目的】同心円リングのスタイル定義
 * 【根拠】NativeWind は borderColor の opacity 指定に制限があり、
 *        StyleSheet で直接定義する方が確実。
 *        外側（opacity 0.15）→ 中間（0.4）→ 内側（0.8）の 3 層で
 *        シアンのグラデーション発光リングを表現する。
 *        内側リングに shadowColor でグロー効果を付与する。
 */
const styles = StyleSheet.create({
  ringOuter: {
    width: 160,
    height: 160,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.15)',
    backgroundColor: 'rgba(0, 229, 255, 0.03)',
  },
  ringMiddle: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
  },
  ringInner: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.8)',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 0.6,
    elevation: 10,
  },
});
