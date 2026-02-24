/**
 * 【目的】useVoiceStateMachine hook の統合テスト
 * 【根拠】TDD の RED フェーズとして、状態マシンと外部サービスの統合動作を
 *        先にテストで定義する。renderHook + act でhookをテストし、
 *        サービスは jest.mock() でモック化する。
 *        既存モック（expo-speech-recognition, expo-speech）のテストヘルパーを活用する。
 */

import { renderHook, act } from '@testing-library/react-native';
import { useVoiceStateMachine } from '../use-voice-state-machine';
import { LISTENING_DURATION } from '../voice-state-reducer';
import {
  startRecognition,
  abortRecognition,
} from '../../services/speech-recognition';
import {
  speakReady,
  speakRoger,
  speakScore,
  stopSpeaking,
} from '../../services/speech-synthesis';
import { useScore } from '../../../score/hooks/use-score';
import { useSettings } from '../../../settings/hooks/use-settings';
import type { SpeechRecognitionOptions } from '../../services/speech-recognition';

// =================================================================
// モック設定
// =================================================================

jest.mock('../../services/speech-recognition');
jest.mock('../../services/speech-synthesis');
jest.mock('../../../score/hooks/use-score');
jest.mock('../../../settings/hooks/use-settings');

// 【目的】型付きモック変数の宣言
const mockStartRecognition = startRecognition as jest.MockedFunction<
  typeof startRecognition
>;
const mockAbortRecognition = abortRecognition as jest.MockedFunction<
  typeof abortRecognition
>;
const mockSpeakReady = speakReady as jest.MockedFunction<typeof speakReady>;
const mockSpeakRoger = speakRoger as jest.MockedFunction<typeof speakRoger>;
const mockSpeakScore = speakScore as jest.MockedFunction<typeof speakScore>;
const mockStopSpeaking = stopSpeaking as jest.MockedFunction<
  typeof stopSpeaking
>;
const mockUseScore = useScore as jest.MockedFunction<typeof useScore>;
const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;

// 【目的】useScore のモック関数を保持する変数
const mockIncrementScore = jest.fn();
const mockRollback = jest.fn();
const mockReset = jest.fn();

// =================================================================
// テストヘルパー
// =================================================================

/**
 * 【目的】デフォルトの useScore / useSettings モックを設定する
 */
function setupDefaultMocks(
  overrides?: {
    isVoiceRecognitionEnabled?: boolean;
    isSpeechEnabled?: boolean;
    leftScore?: number;
    rightScore?: number;
  }
): void {
  const {
    isVoiceRecognitionEnabled = true,
    isSpeechEnabled = true,
    leftScore = 0,
    rightScore = 0,
  } = overrides ?? {};

  mockUseScore.mockReturnValue({
    leftScore,
    rightScore,
    isGameEnd: false,
    canUndo: false,
    incrementScore: mockIncrementScore,
    decrementScore: jest.fn(),
    rollback: mockRollback,
    reset: mockReset,
  });

  mockUseSettings.mockReturnValue({
    isVoiceRecognitionEnabled,
    isSpeechEnabled,
    hasHydrated: true,
    toggleVoiceRecognition: jest.fn(),
    toggleSpeech: jest.fn(),
  });
}

/**
 * 【目的】startRecognition のモックから最後に渡された options を取得する
 */
function getLastRecognitionOptions(): SpeechRecognitionOptions {
  const calls = mockStartRecognition.mock.calls;
  return calls[calls.length - 1][0];
}

/**
 * 【目的】ウェイクワード検知をシミュレートする
 *        startRecognition に渡された onResult を呼び出す
 */
function simulateWakeword(): void {
  const options = getLastRecognitionOptions();
  options.onResult('スコア', true);
}

/**
 * 【目的】コマンド認識結果をシミュレートする
 */
function simulateCommand(transcript: string): void {
  const options = getLastRecognitionOptions();
  options.onResult(transcript, true);
}

/**
 * 【目的】speakReady の onDone コールバックをトリガーする
 */
function triggerSpeakReadyDone(): void {
  const calls = mockSpeakReady.mock.calls;
  const lastCall = calls[calls.length - 1];
  lastCall[0](); // onDone callback
}

/**
 * 【目的】speakRoger の onDone コールバックをトリガーする
 */
function triggerSpeakRogerDone(): void {
  const calls = mockSpeakRoger.mock.calls;
  const lastCall = calls[calls.length - 1];
  lastCall[0](); // onDone callback
}

