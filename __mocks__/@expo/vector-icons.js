/**
 * 【目的】@expo/vector-icons のテスト用モック
 * 【根拠】expo-font の loadedNativeFonts はネイティブモジュールに依存し、
 *        Jest 環境では利用不可。アイコンコンポーネントを Text に置き換えて
 *        テスト可能にする。
 */
const React = require('react');
const { Text } = require('react-native');

function createMockIcon(displayName) {
  const Icon = (props) => React.createElement(Text, null, props.name);
  Icon.displayName = displayName;
  return Icon;
}

module.exports = {
  Feather: createMockIcon('Feather'),
  Ionicons: createMockIcon('Ionicons'),
};
