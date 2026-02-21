/**
 * 【目的】UI と SettingsStore の仲介 hook として、設定操作とハイドレーション状態を公開する
 * 【根拠】Clean Architecture 軽量版において hooks は UseCase 相当の役割を担う。
 *        SettingsStore を直接 UI から参照せず hook を経由することで、
 *        将来の設定項目追加や複雑な設定ロジック（例: 権限チェック後の自動無効化）を
 *        UI を変更せずに hook 層で吸収できる。
 *        useScore hook と同じ仲介パターンに準拠する。
 */
import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../../stores/settings-store';

/**
 * 【目的】useSettings hook の公開インターフェース
 * 【根拠】design.md の SettingsStore Contract に準拠しつつ、
 *        hasHydrated を追加で公開する。hasHydrated は AsyncStorage からの
 *        設定復元完了を UI が知るために必要。
 */
export interface UseSettingsReturn {
  readonly isVoiceRecognitionEnabled: boolean;
  readonly isSpeechEnabled: boolean;
  readonly hasHydrated: boolean;
  toggleVoiceRecognition(): void;
  toggleSpeech(): void;
}

/**
 * 【目的】設定管理のビジネスロジックを提供するカスタム hook
 * 【根拠】SettingsStore からの設定値をリアクティブに購読し、
 *        トグル操作とハイドレーション状態を公開する。
 *        なぜ hasHydrated を hook 内で管理するか:
 *        useSettingsStore.persist.hasHydrated() は同期メソッドであり、
 *        React の再レンダリングをトリガーしない。useState + onFinishHydration で
 *        ハイドレーション完了を React のリアクティブシステムに接続する。
 */
export function useSettings(): UseSettingsReturn {
  const isVoiceRecognitionEnabled = useSettingsStore(
    (s) => s.isVoiceRecognitionEnabled
  );
  const isSpeechEnabled = useSettingsStore((s) => s.isSpeechEnabled);
  const toggleVoiceRecognition = useSettingsStore(
    (s) => s.toggleVoiceRecognition
  );
  const toggleSpeech = useSettingsStore((s) => s.toggleSpeech);

  // 【目的】ハイドレーション完了をリアクティブに追跡する
  // 【根拠】persist.hasHydrated() は同期呼び出しのため、
  //        初期値として使用し、onFinishHydration で完了時に更新する。
  //        なぜ useSyncExternalStore を使わないか:
  //        zustand の persist API は subscribe パターンではなく
  //        コールバック登録パターンであり、useState + useEffect が自然な組み合わせ。
  const [hasHydrated, setHasHydrated] = useState(
    useSettingsStore.persist.hasHydrated()
  );

  useEffect(() => {
    const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    return unsubscribe;
  }, []);

  return {
    isVoiceRecognitionEnabled,
    isSpeechEnabled,
    hasHydrated,
    toggleVoiceRecognition,
    toggleSpeech,
  };
}
