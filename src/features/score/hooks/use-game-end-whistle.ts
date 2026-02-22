/**
 * 【目的】試合終了時のホイッスル音再生を管理するカスタム hook
 * 【根拠】App.tsx の M4 検証コードを正式な hook として抽出する。
 *        isGameEnd の状態変化（false → true）を検知してホイッスル音を再生する。
 *        スコア変更のトリガーがタッチ操作でも音声コマンドでも、
 *        isGameEnd は zustand ストア経由で変化するため、同一ロジックで両方をカバーする。
 *        Requirements: 3.3, 6.6
 *        Contract: GameEndOverlay（design.md の SoundService 連携）
 */

import { useEffect, useRef } from 'react';
import * as SoundService from '../../voice/services/sound';

/**
 * 【目的】試合終了時にホイッスル音を再生する
 * 【根拠】useRef で前回の isGameEnd を追跡し、false → true の遷移のみで発火する。
 *        true → true の再レンダリングでは重複再生しない。
 *        SoundService 自体が Graceful Degradation を実装しているため、
 *        エラー時は音なしで続行する。
 *
 * @param isGameEnd 試合終了フラグ
 */
export function useGameEndWhistle(isGameEnd: boolean): void {
  // 【目的】アプリ起動時にサウンドアセットをプリロードする
  // 【根拠】試合終了時の再生遅延をなくすため、マウント時に事前ロードする。
  //        SoundService.preload() は内部で重複実行を防止しているため、
  //        複数箇所から呼ばれても安全。
  useEffect(() => {
    SoundService.preload().catch(() => {
      // Graceful Degradation: プリロード失敗時は音なしで続行
    });
  }, []);

  // 【目的】isGameEnd の前回値を保持し、false → true の遷移を検知する
  const prevGameEnd = useRef(false);

  useEffect(() => {
    if (isGameEnd && !prevGameEnd.current) {
      // 【目的】試合終了遷移時にホイッスル音を再生する
      // 【根拠】SoundService.play() は Promise を返すが、
      //        ここでは再生完了を待つ必要がないため await しない。
      //        catch で例外を握り潰し、クラッシュを防ぐ。
      SoundService.play('whistle').catch(() => {
        // Graceful Degradation: 音なしで続行
      });
    }
    prevGameEnd.current = isGameEnd;
  }, [isGameEnd]);
}
