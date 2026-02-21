/**
 * 【目的】AsyncStorage のテスト用インメモリモック
 * 【根拠】zustand persist ミドルウェアが AsyncStorage を永続化先として使用するため、
 *        Jest 環境ではネイティブモジュールの代わりにインメモリストアで動作を再現する。
 *        __mocks__/ ディレクトリ方式を採用する理由は、jest.setup.ts 内の jest.mock() が
 *        NativeWind (react-native-css-interop) のスコープ制限に抵触するため。
 */
let store = {};

const AsyncStorage = {
  getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete store[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store = {};
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
  multiGet: jest.fn((keys) =>
    Promise.resolve(keys.map((k) => [k, store[k] ?? null]))
  ),
  multiSet: jest.fn((pairs) => {
    pairs.forEach(([k, v]) => {
      store[k] = v;
    });
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys) => {
    keys.forEach((k) => {
      delete store[k];
    });
    return Promise.resolve();
  }),
  mergeItem: jest.fn((key, value) => {
    const existing = store[key];
    if (existing) {
      store[key] = JSON.stringify({
        ...JSON.parse(existing),
        ...JSON.parse(value),
      });
    } else {
      store[key] = value;
    }
    return Promise.resolve();
  }),
};

/**
 * 【目的】テスト間でストアとモック呼び出し履歴をリセットする
 * 【根拠】各テストが独立した状態で実行されるようにするため。
 */
AsyncStorage.__resetStore = () => {
  store = {};
  Object.values(AsyncStorage).forEach((fn) => {
    if (typeof fn === 'function' && fn.mockClear) fn.mockClear();
  });
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
