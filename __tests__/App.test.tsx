import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { useScoreStore } from '../src/stores/score-store';

/**
 * 【目的】App コンポーネントの統合テスト
 * 【根拠】Task 7.3 の受け入れ条件:
 *        - useVoiceStateMachine が App に接続されている
 *        - ListeningOverlay が LISTENING 状態で表示される
 *        - LISTENING 以外の状態では ListeningOverlay が非表示
 *        - GameEndOverlay と ListeningOverlay が共存しない（通常フロー）
 */

// 【目的】useVoiceStateMachine をモック化して状態を制御可能にする
// 【根拠】App レベルのテストでは音声サービスの詳細を気にせず、
//        状態マシンの出力（state, countdown）のみを制御する
const mockUseVoiceStateMachine = jest.fn();
jest.mock('../src/features/voice/hooks/use-voice-state-machine', () => ({
  useVoiceStateMachine: () => mockUseVoiceStateMachine(),
}));

// 【目的】useGameEndWhistle をモック化（副作用を防ぐ）
jest.mock('../src/features/score/hooks/use-game-end-whistle', () => ({
  useGameEndWhistle: jest.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    useScoreStore.setState({ leftScore: 0, rightScore: 0, isGameEnd: false });
    useScoreStore.temporal.getState().clear();
    mockUseVoiceStateMachine.mockReturnValue({
      state: 'IDLE',
      countdown: 0,
      start: jest.fn(),
      stop: jest.fn(),
    });
  });

  // 【目的】遅延 import でモック設定後に App を読み込む
  function renderApp() {
    const App = require('../App').default;
    return render(<App />);
  }

  describe('ListeningOverlay の統合', () => {
    it('IDLE 状態では ListeningOverlay が表示されない', () => {
      mockUseVoiceStateMachine.mockReturnValue({
        state: 'IDLE',
        countdown: 0,
        start: jest.fn(),
        stop: jest.fn(),
      });

      renderApp();
      expect(screen.queryByTestId('listening-overlay')).toBeNull();
    });

    it('LISTENING 状態で ListeningOverlay が表示される', () => {
      mockUseVoiceStateMachine.mockReturnValue({
        state: 'LISTENING',
        countdown: 3,
        start: jest.fn(),
        stop: jest.fn(),
      });

      renderApp();
      expect(screen.getByTestId('listening-overlay')).toBeTruthy();
    });

    it('LISTENING 状態でカウントダウンが正しく表示される', () => {
      mockUseVoiceStateMachine.mockReturnValue({
        state: 'LISTENING',
        countdown: 2,
        start: jest.fn(),
        stop: jest.fn(),
      });

      renderApp();
      expect(screen.getByText('2s')).toBeTruthy();
    });

    it('SPEAKING_READY 状態では ListeningOverlay が表示されない', () => {
      mockUseVoiceStateMachine.mockReturnValue({
        state: 'SPEAKING_READY',
        countdown: 0,
        start: jest.fn(),
        stop: jest.fn(),
      });

      renderApp();
      expect(screen.queryByTestId('listening-overlay')).toBeNull();
    });

    it('SPEAKING_ROGER 状態では ListeningOverlay が表示されない', () => {
      mockUseVoiceStateMachine.mockReturnValue({
        state: 'SPEAKING_ROGER',
        countdown: 0,
        start: jest.fn(),
        stop: jest.fn(),
      });

      renderApp();
      expect(screen.queryByTestId('listening-overlay')).toBeNull();
    });
  });

  describe('GameEndOverlay との共存', () => {
    it('試合終了時は GameEndOverlay が表示され ListeningOverlay は非表示', () => {
      useScoreStore.setState({ leftScore: 25, rightScore: 20, isGameEnd: true });
      mockUseVoiceStateMachine.mockReturnValue({
        state: 'IDLE',
        countdown: 0,
        start: jest.fn(),
        stop: jest.fn(),
      });

      renderApp();
      expect(screen.getByTestId('game-end-overlay')).toBeTruthy();
      expect(screen.queryByTestId('listening-overlay')).toBeNull();
    });
  });
});
