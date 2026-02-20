import './global.css';

import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';

import { ControlBar } from '@/features/score/components/ControlBar';
import { GameEndOverlay } from '@/features/score/components/GameEndOverlay';
import { ScorePanel } from '@/features/score/components/ScorePanel';
import { useScore } from '@/features/score/hooks/use-score';

/**
 * 【目的】アプリケーションのルートコンポーネント（ScoreScreen 相当）
 * 【根拠】横画面スコアボードのメインエントリ。
 *        useKeepAwake で画面スリープを防止し、試合中に画面が消えることを防ぐ。
 *        スコアエリアコンテナ（flex-1）内に ScorePanel と GameEndOverlay を配置し、
 *        ControlBar は外に置くことで、オーバーレイのディム効果が下部バーに及ばないようにする。
 */
export default function App() {
  useKeepAwake();
  const { isGameEnd, reset } = useScore();

  return (
    <View className="flex-1 bg-background">
      {/* 【目的】スコアエリアコンテナ: ScorePanel + GameEndOverlay をグループ化 */}
      {/* 【根拠】GameEndOverlay の absolute positioning がこのコンテナ内に限定され、
                 ControlBar はディム対象外となる */}
      <View className="flex-1">
        <ScorePanel isGameEnd={isGameEnd} />
        {isGameEnd && <GameEndOverlay onReset={reset} />}
      </View>
      <ControlBar />
      <StatusBar style="light" />
    </View>
  );
}
