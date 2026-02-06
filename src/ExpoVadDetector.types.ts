export type VadConfig = {
  sampleRate?: 8000 | 16000 | 32000 | 48000;
  frameSize?: 80 | 160 | 240 | 320 | 480;
  mode?: 0 | 1 | 2 | 3;
  silenceDurationMs?: number;
  speechDurationMs?: number;
};

export type DetectionResult = {
  isSpeech: boolean;
  timestamp: number;
  simulator?: boolean;
};

export type ProcessResult = {
  isSpeech?: boolean;
  error?: string;
  success?: boolean;
  results?: boolean[];
  samplesProcessed?: number;
  framesProcessed?: number;
  simulator?: boolean;
};

export type ExpoVadDetectorModule = {
  // Константы
  SampleRate: {
    SAMPLE_RATE_8K: number;
    SAMPLE_RATE_16K: number;
    SAMPLE_RATE_32K: number;
    SAMPLE_RATE_48K: number;
  };
  FrameSize: {
    FRAME_SIZE_80: number;
    FRAME_SIZE_160: number;
    FRAME_SIZE_240: number;
    FRAME_SIZE_320: number;
    FRAME_SIZE_480: number;
  };
  Mode: {
    NORMAL: number;
    LOW_BITRATE: number;
    AGGRESSIVE: number;
    VERY_AGGRESSIVE: number;
  };
  
  // Методы
  hello(): string;
  // initializeWebRTC(config?: VadConfig): Promise<{ success: boolean; error?: string; simulator?: boolean }>;
  startAsync(): Promise<{ success: boolean; error?: string }>;
  stopAsync(): Promise<{ success: boolean; error?: string }>;
  processFrameAsync(audioData: number[] | Uint8Array | Int16Array): Promise<ProcessResult>;
  processFrameShortAsync(audioData: number[] | Uint8Array | Int16Array): Promise<ProcessResult>;
  processFramesAsync(frames: (number[] | Uint8Array | Int16Array)[]): Promise<ProcessResult>;
  getConfig(): VadConfig;
  cleanupAsync(): Promise<{ success: boolean }>;
  checkPermissionsAsync(): Promise<{ hasPermission: boolean }>;
  
  // WebRTC
  initializeWebRTC(config?: VadConfig): Promise<{ success: boolean; error?: string; simulator?: boolean }>;
  startWebRTC(): Promise<{ success: boolean; error?: string }>;
  stopWebRTC(): Promise<{ success: boolean; error?: string }>;
  processWebRTCFrame(audioData: number[]): Promise<ProcessResult>;

  // Silero
  initializeSilero(config?: VadConfig): Promise<{ success: boolean; error?: string }>;
  startSilero(): Promise<{ success: boolean; error?: string }>;
  stopSilero(): Promise<{ success: boolean; error?: string }>;
  processSileroFrame(audioData: number[]): Promise<ProcessResult>;

  // Yamnet
  initializeYamnet(config?: VadConfig): Promise<{ success: boolean; error?: string }>;
  startYamnet(): Promise<{ success: boolean; error?: string }>;
  stopYamnet(): Promise<{ success: boolean; error?: string }>;
  processYamnetFrame(audioData: number[]): Promise<ProcessResult>;
  
  // События
  addListener(eventName: 'onSpeechDetected', handler: (result: DetectionResult) => void): void;
  addListener(eventName: 'onError', handler: (error: string) => void): void;
  removeListeners(count: number): void;
};

export type ExpoVadDetectorModuleEvents = {
  onSpeechDetected: (result: DetectionResult) => void;
  onError: (error: string) => void;
};