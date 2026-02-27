/**
 * 【目的】katakanaToHiragana のユニットテスト
 * 【根拠】カタカナ→ひらがな変換が正しく動作することを検証する。
 */

import { katakanaToHiragana, removeLongVowelMark } from '../kana-normalize';

describe('katakanaToHiragana', () => {
  it('「ミギ」を「みぎ」に変換する', () => {
    expect(katakanaToHiragana('ミギ')).toBe('みぎ');
  });

  it('「ヒダリ」を「ひだり」に変換する', () => {
    expect(katakanaToHiragana('ヒダリ')).toBe('ひだり');
  });

  it('「ロールバック」を「ろーるばっく」に変換する', () => {
    expect(katakanaToHiragana('ロールバック')).toBe('ろーるばっく');
  });

  it('「リセット」を「りせっと」に変換する', () => {
    expect(katakanaToHiragana('リセット')).toBe('りせっと');
  });

  it('漢字はそのまま保持する', () => {
    expect(katakanaToHiragana('右')).toBe('右');
  });

  it('空文字列はそのまま返す', () => {
    expect(katakanaToHiragana('')).toBe('');
  });

  it('混合文字列（漢字+カタカナ+ひらがな）を正しく変換する', () => {
    expect(katakanaToHiragana('右ミギみぎ')).toBe('右みぎみぎ');
  });

  it('長音記号「ー」は変換しない', () => {
    expect(katakanaToHiragana('ロール')).toBe('ろーる');
  });
});

describe('removeLongVowelMark', () => {
  it('末尾の長音記号を除去する（「スコアー」→「スコア」）', () => {
    expect(removeLongVowelMark('スコアー')).toBe('スコア');
  });

  it('中間の長音記号を除去する（「スコーア」→「スコア」）', () => {
    expect(removeLongVowelMark('スコーア')).toBe('スコア');
  });

  it('複数の長音記号を除去する（「ろーるばっく」→「ろるばっく」）', () => {
    expect(removeLongVowelMark('ろーるばっく')).toBe('ろるばっく');
  });

  it('長音記号がない場合はそのまま返す（「スコア」→「スコア」）', () => {
    expect(removeLongVowelMark('スコア')).toBe('スコア');
  });

  it('促音「ッ」「っ」は保持する（「リセット」→「リセット」）', () => {
    expect(removeLongVowelMark('リセット')).toBe('リセット');
  });
});
