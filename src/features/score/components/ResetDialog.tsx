import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

/**
 * 【目的】ResetDialog の props 定義
 * 【根拠】親コンポーネント（ControlBar）がダイアログの表示/非表示と
 *        確認/キャンセルのコールバックを制御する。
 */
interface ResetDialogProps {
  readonly visible: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/**
 * 【目的】リセット確認モーダルダイアログ
 * 【根拠】design.md のリセット確認ダイアログ仕様に準拠。
 *        ダークネイビー背景のカードに角丸・薄いグレーボーダー、
 *        タイトル「リセット確認」、説明文、キャンセル/リセットボタンを配置。
 *        背景にディム効果を適用する。
 *        なぜ expo-blur を使わないか: 未インストールであり、
 *        ディム効果のみで十分な視覚的分離が得られるため。
 */
export function ResetDialog({ visible, onCancel, onConfirm }: ResetDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* 【目的】背景のディム効果 */}
      <View
        testID="reset-dialog"
        className="flex-1 items-center justify-center bg-black/50"
      >
        {/* 【目的】ダイアログカード */}
        <View className="w-80 rounded-2xl border border-btn-border bg-background p-6">
          <Text className="mb-2 text-center text-lg font-bold text-score">
            リセット確認
          </Text>
          <Text className="mb-6 text-center text-sm text-btn-border">
            スコアを 0-0 にリセットしますか？
          </Text>
          <View className="flex-row justify-center gap-3">
            <Pressable
              testID="reset-dialog-cancel"
              className="rounded-lg bg-btn px-6 py-3"
              onPress={onCancel}
            >
              <Text className="text-sm font-semibold text-score">
                キャンセル
              </Text>
            </Pressable>
            <Pressable
              testID="reset-dialog-confirm"
              className="rounded-lg bg-danger px-6 py-3"
              onPress={onConfirm}
            >
              <Text className="text-sm font-semibold text-score">
                リセット
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
