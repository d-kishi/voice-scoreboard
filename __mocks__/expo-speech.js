/**
 * 【目的】expo-speech のテスト用モック
 * 【根拠】ネイティブモジュールは Jest 環境で利用不可。
 *        speak() の onDone/onStart/onStopped コールバックをシミュレートし、
 *        テストから手動で呼び出せる仕組みを提供する。
 */

// 【目的】最後に speak() に渡されたコールバックを保持する
let _lastCallbacks = {
  onStart: null,
  onDone: null,
  onStopped: null,
  onError: null,
};

// 【目的】isSpeakingAsync の戻り値を制御する
let _isSpeaking = false;

const Speech = {
  speak: jest.fn((text, options = {}) => {
    _lastCallbacks = {
      onStart: options.onStart || null,
      onDone: options.onDone || null,
      onStopped: options.onStopped || null,
      onError: options.onError || null,
    };
    // 【根拠】speak が呼ばれたら isSpeaking 状態を true にする
    _isSpeaking = true;
  }),

  stop: jest.fn().mockResolvedValue(undefined),

  isSpeakingAsync: jest.fn(() => Promise.resolve(_isSpeaking)),
};

// =================================================================
// テストヘルパー
// =================================================================

/**
 * 【目的】speak の onStart コールバックを手動発火する
 */
function __triggerOnStart() {
  if (_lastCallbacks.onStart) {
    _lastCallbacks.onStart();
  }
}

/**
 * 【目的】speak の onDone コールバックを手動発火する
 */
function __triggerOnDone() {
  _isSpeaking = false;
  if (_lastCallbacks.onDone) {
    _lastCallbacks.onDone();
  }
}

/**
 * 【目的】speak の onStopped コールバックを手動発火する
 */
function __triggerOnStopped() {
  _isSpeaking = false;
  if (_lastCallbacks.onStopped) {
    _lastCallbacks.onStopped();
  }
}

/**
 * 【目的】speak の onError コールバックを手動発火する
 */
function __triggerOnError(error) {
  _isSpeaking = false;
  if (_lastCallbacks.onError) {
    _lastCallbacks.onError(error);
  }
}

/**
 * 【目的】モック状態をリセットする
 */
function __resetState() {
  _lastCallbacks = {
    onStart: null,
    onDone: null,
    onStopped: null,
    onError: null,
  };
  _isSpeaking = false;
}

/**
 * 【目的】isSpeaking の状態を手動で設定する
 */
function __setIsSpeaking(value) {
  _isSpeaking = value;
}

// 【根拠】__esModule: true を設定することで、Babel の ESM 互換変換で
//        `import Speech from 'expo-speech'` が default プロパティを参照する
module.exports = {
  __esModule: true,
  default: Speech,
  __triggerOnStart,
  __triggerOnDone,
  __triggerOnStopped,
  __triggerOnError,
  __resetState,
  __setIsSpeaking,
};
