/**
 * 【目的】音声ファイル（.mp3, .wav, .ogg）のテスト用モック
 * 【根拠】Jest 環境では require() でバイナリファイルを読み込めないため、
 *        数値（Metro bundler がアセットに割り当てるのと同じ形式）を返す
 */
module.exports = 1;
