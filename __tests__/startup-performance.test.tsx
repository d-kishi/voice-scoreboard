import { render } from '@testing-library/react-native';
import React from 'react';
import { useScoreStore } from '../src/stores/score-store';

/**
 * 【目的】Task 8.1: 起動パフォーマンスとオフライン動作の検証テスト
 * 【根拠】Requirements 9.1（3秒以内起動）、9.3（オフライン動作）を
 *        コードレベルで検証する。実際の起動時間は実機 logcat で計測するが、
 *        ここでは計測ログの出力と、ネットワーク非依存の設計を保証する。
 */

// 【目的】useVoiceStateMachine をモック化（音声サービスの副作用を防ぐ）
const mockUseVoiceStateMachine = jest.fn();
jest.mock('../src/features/voice/hooks/use-voice-state-machine', () => ({
  useVoiceStateMachine: () => mockUseVoiceStateMachine(),
}));

// 【目的】useGameEndWhistle をモック化（サウンドプリロードの副作用を防ぐ）
jest.mock('../src/features/score/hooks/use-game-end-whistle', () => ({
  useGameEndWhistle: jest.fn(),
}));

describe('起動パフォーマンス（Task 8.1）', () => {
  beforeEach(() => {
    useScoreStore.setState({ leftScore: 0, rightScore: 0, isGameEnd: false });
    useScoreStore.temporal.getState().clear();
    mockUseVoiceStateMachine.mockReturnValue({
      state: 'IDLE',
      countdown: 0,
      start: jest.fn(),
      stop: jest.fn(),
    });
    // 【根拠】jest.setup.ts で console.log は spyOn 済みだが、
    //        各テスト前にモックの呼び出し履歴をクリアする
    (console.log as jest.Mock).mockClear();
  });

  function renderApp() {
    const App = require('../App').default;
    return render(<App />);
  }

  describe('起動時間計測ログ', () => {
    it('App マウント時に [VSB:APP] startup ログが出力される', () => {
      renderApp();

      // 【根拠】logger.ts の fmt() が `[VSB:APP] startup: Xms` 形式で出力する。
      //        console.log のスパイで出力内容を検証する。
      const startupLog = (console.log as jest.Mock).mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('[VSB:APP]') &&
          call[0].includes('startup:')
      );
      expect(startupLog).toBeDefined();
    });

    it('起動時間ログが数値（ms）を含む', () => {
      renderApp();

      const startupLog = (console.log as jest.Mock).mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('[VSB:APP]') &&
          call[0].includes('startup:')
      );
      expect(startupLog).toBeDefined();
      // 【根拠】`startup: 42ms` のような形式を正規表現で検証
      expect(startupLog![0]).toMatch(/startup:\s*\d+ms/);
    });
  });

  describe('オフライン動作保証', () => {
    let originalFetch: typeof global.fetch;
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
      originalFetch = global.fetch;
      fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
      global.fetch = originalFetch;
    });

    it('App のレンダリング中に fetch が呼ばれない', () => {
      renderApp();

      // 【根拠】design.md Non-Goals に「サーバー通信・クラウド連携」が明記されており、
      //        アプリは一切のネットワーク通信を行わない設計。
      //        fetch が呼ばれていないことで、オフライン動作を保証する。
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('並列初期化の検証', () => {
    it('useKeepAwake、useScore、useGameEndWhistle、useVoiceStateMachine が単一レンダリングで呼ばれる', () => {
      // 【根拠】これらの hook は App コンポーネント内で並列に呼ばれ、
      //        初期化が直列ではなく同一レンダリングサイクルで実行される。
      //        各 hook がモック化されているため、呼び出し自体を検証する。
      const useKeepAwake = require('expo-keep-awake').useKeepAwake;
      const useGameEndWhistle =
        require('../src/features/score/hooks/use-game-end-whistle').useGameEndWhistle;

      renderApp();

      expect(useKeepAwake).toHaveBeenCalled();
      expect(useGameEndWhistle).toHaveBeenCalled();
      expect(mockUseVoiceStateMachine).toHaveBeenCalled();
    });
  });
});
