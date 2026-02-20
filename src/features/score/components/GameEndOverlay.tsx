import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { glowStyles } from '../../../utils/glow-styles';

/**
 * 【目的】GameEndOverlay の props 定義
 * 【根拠】親コンポーネント（App）がリセットコールバックを制御する。
 *        ResetDialog と同様にプレゼンテーショナルコンポーネントとして設計し、
 *        状態管理は親に委ねる。
 */
interface GameEndOverlayProps {
  readonly onReset: () => void;
}

/**
 * 【目的】試合終了オーバーレイ
 * 【根拠】design.md の試合終了画面仕様に準拠。
 *        ゴールド/アンバーの枠線付きカード（角丸、中央配置）を
 *        スコアエリア上にオーバーレイとして表示する。
 *        なぜ Modal ではなく absolute positioning を使うか:
 *        Modal は全画面を覆い ControlBar もディム対象になるが、
 *        仕様では下部バーはそのまま表示するためスコアエリアのみを覆う。
 */
export function GameEndOverlay({ onReset }: GameEndOverlayProps) {
  return (
    <View testID="game-end-overlay" style={StyleSheet.absoluteFill}>
      {/* 【目的】背景のディム効果（スコアエリアのみ） */}
      <View className="absolute inset-0 bg-black/60" />

      {/* 【目的】ゴールド枠線付きカード（中央配置） */}
      <View className="flex-1 items-center justify-center">
        <View
          testID="game-end-card"
          style={styles.cardGlow}
          className="rounded-2xl border-2 border-accent-gold bg-background px-10 py-8"
        >
          <Text
            testID="game-end-title"
            style={glowStyles.gold}
            className="text-center text-3xl font-bold text-accent-gold"
          >
            試合終了
          </Text>
          <Pressable
            testID="game-end-reset"
            className="mt-6 flex-row items-center justify-center gap-2 rounded-lg bg-accent-gold px-8 py-3"
            onPress={onReset}
          >
            <Feather name="refresh-cw" size={16} color="white" />
            <Text className="text-base font-semibold text-score">
              リセット
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * 【目的】カードのゴールドグロー効果
 * 【根拠】NativeWind は shadowColor をサポートしないため style prop で適用する。
 *        iOS: shadowColor でゴールドの発光効果を実現。
 *        Android: elevation で影をつける（色制御不可だがボーダーとテキストグローで補完）。
 */
const styles = StyleSheet.create({
  cardGlow: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 0.6,
    elevation: 10,
  },
});
