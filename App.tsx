import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 【目的】アプリケーションのルートコンポーネント
 * 【根拠】横画面スコアボードのメインエントリ。
 *        useKeepAwake で画面スリープを防止し、試合中に画面が消えることを防ぐ。
 */
export default function App() {
  useKeepAwake();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Scoreboard</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
});
