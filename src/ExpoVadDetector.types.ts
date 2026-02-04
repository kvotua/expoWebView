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
};

export type InitializeResult = {
  success: boolean;
  sampleRate: number;
  frameSize: number;
};

export type ProcessResult = {
  isSpeech?: boolean;
  error?: string;
  success?: boolean;
  results?: boolean[];
};

export type ExpoVadDetectorModuleEvents = {
  onSpeechDetected: (result: DetectionResult) => void;
  onError: (error: string) => void;
};

export type ExpoVadDetectorModule = {
  // Константы
  PI: number;
  
  // Тестовые методы
  hello(): string;
  setValueAsync(value: string): Promise<void>;
  
  // VAD методы (те, которые мы реализовали в Kotlin)
  initializeAsync(config?: VadConfig): Promise<{ success: boolean; error?: string }>;
  startAsync(): Promise<{ success: boolean; error?: string }>;
  stopAsync(): Promise<{ success: boolean; error?: string }>;
  processFrameAsync(audioData: number[]): Promise<ProcessResult>;
  processFramesAsync(frames: number[][]): Promise<ProcessResult>;
  getConfig(): VadConfig;
  cleanupAsync(): Promise<{ success: boolean }>;
  checkPermissionsAsync(): Promise<{ hasPermission: boolean }>;
  
  // Статические значения (если есть)
  SampleRate?: {
    SAMPLE_RATE_8K: number;
    SAMPLE_RATE_16K: number;
    SAMPLE_RATE_32K: number;
    SAMPLE_RATE_48K: number;
  };
  FrameSize?: {
    FRAME_SIZE_80: number;
    FRAME_SIZE_160: number;
    FRAME_SIZE_240: number;
    FRAME_SIZE_320: number;
    FRAME_SIZE_480: number;
  };
  Mode?: {
    QUALITY: number;
    LOW_BITRATE: number;
    AGGRESSIVE: number;
    VERY_AGGRESSIVE: number;
  };
};

// Типы для View (если есть компонент)
export type ExpoVadDetectorViewProps = {
  // Добавьте props для вашего view компонента, если он есть
  value?: string;
  onChange?: (event: { value: string }) => void;
  style?: any;
};