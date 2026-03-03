export {};

declare module 'expo-speech' {
  function __triggerOnStart(): void;
  function __triggerOnDone(): void;
  function __triggerOnStopped(): void;
  function __triggerOnError(error?: unknown): void;
  function __resetState(): void;
  function __setIsSpeaking(value: boolean): void;
}
