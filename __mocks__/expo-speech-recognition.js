/**
 * 【目的】expo-speech-recognition のテスト用モック
 * 【根拠】ネイティブモジュールは Jest 環境で利用不可。
 *        イベントリスナーの登録・発火をシミュレートし、
 *        テストからイベントを手動発火できる仕組みを提供する。
 */

// 【目的】イベントリスナーを保存し、テストからイベント発火できるようにする
const listeners = {};

const ExpoSpeechRecognitionModule = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({
    granted: true,
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
  }),
  getPermissionsAsync: jest.fn().mockResolvedValue({
    granted: true,
    status: 'granted',
    canAskAgain: true,
    expires: 'never',
  }),
  isRecognitionAvailable: jest.fn().mockReturnValue(true),
  supportsOnDeviceRecognition: jest.fn().mockReturnValue(false),
  getSupportedLocales: jest.fn().mockReturnValue(['ja-JP', 'en-US']),
  addListener: jest.fn((eventName, callback) => {
    if (!listeners[eventName]) {
      listeners[eventName] = [];
    }
    listeners[eventName].push(callback);
    return {
      remove: jest.fn(() => {
        if (!listeners[eventName]) return;
        const idx = listeners[eventName].indexOf(callback);
        if (idx >= 0) {
          listeners[eventName].splice(idx, 1);
        }
      }),
    };
  }),
};

// 【目的】テストヘルパー: テストからイベントを手動発火する
function __emitEvent(eventName, data) {
  if (listeners[eventName]) {
    listeners[eventName].forEach((cb) => cb(data));
  }
}

// 【目的】テストヘルパー: リスナーをすべてクリアする
function __resetListeners() {
  Object.keys(listeners).forEach((key) => {
    delete listeners[key];
  });
}

module.exports = {
  ExpoSpeechRecognitionModule,
  __emitEvent,
  __resetListeners,
};
