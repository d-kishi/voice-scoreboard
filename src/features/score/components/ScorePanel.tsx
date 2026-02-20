import React from 'react';
import {
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useScore } from '../hooks/use-score';
import { glowStyles } from '../../../utils/glow-styles';

/**
 * 【目的】左右1チーム分のスコア表示と +1/-1 ボタンを描画する
 * 【根拠】ScorePanel 内部でのみ使用するローカルコンポーネント。
 *        左右の表示ロジックは同一であり、side プロパティで区別する。
 */
interface ScoreSideProps {
  readonly score: number;
  readonly onIncrement: () => void;
  readonly onDecrement: () => void;
  readonly fontSize: number;
  readonly showButtons: boolean;
}

function ScoreSide({
  score,
  onIncrement,
  onDecrement,
  fontSize,
  showButtons,
}: ScoreSideProps) {
  return (
    <View className="flex-1 items-center justify-center">
      <Text
        testID="score-value"
        className="font-bold text-score"
        style={[glowStyles.white, { fontSize }]}
      >
        {score}
      </Text>
      {showButtons && (
        <View className="mt-4 flex-row gap-3">
          <Pressable
            testID="increment-button"
            className="rounded-lg bg-btn px-6 py-3"
            onPress={onIncrement}
          >
            <Text className="text-base font-semibold text-score">+1</Text>
          </Pressable>
          <Pressable
            testID="decrement-button"
            className="rounded-lg bg-btn px-6 py-3"
            onPress={onDecrement}
          >
            <Text className="text-base font-semibold text-score">-1</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * 【目的】横画面で左右均等に分割されたスコア表示パネル
 * 【根拠】design.md の ScorePanel Contract に準拠。
 *        左右を flex-1 で均等配分し、中央に細い縦の分割線を配置する。
 *        スコア数字は画面高さの約35%のフォントサイズで表示し、
 *        glowStyles.white による白色グロー効果を適用する。
 *        useScore hook と接続してリアルタイムにスコアを反映する。
 */
/**
 * 【目的】ScorePanel の props 定義
 * 【根拠】isGameEnd を外部から受け取ることで、
 *        試合終了時に +1/-1 ボタンを完全に非表示にする。
 *        なぜ内部で useScore().isGameEnd を使わないか:
 *        ボタン非表示の振る舞いを親から明示的に制御でき、テストも容易になるため。
 */
interface ScorePanelProps {
  readonly isGameEnd?: boolean;
}

export function ScorePanel({ isGameEnd = false }: ScorePanelProps) {
  const { leftScore, rightScore, incrementScore, decrementScore } = useScore();
  const { height } = useWindowDimensions();

  // 【目的】画面高さに応じたスコア数字のフォントサイズを計算する
  // 【根拠】design.md の仕様「画面高さの40%程度」に基づく。
  //        実際の fontSize は高さの35%程度で視覚的に40%相当の存在感になる。
  const scoreFontSize = Math.round(height * 0.35);

  return (
    <View className="flex-1 flex-row bg-background">
      <ScoreSide
        score={leftScore}
        onIncrement={() => incrementScore('left')}
        onDecrement={() => decrementScore('left')}
        fontSize={scoreFontSize}
        showButtons={!isGameEnd}
      />
      <View
        testID="center-divider"
        className="w-px self-stretch bg-btn-border"
      />
      <ScoreSide
        score={rightScore}
        onIncrement={() => incrementScore('right')}
        onDecrement={() => decrementScore('right')}
        fontSize={scoreFontSize}
        showButtons={!isGameEnd}
      />
    </View>
  );
}
