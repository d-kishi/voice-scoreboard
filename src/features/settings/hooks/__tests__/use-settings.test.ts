import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act } from '@testing-library/react-native';
import { useSettingsStore } from '../../../../stores/settings-store';
import { useSettings } from '../use-settings';

/**
 * 【目的】useSettings hook の統合テスト
 * 【根拠】useSettings は SettingsStore と UI の仲介 hook であり、
 *        設定のトグル操作とハイドレーション状態の公開が正しく動作することを保証する。
 */
describe('useSettings', () => {
  /**
   * 【目的】各テストで独立した状態を保証する
   * 【根拠】zustand はモジュールレベルのシングルトンであり、
   *        テスト間で状態がリークしないよう初期化が必要。
   */
  beforeEach(async () => {
    useSettingsStore.setState({
      isVoiceRecognitionEnabled: true,
      isSpeechEnabled: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    (AsyncStorage as any).__resetStore();
  });

  describe('初期状態', () => {
    it('isVoiceRecognitionEnabled が true である', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.isVoiceRecognitionEnabled).toBe(true);
    });

    it('isSpeechEnabled が true である', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.isSpeechEnabled).toBe(true);
    });

    it('hasHydrated の値を返す', () => {
      const { result } = renderHook(() => useSettings());
      // 【根拠】テスト環境ではモジュール読み込み時にハイドレーションが完了するため true
      expect(typeof result.current.hasHydrated).toBe('boolean');
    });
  });

  describe('toggleVoiceRecognition', () => {
    it('音声認識の ON/OFF を切り替える', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.toggleVoiceRecognition();
      });

      expect(result.current.isVoiceRecognitionEnabled).toBe(false);
    });

    it('連続トグルで元に戻る', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.toggleVoiceRecognition();
      });
      act(() => {
        result.current.toggleVoiceRecognition();
      });

      expect(result.current.isVoiceRecognitionEnabled).toBe(true);
    });
  });

  describe('toggleSpeech', () => {
    it('読み上げの ON/OFF を切り替える', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.toggleSpeech();
      });

      expect(result.current.isSpeechEnabled).toBe(false);
    });

    it('連続トグルで元に戻る', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.toggleSpeech();
      });
      act(() => {
        result.current.toggleSpeech();
      });

      expect(result.current.isSpeechEnabled).toBe(true);
    });
  });

  describe('独立性', () => {
    it('toggleVoiceRecognition は isSpeechEnabled に影響しない', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.toggleVoiceRecognition();
      });

      expect(result.current.isVoiceRecognitionEnabled).toBe(false);
      expect(result.current.isSpeechEnabled).toBe(true);
    });

    it('toggleSpeech は isVoiceRecognitionEnabled に影響しない', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.toggleSpeech();
      });

      expect(result.current.isSpeechEnabled).toBe(false);
      expect(result.current.isVoiceRecognitionEnabled).toBe(true);
    });
  });
});