/**
 * 【目的】speakScore の onDone コールバックをトリガーする
 */
function triggerSpeakScoreDone(): void {
  const calls = mockSpeakScore.mock.calls;
  const lastCall = calls[calls.length - 1];
  lastCall[2](); // onDone callback (3rd argument)
}

// =================================================================
// テスト本体
// =================================================================

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  setupDefaultMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useVoiceStateMachine', () => {
  // =================================================================
  // 初期状態
  // =================================================================
  describe('初期状態', () => {
    it('初期状態は IDLE', () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      expect(result.current.state).toBe('IDLE');
    });

    it('初期 countdown は 0', () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      expect(result.current.countdown).toBe(0);
    });

    it('IDLE 状態でウェイクワード認識が開始される', () => {
      renderHook(() => useVoiceStateMachine());
      expect(mockStartRecognition).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'wakeword' })
      );
    });
  });

  // =================================================================
  // ウェイクワード検知フロー
  // =================================================================
  describe('ウェイクワード検知フロー', () => {
    it('ウェイクワード検知で SPEAKING_READY に遷移する', () => {
      const { result } = renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });

      expect(result.current.state).toBe('SPEAKING_READY');
    });

    it('SPEAKING_READY で abortRecognition が呼ばれる', () => {
      const { result } = renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });

      expect(mockAbortRecognition).toHaveBeenCalled();
    });

    it('SPEAKING_READY で speakReady が呼ばれる', () => {
      renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });

      expect(mockSpeakReady).toHaveBeenCalled();
    });

    it('Ready 読み上げ完了で LISTENING に遷移する', () => {
      const { result } = renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });
      act(() => {
        triggerSpeakReadyDone();
      });

      expect(result.current.state).toBe('LISTENING');
    });

    it('LISTENING 遷移時に countdown が LISTENING_DURATION になる', () => {
      const { result } = renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });
      act(() => {
        triggerSpeakReadyDone();
      });

      expect(result.current.countdown).toBe(LISTENING_DURATION);
    });

    it('LISTENING 状態で command モードの認識が開始される', () => {
      renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });
      act(() => {
        triggerSpeakReadyDone();
      });

      expect(mockStartRecognition).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'command' })
      );
    });
  });

  // =================================================================
  // コマンド実行フロー（得点加算）
  // =================================================================
  describe('コマンド実行フロー（得点加算）', () => {
    /**
     * 【目的】IDLE → SPEAKING_READY → LISTENING まで遷移させるヘルパー
     */
    function advanceToListening(
      result: { current: ReturnType<typeof useVoiceStateMachine> }
    ): void {
      act(() => {
        simulateWakeword();
      });
      act(() => {
        triggerSpeakReadyDone();
      });
      expect(result.current.state).toBe('LISTENING');
    }

    it('「右」検知で SPEAKING_ROGER に遷移する', () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      advanceToListening(result);

      act(() => {
        simulateCommand('右');
      });

      expect(result.current.state).toBe('SPEAKING_ROGER');
    });

    it('SPEAKING_ROGER で abortRecognition が呼ばれる（排他制御）', () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      advanceToListening(result);
      mockAbortRecognition.mockClear();

      act(() => {
        simulateCommand('右');
      });

      expect(mockAbortRecognition).toHaveBeenCalled();
    });

    it('SPEAKING_ROGER で speakRoger が呼ばれる', () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      advanceToListening(result);

      act(() => {
        simulateCommand('右');
      });

      expect(mockSpeakRoger).toHaveBeenCalled();
    });

    it('Roger 完了で EXECUTING → incrementScore → IDLE', () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      advanceToListening(result);

      act(() => {
        simulateCommand('右');
      });
      act(() => {
        triggerSpeakRogerDone();
      });

      expect(mockIncrementScore).toHaveBeenCalledWith('right');
      expect(result.current.state).toBe('IDLE');
    });

    it('「左」検知で incrementScore(left) が呼ばれる', () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      advanceToListening(result);

      act(() => {
        simulateCommand('左');
      });
      act(() => {
        triggerSpeakRogerDone();
      });

      expect(mockIncrementScore).toHaveBeenCalledWith('left');
    });

    it('得点加算時はスコア読み上げなし（SPEAKING_SCORE をスキップ）', () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      advanceToListening(result);

      act(() => {
        simulateCommand('右');
      });
      act(() => {
        triggerSpeakRogerDone();
      });

      expect(mockSpeakScore).not.toHaveBeenCalled();
      expect(result.current.state).toBe('IDLE');
    });
  });

  // =================================================================
  // コマンド実行フロー（ロールバック/リセット）
  // =================================================================
  describe('コマンド実行フロー（ロールバック/リセット）', () => {
    function advanceToListening(
      result: { current: ReturnType<typeof useVoiceStateMachine> }
    ): void {
      act(() => {
        simulateWakeword();
      });
      act(() => {
        triggerSpeakReadyDone();
      });
    }

    it('「ロールバック」→ rollback() → SPEAKING_SCORE → スコア読み上げ → IDLE', () => {
      setupDefaultMocks({ leftScore: 10, rightScore: 5 });
      const { result } = renderHook(() => useVoiceStateMachine());
      advanceToListening(result);

      act(() => {
        simulateCommand('ロールバック');
      });
      act(() => {
        triggerSpeakRogerDone();
      });

      expect(mockRollback).toHaveBeenCalled();
      expect(result.current.state).toBe('SPEAKING_SCORE');
      expect(mockSpeakScore).toHaveBeenCalledWith(10, 5, expect.any(Function));

      act(() => {
        triggerSpeakScoreDone();
      });

      expect(result.current.state).toBe('IDLE');
    });

    it('「リセット」→ reset() → SPEAKING_SCORE → スコア読み上げ → IDLE', () => {
      setupDefaultMocks({ leftScore: 15, rightScore: 20 });
      const { result } = renderHook(() => useVoiceStateMachine());
      advanceToListening(result);

      act(() => {
        simulateCommand('リセット');
      });
      act(() => {
        triggerSpeakRogerDone();
      });

      expect(mockReset).toHaveBeenCalled();
      expect(result.current.state).toBe('SPEAKING_SCORE');

      act(() => {
        triggerSpeakScoreDone();
      });

      expect(result.current.state).toBe('IDLE');
    });
  });

  // =================================================================
  // タイムアウト
  // =================================================================
  describe('タイムアウト', () => {
    function advanceToListening(
      result: { current: ReturnType<typeof useVoiceStateMachine> }
    ): void {
      act(() => {
        simulateWakeword();
      });
      act(() => {
        triggerSpeakReadyDone();
      });
    }

    it('カウントダウンが毎秒デクリメントされる', () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      advanceToListening(result);
      expect(result.current.countdown).toBe(LISTENING_DURATION);

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.countdown).toBe(LISTENING_DURATION - 1);

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.countdown).toBe(LISTENING_DURATION - 2);
    });

    it(`${LISTENING_DURATION} 秒経過で IDLE に戻る`, () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      advanceToListening(result);

      act(() => {
        jest.advanceTimersByTime(LISTENING_DURATION * 1000);
      });

      expect(result.current.state).toBe('IDLE');
    });

    it('コマンド検知時にタイマーがキャンセルされる（タイムアウトで IDLE に戻らない）', () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      advanceToListening(result);

      // 1 秒経過後にコマンド検知
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      act(() => {
        simulateCommand('右');
      });

      // さらに 2 秒経過してもタイムアウトしない
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.state).toBe('SPEAKING_ROGER');
    });
  });

  // =================================================================
  // 排他制御
  // =================================================================
  describe('排他制御', () => {
    it('SPEAKING_READY 中は abortRecognition が呼ばれる', () => {
      renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });

      expect(mockAbortRecognition).toHaveBeenCalled();
    });

    it('SPEAKING_ROGER 中は abortRecognition が呼ばれる', () => {
      const { result } = renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });
      act(() => {
        triggerSpeakReadyDone();
      });
      mockAbortRecognition.mockClear();

      act(() => {
        simulateCommand('右');
      });

      expect(mockAbortRecognition).toHaveBeenCalled();
    });
  });

  // =================================================================
  // 設定反映
  // =================================================================
  describe('設定反映', () => {
    it('isVoiceRecognitionEnabled=false の場合、認識を開始しない', () => {
      setupDefaultMocks({ isVoiceRecognitionEnabled: false });
      renderHook(() => useVoiceStateMachine());

      expect(mockStartRecognition).not.toHaveBeenCalled();
    });

    it('isSpeechEnabled=false の場合、SPEAKING_READY をスキップする', () => {
      setupDefaultMocks({ isSpeechEnabled: false });
      const { result } = renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });

      // 【根拠】読み上げ OFF 時は speakReady を呼ばず、
      //        即座に SPEECH_READY_DONE が dispatch されて LISTENING に遷移する
      expect(mockSpeakReady).not.toHaveBeenCalled();
      expect(result.current.state).toBe('LISTENING');
    });

    it('isSpeechEnabled=false の場合、SPEAKING_ROGER をスキップする', () => {
      setupDefaultMocks({ isSpeechEnabled: false });
      const { result } = renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });
      // LISTENING に直接遷移済み
      act(() => {
        simulateCommand('右');
      });

      expect(mockSpeakRoger).not.toHaveBeenCalled();
      // SPEAKING_ROGER → EXECUTING → IDLE まで即座に遷移
      expect(mockIncrementScore).toHaveBeenCalledWith('right');
      expect(result.current.state).toBe('IDLE');
    });

    it('isSpeechEnabled=false の場合、SPEAKING_SCORE をスキップする', () => {
      setupDefaultMocks({ isSpeechEnabled: false, leftScore: 5, rightScore: 3 });
      const { result } = renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });
      act(() => {
        simulateCommand('ロールバック');
      });

      expect(mockSpeakScore).not.toHaveBeenCalled();
      expect(mockRollback).toHaveBeenCalled();
      expect(result.current.state).toBe('IDLE');
    });
  });

  // =================================================================
  // stop()
  // =================================================================
  describe('stop()', () => {
    it('LISTENING 状態から IDLE に戻る', () => {
      const { result } = renderHook(() => useVoiceStateMachine());

      act(() => {
        simulateWakeword();
      });
      act(() => {
        triggerSpeakReadyDone();
      });
      expect(result.current.state).toBe('LISTENING');

      act(() => {
        result.current.stop();
      });

      expect(result.current.state).toBe('IDLE');
    });

    it('stop() で abortRecognition が呼ばれる', () => {
      const { result } = renderHook(() => useVoiceStateMachine());
      mockAbortRecognition.mockClear();

      act(() => {
        result.current.stop();
      });

      expect(mockAbortRecognition).toHaveBeenCalled();
    });

    it('stop() で stopSpeaking が呼ばれる', () => {
      const { result } = renderHook(() => useVoiceStateMachine());

      act(() => {
        result.current.stop();
      });

      expect(mockStopSpeaking).toHaveBeenCalled();
    });
  });

  // =================================================================
  // wakeword セッション終了時の再開始
  // =================================================================
  describe('wakeword セッション終了時の再開始', () => {
    it('IDLE 状態で wakeword セッションが終了すると再開始される', () => {
      renderHook(() => useVoiceStateMachine());

      // 【根拠】初回レンダリング時に state 効果 + settings 効果の両方で startRecognition が呼ばれる。
      //        continuous: true でもエラー等でセッションが終了する場合がある。
      //        onEnd が呼ばれたら、追加で startRecognition が呼ばれることを確認。
      const callsBefore = mockStartRecognition.mock.calls.length;

      act(() => {
        const options = getLastRecognitionOptions();
        options.onEnd();
      });

      expect(mockStartRecognition).toHaveBeenCalledTimes(callsBefore + 1);
      expect(mockStartRecognition).toHaveBeenLastCalledWith(
        expect.objectContaining({ mode: 'wakeword' })
      );
    });

    it('音声認識 OFF の場合、wakeword セッション終了後に再開始しない', () => {
      setupDefaultMocks({ isVoiceRecognitionEnabled: false });
      renderHook(() => useVoiceStateMachine());

      // 【根拠】音声認識が無効の場合は startRecognition 自体が呼ばれていない
      expect(mockStartRecognition).not.toHaveBeenCalled();
    });
  });

  // =================================================================
  // クリーンアップ
  // =================================================================
  describe('クリーンアップ', () => {
    it('アンマウント時に abortRecognition が呼ばれる', () => {
      const { unmount } = renderHook(() => useVoiceStateMachine());
      mockAbortRecognition.mockClear();

      unmount();

      expect(mockAbortRecognition).toHaveBeenCalled();
    });

    it('アンマウント時に stopSpeaking が呼ばれる', () => {
      const { unmount } = renderHook(() => useVoiceStateMachine());

      unmount();

      expect(mockStopSpeaking).toHaveBeenCalled();
    });
  });
});
