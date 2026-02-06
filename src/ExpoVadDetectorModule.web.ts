import { ExpoVadDetectorModule, ExpoVadDetectorModuleEvents, VadConfig } from './ExpoVadDetector.types';

// Web implementation of the ExpoVadDetectorModule
export default {
  // Константы
  SampleRate: {
    SAMPLE_RATE_8K: 8000,
    SAMPLE_RATE_16K: 16000,
    SAMPLE_RATE_32K: 32000,
    SAMPLE_RATE_48K: 48000,
  },
  FrameSize: {
    FRAME_SIZE_80: 80,
    FRAME_SIZE_160: 160,
    FRAME_SIZE_240: 240,
    FRAME_SIZE_320: 320,
    FRAME_SIZE_480: 480,
  },
  Mode: {
    NORMAL: 0,
    LOW_BITRATE: 1,
    AGGRESSIVE: 2,
    VERY_AGGRESSIVE: 3,
  },

  // Общие методы
  hello(): string {
    return 'Hello from the web!';
  },
  async initializeAsync(config?: VadConfig) {
    console.log('VAD initialize on web:', config);
    return { success: false, error: 'VAD not supported on web', simulator: true };
  },
  async startAsync() { return { success: false, error: 'VAD not supported on web' }; },
  async stopAsync() { return { success: false, error: 'VAD not supported on web' }; },
  async processFrameAsync(audioData: number[] | Uint8Array | Int16Array) {
    return { error: 'VAD not supported on web' };
  },
  async processFrameShortAsync(audioData: number[] | Uint8Array | Int16Array) {
    return { error: 'VAD not supported on web' };
  },
  async processFramesAsync(frames: (number[] | Uint8Array | Int16Array)[]) {
    return { error: 'VAD not supported on web' };
  },
  processFrame(audioData: any) { return null; },
  getConfig() { return {}; },
  async cleanupAsync() { return { success: true }; },
  async checkPermissionsAsync() { return { hasPermission: false }; },

  // WebRTC заглушки
  async initializeWebRTC(config?: VadConfig) {
    return { success: false, error: 'WebRTC not supported on web', simulator: true };
  },
  async startWebRTC() { return { success: false, error: 'WebRTC not supported on web' }; },
  async stopWebRTC() { return { success: false, error: 'WebRTC not supported on web' }; },
  async processWebRTCFrame(audioData: number[]) { return { error: 'WebRTC not supported on web' }; },

  // Silero заглушки
  async initializeSilero(config?: VadConfig) {
    return { success: false, error: 'Silero not supported on web' };
  },
  async startSilero() { return { success: false, error: 'Silero not supported on web' }; },
  async stopSilero() { return { success: false, error: 'Silero not supported on web' }; },
  async processSileroFrame(audioData: number[]) { return { error: 'Silero not supported on web' }; },

  // Yamnet заглушки
  async initializeYamnet(config?: VadConfig) {
    return { success: false, error: 'Yamnet not supported on web' };
  },
  async startYamnet() { return { success: false, error: 'Yamnet not supported on web' }; },
  async stopYamnet() { return { success: false, error: 'Yamnet not supported on web' }; },
  async processYamnetFrame(audioData: number[]) { return { error: 'Yamnet not supported on web' }; },

  // Заглушки для событий
  addListener(eventName: keyof ExpoVadDetectorModuleEvents, handler: Function) {
    console.warn(`Event "${eventName}" is not supported on web.`);
  },
  removeListeners(count: number) {
    // ничего не делаем
  },
} as unknown as ExpoVadDetectorModule;
