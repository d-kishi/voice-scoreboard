import { glowStyles, createGlow } from '../glow-styles';

describe('glow-styles', () => {
  describe('glowStyles（プリセット）', () => {
    it('white グロー効果が白色の textShadow プロパティを持つ', () => {
      const style = glowStyles.white;
      expect(style.textShadowColor).toBe('rgba(255, 255, 255, 0.8)');
      expect(style.textShadowOffset).toEqual({ width: 0, height: 0 });
      expect(style.textShadowRadius).toBeGreaterThan(0);
    });

    it('cyan グロー効果がシアンの textShadow プロパティを持つ', () => {
      const style = glowStyles.cyan;
      expect(style.textShadowColor).toBe('rgba(0, 229, 255, 0.8)');
      expect(style.textShadowOffset).toEqual({ width: 0, height: 0 });
      expect(style.textShadowRadius).toBeGreaterThan(0);
    });

    it('gold グロー効果がゴールドの textShadow プロパティを持つ', () => {
      const style = glowStyles.gold;
      expect(style.textShadowColor).toBe('rgba(245, 158, 11, 0.8)');
      expect(style.textShadowOffset).toEqual({ width: 0, height: 0 });
      expect(style.textShadowRadius).toBeGreaterThan(0);
    });
  });

  describe('createGlow（カスタム）', () => {
    it('指定した色と半径でグロー効果を生成する', () => {
      const style = createGlow('rgba(255, 0, 0, 0.5)', 20);
      expect(style.textShadowColor).toBe('rgba(255, 0, 0, 0.5)');
      expect(style.textShadowOffset).toEqual({ width: 0, height: 0 });
      expect(style.textShadowRadius).toBe(20);
    });

    it('デフォルト半径で動作する', () => {
      const style = createGlow('rgba(0, 0, 255, 1)');
      expect(style.textShadowRadius).toBeGreaterThan(0);
    });
  });
});
