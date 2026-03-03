export { Audio, AVPlaybackStatus } from 'expo-av';
export {};

declare module 'expo-av' {
  function __triggerPlaybackFinished(): void;
  function __triggerPlaybackStatus(status: Record<string, unknown>): void;
  function __resetState(): void;
  function __getMockSoundInstance(): {
    playAsync: jest.Mock;
    stopAsync: jest.Mock;
    unloadAsync: jest.Mock;
    setOnPlaybackStatusUpdate: jest.Mock;
  };
  function __setCreateAsyncToFail(error?: Error): void;
}
