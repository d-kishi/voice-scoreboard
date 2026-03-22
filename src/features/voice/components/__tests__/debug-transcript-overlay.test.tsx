import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { DebugTranscriptOverlay } from '../DebugTranscriptOverlay';

/**
 * 【目的】DebugTranscriptOverlay コンポーネントのユニットテスト
 * 【根拠】Task 9.1: IDLE 状態でも認識結果を画面上に表示するデバッグUIの検証。
 *        実地検証でエンジンの認識結果を目視確認するための計測ツール。
 */
describe('DebugTranscriptOverlay', () => {
  it('visible=true かつ transcript がある場合テキストが表示される', () => {
    render(
      <DebugTranscriptOverlay visible={true} transcript="スコア" isFinal={true} />
    );
    expect(screen.getByTestId('debug-transcript-overlay')).toBeTruthy();
    expect(screen.getByText('スコア')).toBeTruthy();
  });

  it('interim result は黄色テキストで "..." 付きで表示される', () => {
    render(
      <DebugTranscriptOverlay visible={true} transcript="すこ" isFinal={false} />
    );
    expect(screen.getByText('すこ...')).toBeTruthy();
  });

  it('final result は緑色テキストで表示される', () => {
    render(
      <DebugTranscriptOverlay visible={true} transcript="右" isFinal={true} />
    );
    expect(screen.getByText('右')).toBeTruthy();
  });

  it('visible=false の場合何も表示されない', () => {
    render(
      <DebugTranscriptOverlay visible={false} transcript="スコア" isFinal={true} />
    );
    expect(screen.queryByTestId('debug-transcript-overlay')).toBeNull();
  });

  it('transcript が空文字の場合何も表示されない', () => {
    render(
      <DebugTranscriptOverlay visible={true} transcript="" isFinal={false} />
    );
    expect(screen.queryByTestId('debug-transcript-overlay')).toBeNull();
  });
});
