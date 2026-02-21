import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore, SETTINGS_STORAGE_KEY } from '../settings-store';

/**
 * 【目的】SettingsStore の zustand + persist による設定管理をテストする
 * 【根拠】音声認識と読み上げの ON/OFF 設定は、AsyncStorage への永続化と
 *        アプリ再起動時の復元（ハイドレーション）が正しく動作することを保証する必要がある。
 */
describe('SettingsStore', () => {
  /**
   * 【目的】各テストで独立した状態を保証する
   * 【根拠】zustand はモジュールレベルのシングルトンであり、
   *        テスト間で状態がリークしないよう初期化が必要。
   *        AsyncStorage モックもリセットして永続化テストの独立性を確保する。
   */
  beforeEach(async () => {
    // 【根拠】setState は persist ミドルウェアの非同期書き込みをトリガーするため、
    //        AsyncStorage のリセット前に書き込み完了を待つ必要がある。
    //        そうしないとテスト内の AsyncStorage 操作とレースコンディションが発生する。
    useSettingsStore.setState({
      isVoiceRecognitionEnabled: true,
      isSpeechEnabled: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    (AsyncStorage as any).__resetStore();
  });

  describe('初期状態', () => {
    it('isVoiceRecognitionEnabled が true である', () => {
      expect(useSettingsStore.getState().isVoiceRecognitionEnabled).toBe(true);
    });

    it('isSpeechEnabled が true である', () => {
      expect(useSettingsStore.getState().isSpeechEnabled).toBe(true);
    });
  });

  describe('toggleVoiceRecognition', () => {
    it('true から false に切り替える', () => {
      useSettingsStore.getState().toggleVoiceRecognition();
      expect(useSettingsStore.getState().isVoiceRecognitionEnabled).toBe(false);
    });

    it('false から true に切り替える', () => {
      useSettingsStore.setState({ isVoiceRecognitionEnabled: false });
      useSettingsStore.getState().toggleVoiceRecognition();
      expect(useSettingsStore.getState().isVoiceRecognitionEnabled).toBe(true);
    });

    it('isSpeechEnabled に影響しない', () => {
      useSettingsStore.getState().toggleVoiceRecognition();
      expect(useSettingsStore.getState().isSpeechEnabled).toBe(true);
    });
  });

  describe('toggleSpeech', () => {
    it('true から false に切り替える', () => {
      useSettingsStore.getState().toggleSpeech();
      expect(useSettingsStore.getState().isSpeechEnabled).toBe(false);
    });

    it('false から true に切り替える', () => {
      useSettingsStore.setState({ isSpeechEnabled: false });
      useSettingsStore.getState().toggleSpeech();
      expect(useSettingsStore.getState().isSpeechEnabled).toBe(true);
    });

    it('isVoiceRecognitionEnabled に影響しない', () => {
      useSettingsStore.getState().toggleSpeech();
      expect(useSettingsStore.getState().isVoiceRecognitionEnabled).toBe(true);
    });
  });

  describe('永続化', () => {
    it('設定変更が AsyncStorage に保存される', async () => {
      // 【根拠】persist ミドルウェアは set() 後に非同期で AsyncStorage.setItem を呼ぶ
      useSettingsStore.getState().toggleVoiceRecognition();

      // 非同期の永続化を待つ
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        SETTINGS_STORAGE_KEY,
        expect.stringContaining('"isVoiceRecognitionEnabled":false')
      );
    });

    it('AsyncStorage から設定が復元される（リハイドレーション）', async () => {
      // 【根拠】事前に AsyncStorage にデータを格納し、rehydrate() で復元を検証する。
      //        beforeEach で状態は {true, true} にリセット済み。
      //        なぜ setState を追加で呼ばないか: setState は persist の非同期書き込みを
      //        トリガーし、AsyncStorage.setItem とレースコンディションが発生するため。
      const savedState = {
        state: {
          isVoiceRecognitionEnabled: false,
          isSpeechEnabled: false,
        },
        version: 1,
      };
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(savedState)
      );

      // 【根拠】rehydrate() は内部で非同期に AsyncStorage.getItem を呼び、
      //        結果を set() でストアに反映する。onFinishHydration コールバックで
      //        状態更新の完了を確実に待つ。
      await new Promise<void>((resolve) => {
        useSettingsStore.persist.onFinishHydration(() => resolve());
        useSettingsStore.persist.rehydrate();
      });

      expect(useSettingsStore.getState().isVoiceRecognitionEnabled).toBe(false);
      expect(useSettingsStore.getState().isSpeechEnabled).toBe(false);
    });

    it('AsyncStorage が空の場合はデフォルト値が使用される', async () => {
      // 【根拠】初回起動時は AsyncStorage にデータがないため、デフォルト値で動作する
      await useSettingsStore.persist.rehydrate();

      expect(useSettingsStore.getState().isVoiceRecognitionEnabled).toBe(true);
      expect(useSettingsStore.getState().isSpeechEnabled).toBe(true);
    });
  });

  describe('ハイドレーション', () => {
    it('persist.hasHydrated() がハイドレーション完了後に true を返す', async () => {
      await useSettingsStore.persist.rehydrate();
      expect(useSettingsStore.persist.hasHydrated()).toBe(true);
    });

    it('onFinishHydration コールバックが呼ばれる', async () => {
      const callback = jest.fn();
      useSettingsStore.persist.onFinishHydration(callback);

      await useSettingsStore.persist.rehydrate();

      expect(callback).toHaveBeenCalled();
    });
  });
});
