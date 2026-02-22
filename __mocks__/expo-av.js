/**
 * 【目的】expo-av のテスト用モック
 * 【根拠】ネイティブモジュールは Jest 環境で利用不可。
 *        Audio.Sound.createAsync() で生成される Sound インスタンスの
 *        playAsync/stopAsync/unloadAsync/setOnPlaybackStatusUpdate をシミュレートし、
 *        テストから再生完了（didJustFinish）を手動トリガーできる仕組みを提供する。
 */

// 【目的】最後に setOnPlaybackStatusUpdate で登録されたコールバックを保持する
let _playbackStatusCallback = null;

// 【目的】createAsync が返す Sound インスタンスのモック
const _mockSoundInstance = {
  playAsync: jest.fn().mockResolvedValue(undefined),
  stopAsync: jest.fn().mockResolvedValue(undefined),
  unloadAsync: jest.fn().mockResolvedValue(undefined),
  setOnPlaybackStatusUpdate: jest.fn((callback) => {
    _playbackStatusCallback = callback;
  }),
};

const Audio = {
  Sound: {
    // 【根拠】createAsync は { sound } を返す。毎回同じインスタンスを返すことで、
    //        テスト側で _mockSoundInstance を参照して呼び出し確認ができる
    createAsync: jest.fn().mockResolvedValue({ sound: _mockSoundInstance }),
  },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
};

// =================================================================
// テストヘルパー
// =================================================================

/**
 * 【目的】再生完了（didJustFinish: true）のステータスを手動トリガーする
 * 【根拠】Sound インスタンスの setOnPlaybackStatusUpdate コールバックに
 *        didJustFinish: true を含むステータスを送信し、再生完了をシミュレートする
 */
function __triggerPlaybackFinished() {
  if (_playbackStatusCallback) {
    _playbackStatusCallback({
      isLoaded: true,
      didJustFinish: true,
      isPlaying: false,
      positionMillis: 5000,
      durationMillis: 5000,
    });
  }
}

/**
 * 【目的】再生中ステータスを手動トリガーする
 */
function __triggerPlaybackStatus(status) {
  if (_playbackStatusCallback) {
    _playbackStatusCallback({
      isLoaded: true,
      didJustFinish: false,
      isPlaying: true,
      positionMillis: 0,
      durationMillis: 5000,
      ...status,
    });
  }
}

/**
 * 【目的】モック状態をリセットする
 * 【根拠】テスト間の状態リークを防止する
 */
function __resetState() {
  _playbackStatusCallback = null;
  _mockSoundInstance.playAsync.mockClear();
  _mockSoundInstance.stopAsync.mockClear();
  _mockSoundInstance.unloadAsync.mockClear();
  _mockSoundInstance.setOnPlaybackStatusUpdate.mockClear();
  Audio.Sound.createAsync.mockClear();
  Audio.Sound.createAsync.mockResolvedValue({ sound: _mockSoundInstance });
  Audio.setAudioModeAsync.mockClear();
}

/**
 * 【目的】Sound インスタンスのモックを取得する
 * 【根拠】テスト側で playAsync 等の呼び出し確認に使う
 */
function __getMockSoundInstance() {
  return _mockSoundInstance;
}

/**
 * 【目的】createAsync を失敗させるように設定する
 * 【根拠】エラーハンドリング（Graceful Degradation）のテストに使用
 */
function __setCreateAsyncToFail(error) {
  Audio.Sound.createAsync.mockRejectedValue(
    error || new Error('Failed to load audio')
  );
}

module.exports = {
  Audio,
  __triggerPlaybackFinished,
  __triggerPlaybackStatus,
  __resetState,
  __getMockSoundInstance,
  __setCreateAsyncToFail,
};
