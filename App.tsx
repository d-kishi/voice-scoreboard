import './global.css';

import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import { ControlBar } from '@/features/score/components/ControlBar';
import { GameEndOverlay } from '@/features/score/components/GameEndOverlay';
import { ScorePanel } from '@/features/score/components/ScorePanel';
import { useScore } from '@/features/score/hooks/use-score';
// 【目的】M4 検証用: 効果音サービスのエミュレータ動作確認
// 【根拠】Task 7.2 で正式統合予定。テスト完了後に置き換え
import * as SoundService from '@/features/voice/services/sound';

// 【目的】M4 デバッグ用: Release ビルドでクラッシュ原因を表示する ErrorBoundary
// 【根拠】Release ビルドでは Red Box が無いため、エラー原因が不明になる
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Error Caught
          </Text>
          <Text style={{ color: 'white', fontSize: 14 }}>
            {this.state.error.message}
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 10 }}>
            {this.state.error.stack?.slice(0, 500)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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

  // 【目的】M4 検証用: アプリ起動時に効果音をプリロード
  // 【根拠】Task 7.2 で正式統合予定
  useEffect(() => {
    try { SoundService.preload(); } catch (e) { console.warn('[M4] preload error:', e); }
  }, []);

  // 【目的】M4 検証用: 試合終了時にホイッスル音を再生
  // 【根拠】Task 7.2 で正式統合予定
  const prevGameEnd = useRef(false);
  useEffect(() => {
    if (isGameEnd && !prevGameEnd.current) {
      try { SoundService.play('whistle'); } catch (e) { console.warn('[M4] play error:', e); }
    }
    prevGameEnd.current = isGameEnd;
  }, [isGameEnd]);

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
