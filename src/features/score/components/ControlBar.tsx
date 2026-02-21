import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSettings } from '../../settings/hooks/use-settings';
import { useScore } from '../hooks/use-score';
import { ResetDialog } from './ResetDialog';

/**
 * 【目的】画面下端に固定する操作バーコンポーネント
 * 【根拠】design.md の ControlBar Contract に準拠。
 *        左側に「音声入力」「読み上げ」トグルボタン、
 *        右側に「ロールバック」「リセット」ボタンを配置する。
 *        トグルボタンの状態は useSettings hook（SettingsStore）から取得し、
 *        AsyncStorage に永続化される。
 */
export function ControlBar() {
  const { canUndo, rollback, reset } = useScore();
  const {
    isVoiceRecognitionEnabled,
    isSpeechEnabled,
    toggleVoiceRecognition,
    toggleSpeech,
  } = useSettings();
  const [isResetDialogVisible, setIsResetDialogVisible] = useState(false);

  const handleResetPress = () => {
    setIsResetDialogVisible(true);
  };

  const handleResetCancel = () => {
    setIsResetDialogVisible(false);
  };

  const handleResetConfirm = () => {
    reset();
    setIsResetDialogVisible(false);
  };

  return (
    <View testID="control-bar" className="flex-row items-center justify-between bg-bar px-4 py-3">
      {/* 【目的】左側: トグルボタン群 */}
      <View className="flex-row gap-2">
        <ToggleButton
          testID="toggle-voice"
          icon={<Feather name="mic" size={16} color="white" />}
          label="音声入力"
          isActive={isVoiceRecognitionEnabled}
          onPress={toggleVoiceRecognition}
        />
        <ToggleButton
          testID="toggle-speech"
          icon={<Ionicons name="volume-high-outline" size={16} color="white" />}
          label="読み上げ"
          isActive={isSpeechEnabled}
          onPress={toggleSpeech}
        />
      </View>

      {/* 【目的】右側: アクションボタン群 */}
      <View className="flex-row gap-2">
        <Pressable
          testID="rollback-button"
          className={`flex-row items-center gap-1.5 rounded-lg border border-btn-border px-4 py-2 ${
            canUndo ? 'bg-btn' : 'bg-btn opacity-50'
          }`}
          disabled={!canUndo}
          accessibilityState={{ disabled: !canUndo }}
          onPress={rollback}
        >
          <Feather name="rotate-ccw" size={14} color="white" />
          <Text className="text-sm font-semibold text-score">ロールバック</Text>
        </Pressable>
        <Pressable
          testID="reset-button"
          className="flex-row items-center gap-1.5 rounded-lg border border-btn-border bg-btn px-4 py-2"
          onPress={handleResetPress}
        >
          <Feather name="refresh-cw" size={14} color="white" />
          <Text className="text-sm font-semibold text-score">リセット</Text>
        </Pressable>
      </View>

      <ResetDialog
        visible={isResetDialogVisible}
        onCancel={handleResetCancel}
        onConfirm={handleResetConfirm}
      />
    </View>
  );
}

/**
 * 【目的】トグルボタンの共通コンポーネント
 * 【根拠】音声入力と読み上げのトグルボタンは同一の見た目・動作であり、
 *        共通化して DRY を保つ。有効時はシアン背景、無効時はダークグレー背景。
 */
interface ToggleButtonProps {
  readonly testID: string;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly isActive: boolean;
  readonly onPress: () => void;
}

function ToggleButton({
  testID,
  icon,
  label,
  isActive,
  onPress,
}: ToggleButtonProps) {
  return (
    <Pressable
      testID={testID}
      className={`flex-row items-center gap-1.5 rounded-lg px-4 py-2 ${
        isActive ? 'bg-toggle-active' : 'bg-btn'
      }`}
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
    >
      {icon}
      <Text className="text-sm font-semibold text-score">{label}</Text>
    </Pressable>
  );
}
