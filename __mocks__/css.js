// 【目的】Jest で CSS ファイルの import をモック
// 【根拠】NativeWind の global.css は Metro bundler が処理するため、Jest 環境では空モジュールとして扱う
module.exports = {};
