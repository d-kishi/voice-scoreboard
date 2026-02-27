/**
 * 【目的】コマンドパーサーのユニットテスト
 * 【根拠】TDD の RED フェーズとして、日本語テキスト → VoiceCommand 変換の
 *        期待動作を先にテストで定義する。部分一致・優先度・異常系をカバーする。
 */

import {
  parseCommand,
  parseCommandFromAlternatives,
  isWakeword,
  isWakewordInAlternatives,
} from '../command-parser';

describe('parseCommand', () => {
  // =================================================================
  // 正常系: 完全一致
  // =================================================================
  describe('完全一致', () => {
    it('「右」を right に変換する', () => {
      expect(parseCommand('右')).toBe('right');
    });

    it('「左」を left に変換する', () => {
      expect(parseCommand('左')).toBe('left');
    });

    it('「ロールバック」を rollback に変換する', () => {
      expect(parseCommand('ロールバック')).toBe('rollback');
    });

    it('「リセット」を reset に変換する', () => {
      expect(parseCommand('リセット')).toBe('reset');
    });
  });

  // =================================================================
  // 正常系: 部分一致（認識ノイズ付き）
  // =================================================================
  describe('部分一致', () => {
    it('「右側」を right に変換する', () => {
      expect(parseCommand('右側')).toBe('right');
    });

    it('「左です」を left に変換する', () => {
      expect(parseCommand('左です')).toBe('left');
    });

    it('「ロールバックして」を rollback に変換する', () => {
      expect(parseCommand('ロールバックして')).toBe('rollback');
    });

    it('「リセットお願い」を reset に変換する', () => {
      expect(parseCommand('リセットお願い')).toBe('reset');
    });
  });

  // =================================================================
  // 異常系
  // =================================================================
  describe('異常系', () => {
    it('認識できないテキストは null を返す', () => {
      expect(parseCommand('こんにちは')).toBeNull();
    });

    it('空文字列は null を返す', () => {
      expect(parseCommand('')).toBeNull();
    });
  });

  // =================================================================
  // ひらがな/カタカナマッチ
  // =================================================================
  describe('ひらがな/カタカナマッチ', () => {
    it('「みぎ」を right に変換する', () => {
      expect(parseCommand('みぎ')).toBe('right');
    });

    it('「ひだり」を left に変換する', () => {
      expect(parseCommand('ひだり')).toBe('left');
    });

    it('「ミギ」を right に変換する（カタカナ→ひらがな正規化）', () => {
      expect(parseCommand('ミギ')).toBe('right');
    });

    it('「ヒダリ」を left に変換する（カタカナ→ひらがな正規化）', () => {
      expect(parseCommand('ヒダリ')).toBe('left');
    });

    it('「ろーるばっく」を rollback に変換する', () => {
      expect(parseCommand('ろーるばっく')).toBe('rollback');
    });

    it('「りせっと」を reset に変換する', () => {
      expect(parseCommand('りせっと')).toBe('reset');
    });
  });

  // =================================================================
  // 長音記号の正規化（フォールバック）
  // =================================================================
  describe('長音記号の正規化（フォールバック）', () => {
    it('「ろーるばっく」をー除去なしで rollback に変換する（第一優先で一致）', () => {
      expect(parseCommand('ろーるばっく')).toBe('rollback');
    });

    it('「ロルバック」を rollback に変換する（ー除去済み形式でマッチ）', () => {
      expect(parseCommand('ロルバック')).toBe('rollback');
    });

    it('「みぎー」を right に変換する（末尾ー付き）', () => {
      expect(parseCommand('みぎー')).toBe('right');
    });

    it('「ひだりー」を left に変換する（末尾ー付き）', () => {
      expect(parseCommand('ひだりー')).toBe('left');
    });
  });

  // =================================================================
  // 優先度
  // =================================================================
  describe('優先度', () => {
    it('最初にマッチしたコマンドが返される', () => {
      // 【根拠】COMMAND_MAP の順序でマッチングが行われることを確認
      expect(parseCommand('ロールバック')).toBe('rollback');
    });
  });
});

describe('isWakeword', () => {
  // =================================================================
  // 正常系
  // =================================================================
  it('「スコア」を検知する', () => {
    expect(isWakeword('スコア')).toBe(true);
  });

  it('「スコアボード」を検知する（部分一致）', () => {
    expect(isWakeword('スコアボード')).toBe(true);
  });

  it('「スコアを教えて」を検知する', () => {
    expect(isWakeword('スコアを教えて')).toBe(true);
  });

  // =================================================================
  // 異常系
  // =================================================================
  it('「すこあ」を検知する（ひらがな正規化対応）', () => {
    expect(isWakeword('すこあ')).toBe(true);
  });

  it('空文字列は false', () => {
    expect(isWakeword('')).toBe(false);
  });

  it('無関係なテキストは false', () => {
    expect(isWakeword('右')).toBe(false);
  });

  // =================================================================
  // 長音記号の正規化（フォールバック）
  // =================================================================
  it('「スコーア」を検知する（中間ー挿入のフォールバック）', () => {
    expect(isWakeword('スコーア')).toBe(true);
  });

  it('「すこあー」を検知する（末尾ー付き）', () => {
    expect(isWakeword('すこあー')).toBe(true);
  });
});

// =================================================================
// parseCommandFromAlternatives
// =================================================================
describe('parseCommandFromAlternatives', () => {
  it('第1候補不一致、第2候補でマッチする', () => {
    expect(parseCommandFromAlternatives(['こんにちは', '右'])).toBe('right');
  });

  it('第1候補でマッチする', () => {
    expect(parseCommandFromAlternatives(['左', 'こんにちは'])).toBe('left');
  });

  it('全候補不一致で null を返す', () => {
    expect(parseCommandFromAlternatives(['こんにちは', 'さようなら'])).toBeNull();
  });

  it('空配列で null を返す', () => {
    expect(parseCommandFromAlternatives([])).toBeNull();
  });
});

// =================================================================
// isWakewordInAlternatives
// =================================================================
describe('isWakewordInAlternatives', () => {
  it('第1候補不一致、第2候補でウェイクワードを検知する', () => {
    expect(isWakewordInAlternatives(['こんにちは', 'スコア'])).toBe(true);
  });

  it('第1候補でウェイクワードを検知する', () => {
    expect(isWakewordInAlternatives(['スコアボード', 'こんにちは'])).toBe(true);
  });

  it('全候補不一致で false を返す', () => {
    expect(isWakewordInAlternatives(['こんにちは', 'さようなら'])).toBe(false);
  });

  it('空配列で false を返す', () => {
    expect(isWakewordInAlternatives([])).toBe(false);
  });
});
