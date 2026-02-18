import {
  checkGameEnd,
  isDeuce,
  DEFAULT_GAME_RULES_CONFIG,
  type GameRulesConfig,
} from '../game-rules';

/**
 * 【目的】GameRules 純粋関数の境界値テスト
 * 【根拠】6人制バレーボールの試合終了判定は、25点到達 + 2点差ルールと
 *        デュース（24-24以降）の2つのパターンがある。
 *        バグの入りやすい境界値を網羅してロジックの正確性を保証する。
 */
describe('GameRules', () => {
  describe('DEFAULT_GAME_RULES_CONFIG', () => {
    it('6人制バレーボールのデフォルト値を持つ', () => {
      expect(DEFAULT_GAME_RULES_CONFIG).toEqual({
        matchPoint: 25,
        deuceThreshold: 24,
        pointGap: 2,
      });
    });
  });

  describe('checkGameEnd', () => {
    const config = DEFAULT_GAME_RULES_CONFIG;

    describe('試合継続のケース', () => {
      it('0-0 は試合継続', () => {
        expect(checkGameEnd(0, 0, config)).toBe(false);
      });

      it('24-23 は試合継続（25点未到達）', () => {
        expect(checkGameEnd(24, 23, config)).toBe(false);
      });

      it('25-24 は試合継続（1点差）', () => {
        expect(checkGameEnd(25, 24, config)).toBe(false);
      });

      it('24-25 は試合継続（1点差、右側リード）', () => {
        expect(checkGameEnd(24, 25, config)).toBe(false);
      });

      it('24-24 は試合継続（デュース）', () => {
        expect(checkGameEnd(24, 24, config)).toBe(false);
      });

      it('29-28 は試合継続（デュース中、1点差）', () => {
        expect(checkGameEnd(29, 28, config)).toBe(false);
      });

      it('10-10 は試合継続', () => {
        expect(checkGameEnd(10, 10, config)).toBe(false);
      });
    });

    describe('試合終了のケース', () => {
      it('25-0 は試合終了（左側勝利）', () => {
        expect(checkGameEnd(25, 0, config)).toBe(true);
      });

      it('25-23 は試合終了（左側勝利、2点差）', () => {
        expect(checkGameEnd(25, 23, config)).toBe(true);
      });

      it('0-25 は試合終了（右側勝利）', () => {
        expect(checkGameEnd(0, 25, config)).toBe(true);
      });

      it('26-24 は試合終了（デュース後、2点差）', () => {
        expect(checkGameEnd(26, 24, config)).toBe(true);
      });

      it('24-26 は試合終了（デュース後、右側勝利）', () => {
        expect(checkGameEnd(24, 26, config)).toBe(true);
      });

      it('30-28 は試合終了（長デュース後）', () => {
        expect(checkGameEnd(30, 28, config)).toBe(true);
      });

      it('28-30 は試合終了（長デュース後、右側勝利）', () => {
        expect(checkGameEnd(28, 30, config)).toBe(true);
      });
    });

    describe('カスタム config', () => {
      it('matchPoint: 15 のルールで15-0が試合終了', () => {
        const customConfig: GameRulesConfig = {
          matchPoint: 15,
          deuceThreshold: 14,
          pointGap: 2,
        };
        expect(checkGameEnd(15, 0, customConfig)).toBe(true);
      });

      it('matchPoint: 15 のルールで14-13が試合継続', () => {
        const customConfig: GameRulesConfig = {
          matchPoint: 15,
          deuceThreshold: 14,
          pointGap: 2,
        };
        expect(checkGameEnd(14, 13, customConfig)).toBe(false);
      });

      it('matchPoint: 21 のルールで21-19が試合終了', () => {
        const customConfig: GameRulesConfig = {
          matchPoint: 21,
          deuceThreshold: 20,
          pointGap: 2,
        };
        expect(checkGameEnd(21, 19, customConfig)).toBe(true);
      });
    });
  });

  describe('isDeuce', () => {
    const config = DEFAULT_GAME_RULES_CONFIG;

    describe('デュースでないケース', () => {
      it('0-0 はデュースでない', () => {
        expect(isDeuce(0, 0, config)).toBe(false);
      });

      it('24-23 はデュースでない', () => {
        expect(isDeuce(24, 23, config)).toBe(false);
      });

      it('23-24 はデュースでない', () => {
        expect(isDeuce(23, 24, config)).toBe(false);
      });

      it('10-10 はデュースでない（deuceThreshold 未到達）', () => {
        expect(isDeuce(10, 10, config)).toBe(false);
      });
    });

    describe('デュースのケース', () => {
      it('24-24 はデュース', () => {
        expect(isDeuce(24, 24, config)).toBe(true);
      });

      it('25-24 はデュース（deuceThreshold 以上かつ1点差）', () => {
        expect(isDeuce(25, 24, config)).toBe(true);
      });

      it('24-25 はデュース（deuceThreshold 以上かつ1点差）', () => {
        expect(isDeuce(24, 25, config)).toBe(true);
      });

      it('29-28 はデュース', () => {
        expect(isDeuce(29, 28, config)).toBe(true);
      });

      it('28-29 はデュース', () => {
        expect(isDeuce(28, 29, config)).toBe(true);
      });

      it('30-30 はデュース', () => {
        expect(isDeuce(30, 30, config)).toBe(true);
      });
    });

    describe('デュースが解消されたケース（試合終了）', () => {
      it('26-24 はデュースではない（2点差がついて試合終了）', () => {
        expect(isDeuce(26, 24, config)).toBe(false);
      });

      it('30-28 はデュースではない（2点差がついて試合終了）', () => {
        expect(isDeuce(30, 28, config)).toBe(false);
      });
    });
  });
});
