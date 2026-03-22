import React from 'react';
import { Text, View } from 'react-native';

/**
 * 【目的】DebugTranscriptOverlay の props 定義
 * 【根拠】Task 9.1: 認識結果をリアルタイム表示するデバッグコンポーネント。
 *        IDLE 状態でも画面右上に半透明で表示し、エンジンが何を返しているか目視確認する。
 */
interface DebugTranscriptOverlayProps {
  /** 表示するかどうか（音声認識ON時のみ true） */
  readonly visible: boolean;
  /** 最新の認識結果テキスト */
  readonly transcript: string;
  /** 認識結果が確定済みか */
  readonly isFinal: boolean;
}

/**
 * 【目的】IDLE 状態で画面右上に認識テキストを半透明表示するデバッグUI
 * 【根拠】Task 9.1: 実地検証で「エンジンが何を返しているか」を目視確認する計測ツール。
 *        ListeningOverlay は LISTENING 状態のみ表示されるため、
 *        IDLE 状態（ウェイクワード待機中）の認識結果も確認できる別コンポーネントが必要。
 *        なぜ absolute positioning を使うか:
 *        既存のスコア表示やオーバーレイと重ならない画面右上に配置するため。
 */
export const DebugTranscriptOverlay = React.memo(function DebugTranscriptOverlay({
  visible,
  transcript,
  isFinal,
}: DebugTranscriptOverlayProps) {
  if (!visible || !transcript) {
    return null;
  }

  return (
    <View
      testID="debug-transcript-overlay"
      className="absolute top-2 right-2 rounded-md bg-black/70 px-3 py-1"
    >
      <Text
        className={`text-sm ${isFinal ? 'text-green-400' : 'text-yellow-400'}`}
        numberOfLines={1}
      >
        {isFinal ? transcript : `${transcript}...`}
      </Text>
    </View>
  );
});
