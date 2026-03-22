import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { ListeningOverlay } from '../ListeningOverlay';

/**
 * 【目的】ListeningOverlay コンポーネントのユニットテスト
 * 【根拠】Task 7.1 の受け入れ条件:
 *        - LISTENING 状態でオーバーレイが表示される
 *        - マイクアイコンが表示される
 *        - 「Ready」テキストがシアンで表示される
 *        - カウントダウン秒数が表示される
 *        - ディム背景が表示される
 *        - visible=false で非表示になる
 */
describe('ListeningOverlay', () => {
  describe('visible=true の場合', () => {
    it('オーバーレイが表示される', () => {
      render(<ListeningOverlay visible={true} countdown={3} />);
      expect(screen.getByTestId('listening-overlay')).toBeTruthy();
    });

    it('マイクアイコンが表示される', () => {
      render(<ListeningOverlay visible={true} countdown={3} />);
      expect(screen.getByTestId('listening-mic-icon')).toBeTruthy();
    });

    it('「Ready」テキストが表示される', () => {
      render(<ListeningOverlay visible={true} countdown={3} />);
      expect(screen.getByText('Ready')).toBeTruthy();
    });

    it('カウントダウン秒数が表示される', () => {
      render(<ListeningOverlay visible={true} countdown={3} />);
      expect(screen.getByText('3s')).toBeTruthy();
    });

    it('ディム背景が表示される', () => {
      render(<ListeningOverlay visible={true} countdown={3} />);
      expect(screen.getByTestId('listening-dim-bg')).toBeTruthy();
    });

    it('同心円リングが表示される', () => {
      render(<ListeningOverlay visible={true} countdown={3} />);
      expect(screen.getByTestId('listening-ring-outer')).toBeTruthy();
      expect(screen.getByTestId('listening-ring-middle')).toBeTruthy();
      expect(screen.getByTestId('listening-ring-inner')).toBeTruthy();
    });
  });

  describe('カウントダウン表示', () => {
    it('countdown=2 のとき「2s」が表示される', () => {
      render(<ListeningOverlay visible={true} countdown={2} />);
      expect(screen.getByText('2s')).toBeTruthy();
    });

    it('countdown=1 のとき「1s」が表示される', () => {
      render(<ListeningOverlay visible={true} countdown={1} />);
      expect(screen.getByText('1s')).toBeTruthy();
    });
  });

  // =================================================================
  // Task 9.1: 認識テキストのリアルタイム表示
  // =================================================================
  describe('認識テキスト表示（Task 9.1）', () => {
    it('lastTranscript が渡された場合テキストが表示される', () => {
      render(
        <ListeningOverlay visible={true} countdown={8} lastTranscript="スコア" lastIsFinal={true} />
      );
      expect(screen.getByText('スコア')).toBeTruthy();
    });

    it('interim result（lastIsFinal=false）は "..." 接尾辞付きで表示される', () => {
      render(
        <ListeningOverlay visible={true} countdown={8} lastTranscript="すこ" lastIsFinal={false} />
      );
      expect(screen.getByText('すこ...')).toBeTruthy();
    });

    it('lastTranscript が空文字の場合テキストが表示されない', () => {
      render(
        <ListeningOverlay visible={true} countdown={8} lastTranscript="" lastIsFinal={false} />
      );
      expect(screen.queryByTestId('listening-transcript')).toBeNull();
    });

    it('lastTranscript が未指定の場合テキストが表示されない', () => {
      render(<ListeningOverlay visible={true} countdown={8} />);
      expect(screen.queryByTestId('listening-transcript')).toBeNull();
    });
  });

  describe('visible=false の場合', () => {
    it('何も表示されない', () => {
      render(<ListeningOverlay visible={false} countdown={3} />);
      expect(screen.queryByTestId('listening-overlay')).toBeNull();
    });
  });
});
