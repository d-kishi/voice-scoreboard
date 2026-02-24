import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useSettings } from '../../settings/hooks/use-settings';
import {
  checkPermissions,
  requestPermissions,
} from '../../voice/services/speech-recognition';
import { useScore } from '../hooks/use-score';
import { ResetDialog } from './ResetDialog';
import { log } from '../../../utils/logger';

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
  // 【目的】権限リクエスト中の連打を防止する
  // 【根拠】requestPermissions は async のため、ダイアログ表示中の二重タップを防ぐ
  const [isRequesting, setIsRequesting] = useState(false);

  // 【目的】音声入力トグルの ON 時にマイク権限をリクエストする
  // 【根拠】design.md: マイク権限未許可時は音声機能を無効化し UI で通知。
  //        権限拒否時は Alert で通知し、設定画面への誘導を提供する。
  //        OFF→ON 時のみ権限チェック。ON→OFF は無条件で切り替え。
  //        なぜ checkPermissions → requestPermissions の 2 段階か:
  //        requestPermissions は内部で SpeechRecognizer を操作する可能性があり、
  //        abort 直後に呼ぶと resolve しないケースがある。既に許可済みなら
  //        checkPermissions（getPermissionsAsync）で十分。
  const handleToggleVoiceRecognition = async () => {
    log('APP', `handleToggleVoiceRecognition: isRequesting=${isRequesting}, current=${isVoiceRecognitionEnabled}`);
    if (isRequesting) return;
    const willBeEnabled = !isVoiceRecognitionEnabled;

    if (willBeEnabled) {
      setIsRequesting(true);
      try {
        // 【目的】まず既存の権限状態を確認（ダイアログなし）
        const alreadyGranted = await checkPermissions();
        log('APP', `checkPermissions: alreadyGranted=${alreadyGranted}`);

        if (!alreadyGranted) {
          // 【目的】未許可の場合のみ権限リクエストダイアログを表示
          const granted = await requestPermissions();
          log('APP', `requestPermissions: granted=${granted}`);
          if (!granted) {
            Alert.alert(
              'マイク権限が必要です',
              '音声入力を使用するにはマイクへのアクセスを許可してください。',
              [
                { text: 'キャンセル', style: 'cancel' },
                { text: '設定を開く', onPress: () => Linking.openSettings() },
              ],
            );
            return;
          }
        }
      } finally {
        setIsRequesting(false);
      }
    }

    log('APP', `calling toggleVoiceRecognition, willBeEnabled=${willBeEnabled}`);
    toggleVoiceRecognition();
  };

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
          onPress={handleToggleVoiceRecognition}
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
