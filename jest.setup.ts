import '@testing-library/react-native/extend-expect';

// 【目的】診断ログ（console.log）のテスト出力を抑制する
// 【根拠】logger.ts が全サブシステムで console.log を使用するため、テスト実行時に大量の
//        ログ出力が発生する。console.warn/error は抑制しない（テスト中の問題検出に有用）。
jest.spyOn(console, 'log').mockImplementation(() => {});
