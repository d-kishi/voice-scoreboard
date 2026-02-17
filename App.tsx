import './global.css';

import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text, View } from 'react-native';

import { glowStyles } from '@/utils/glow-styles';

/**
 * 【目的】アプリケーションのルートコンポーネント
 * 【根拠】横画面スコアボードのメインエントリ。
 *        useKeepAwake で画面スリープを防止し、試合中に画面が消えることを防ぐ。
 *        NativeWind の className でダークネイビー背景を適用し、
 *        グロー効果は textShadow スタイルとの併用で実現する。
 */
export default function App() {
  useKeepAwake();

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text
        className="text-4xl font-bold text-score"
        style={glowStyles.white}
      >
        Voice Scoreboard
      </Text>
      <Text className="mt-4 text-lg text-accent-cyan">
        NativeWind Ready
      </Text>
      <StatusBar style="light" />
    </View>
  );
}
