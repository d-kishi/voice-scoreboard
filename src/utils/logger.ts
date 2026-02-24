/**
 * 【目的】release ビルドの診断ログユーティリティ
 * 【根拠】logcat で `grep "VSB:"` でフィルタリング可能な統一プレフィックスを提供する。
 *        タグでサブシステム単位のフィルタリングも可能（例: `grep "VSB:SM"`）。
 */

/** 【目的】サブシステムを識別するログタグ */
type LogTag = 'SM' | 'SR' | 'SS' | 'SND' | 'CMD' | 'SCR' | 'SET' | 'APP';

function fmt(tag: LogTag, message: string): string {
  return `[VSB:${tag}] ${message}`;
}

export function log(tag: LogTag, message: string): void {
  console.log(fmt(tag, message));
}

export function warn(tag: LogTag, message: string): void {
  console.warn(fmt(tag, message));
}

export function error(tag: LogTag, message: string, err?: unknown): void {
  console.error(fmt(tag, message), err ?? '');
}
