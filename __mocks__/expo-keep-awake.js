/**
 * 【目的】expo-keep-awake のテスト用モック
 * 【根拠】useKeepAwake はネイティブモジュール（NativeModule）に依存し、
 *        Jest 環境では実行不可。hook の呼び出しを検証するため jest.fn() でモック化する。
 */
module.exports = {
  useKeepAwake: jest.fn(),
};
