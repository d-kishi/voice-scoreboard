/**
 * 【目的】音声認識と読み上げの ON/OFF 設定を zustand + persist で管理する
 * 【根拠】zustand の persist ミドルウェアが AsyncStorage への永続化を自動で行い、
 *        アプリ起動時にハイドレーション（復元）する。設定の変更は即座に永続化される。
 *        なぜ ScoreStore と別ストアにするか: スコアは揮発性（試合ごとにリセット）、
 *        設定は永続性が必要で、ライフサイクルが異なるため分離する。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * 【目的】設定の状態を定義する型
 * 【根拠】design.md の SettingsStore Contract に準拠。
 *        音声認識と読み上げの ON/OFF が、設定として必要な最小限の状態。
 */
export interface SettingsState {
  readonly isVoiceRecognitionEnabled: boolean;
  readonly isSpeechEnabled: boolean;
}

/**
 * 【目的】設定に対する操作を定義する型
 * 【根拠】トグル操作のみ。設定画面は不要で、
 *        ControlBar のトグルボタンから直接切り替える。
 */
export interface SettingsActions {
  toggleVoiceRecognition(): void;
  toggleSpeech(): void;
}

export type SettingsStore = SettingsState & SettingsActions;

const INITIAL_STATE: SettingsState = {
  isVoiceRecognitionEnabled: true,
  isSpeechEnabled: true,
};

/**
 * 【目的】AsyncStorage の保存キー
 * 【根拠】テストから参照できるよう export する。
 *        'voice-scoreboard-' プレフィックスで他のストレージキーとの衝突を回避する。
 */
export const SETTINGS_STORAGE_KEY = 'voice-scoreboard-settings';

/**
 * 【目的】zustand + persist による設定ストアのシングルトンインスタンス
 * 【根拠】persist ミドルウェアが AsyncStorage をバックエンドとして使用し、
 *        設定変更時に自動で永続化、アプリ起動時に自動でハイドレーションする。
 *        version: 1 を指定し、将来の設定項目追加時にマイグレーションを可能にする。
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      toggleVoiceRecognition: () => {
        set((state) => ({
          isVoiceRecognitionEnabled: !state.isVoiceRecognitionEnabled,
        }));
      },

      toggleSpeech: () => {
        set((state) => ({
          isSpeechEnabled: !state.isSpeechEnabled,
        }));
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
