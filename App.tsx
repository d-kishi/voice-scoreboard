import './global.css';

import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import { ControlBar } from '@/features/score/components/ControlBar';
import { GameEndOverlay } from '@/features/score/components/GameEndOverlay';
import { ScorePanel } from '@/features/score/components/ScorePanel';
import { useGameEndWhistle } from '@/features/score/hooks/use-game-end-whistle';
import { useScore } from '@/features/score/hooks/use-score';
import { ListeningOverlay } from '@/features/voice/components/ListeningOverlay';
import { useVoiceStateMachine } from '@/features/voice/hooks/use-voice-state-machine';
import { log } from '@/utils/logger';

// 【目的】モジュール読み込み時刻を記録し、初回レンダリングまでの経過時間を計測する
// 【根拠】Requirement 9.1（3秒以内起動）の検証用。
//        モジュールスコープで Date.now() を呼ぶことで、JS バンドルの評価開始時点を捕捉する。
//        logcat で `[VSB:APP] startup:` をフィルタして起動時間を確認できる。
const APP_START_TIME = Date.now();

// 【目的】M4 デバッグ用: Release ビルドでクラッシュ原因を表示する ErrorBoundary
// 【根拠】Release ビルドでは Red Box が無いため、エラー原因が不明になる
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    console.error(`[VSB:APP] ErrorBoundary caught: ${error.message}`, error.stack);
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
 *        スコアエリアコンテナ（flex-1）内に ScorePanel・GameEndOverlay・ListeningOverlay を配置し、
 *        ControlBar は外に置くことで、オーバーレイのディム効果が下部バーに及ばないようにする。
 *        useVoiceStateMachine は自己管理型で、isVoiceRecognitionEnabled が ON なら
 *        マウント時に自動でウェイクワード認識を開始する。start()/stop() の明示的呼び出しは不要。
 */
export default function App() {
  useKeepAwake();
  const { isGameEnd, reset } = useScore();

  // 【目的】初回レンダリング時に起動時間を logcat に出力する
  // 【根拠】Requirement 9.1（3秒以内起動）の検証用。
  //        useRef で一度だけ実行を保証し、APP_START_TIME からの経過時間を計測する。
  //        logcat で `grep "VSB:APP"` でフィルタして確認できる。
  const startupLoggedRef = useRef(false);
  useEffect(() => {
    if (!startupLoggedRef.current) {
      startupLoggedRef.current = true;
      const elapsed = Date.now() - APP_START_TIME;
      log('APP', `startup: ${elapsed}ms`);
    }
  }, []);

  // 【目的】試合終了時にホイッスル音を再生する
  // 【根拠】isGameEnd の false → true 遷移を検知してホイッスル音を再生する。
  //        hook 内でプリロード（マウント時）と再生トリガーの両方を管理する。
  useGameEndWhistle(isGameEnd);

  // 【目的】K.I.T.T.スタイル音声状態マシンを起動し、UI に状態を公開する
  // 【根拠】useVoiceStateMachine は内部で useSettings を購読し、
  //        isVoiceRecognitionEnabled の ON/OFF に自動で反応する。
  //        state は ListeningOverlay の表示制御に使用する。
  const { state: voiceState, countdown } = useVoiceStateMachine();

  return (
    <ErrorBoundary>
      <View className="flex-1 bg-background">
        {/* 【目的】スコアエリアコンテナ: ScorePanel + オーバーレイ群をグループ化 */}
        {/* 【根拠】GameEndOverlay・ListeningOverlay の absolute positioning がこのコンテナ内に限定され、
                   ControlBar はディム対象外となる */}
        <View className="flex-1">
          <ScorePanel isGameEnd={isGameEnd} />
          {isGameEnd && <GameEndOverlay onReset={reset} />}
          <ListeningOverlay
            visible={voiceState === 'LISTENING'}
            countdown={countdown}
          />
        </View>
        <ControlBar />
        <StatusBar style="light" />
      </View>
    </ErrorBoundary>
  );
}
