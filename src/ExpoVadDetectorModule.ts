import { requireNativeModule } from 'expo-modules-core';
import {
  DetectionResult,
  ExpoVadDetectorModule,
  VadConfig,
} from './ExpoVadDetector.types';

// Получаем нативный модуль
const NativeModule = requireNativeModule<ExpoVadDetectorModule>('ExpoVadDetector');

export default NativeModule;

export class VadDetector {
  private static instance: VadDetector;
  private module: ExpoVadDetectorModule;

  private constructor() {
    this.module = requireNativeModule<ExpoVadDetectorModule>('ExpoVadDetector');
  }

  static getInstance(): VadDetector {
    if (!VadDetector.instance) {
      VadDetector.instance = new VadDetector();
    }
    return VadDetector.instance;
  }

  // ----------------------------
  // Подписка на события
  // ----------------------------
  addSpeechListener(callback: (result: DetectionResult) => void) {
    this.module.addListener('onSpeechDetected', callback);
  }

  addErrorListener(callback: (error: string) => void) {
    this.module.addListener('onError', callback);
  }

  removeListeners(count: number) {
    this.module.removeListeners(count);
  }

  // ----------------------------
  // WebRTC, Silero, Yamnet
  // ----------------------------
  async initializeWebRTC(config: VadConfig = {}) {
    return this.module.initializeWebRTC(config);
  }
  async startWebRTC() { return this.module.startWebRTC(); }
  async stopWebRTC() { return this.module.stopWebRTC(); }
  async processWebRTCFrame(audioData: number[] | Int16Array | Uint8Array) {
    return this.module.processWebRTCFrame(Array.from(audioData));
  }

  async initializeSilero(config: VadConfig = {}) {
    return this.module.initializeSilero(config);
  }
  async startSilero() { return this.module.startSilero(); }
  async stopSilero() { return this.module.stopSilero(); }
  async processSileroFrame(audioData: number[] | Int16Array | Uint8Array) {
    return this.module.processSileroFrame(Array.from(audioData));
  }

  async initializeYamnet(config: VadConfig = {}) {
    return this.module.initializeYamnet(config);
  }
  async startYamnet() { return this.module.startYamnet(); }
  async stopYamnet() { return this.module.stopYamnet(); }
  async processYamnetFrame(audioData: number[] | Int16Array | Uint8Array) {
    return this.module.processYamnetFrame(Array.from(audioData));
  }

  // ----------------------------
  // Общие методы
  // ----------------------------
  async processFrameAsync(audioData: Int16Array | number[] | Uint8Array) {
    return this.processWebRTCFrame(audioData);
  }

  async processFramesAsync(frames: (number[] | Int16Array | Uint8Array)[]) {
    const results: boolean[] = [];
    let samplesProcessed = 0;

    for (const frame of frames) {
      const res = await this.processWebRTCFrame(frame);
      results.push(!!res.isSpeech);
      samplesProcessed += frame.length;
    }

    return { success: true, results, samplesProcessed };
  }

  getConfig() { return this.module.getConfig(); }
  async cleanup() { return this.module.cleanupAsync(); }
  async checkPermissions() { return this.module.checkPermissionsAsync(); }

  hello(): string { return this.module.hello(); }

  getSampleRates() { return this.module.SampleRate; }
  getFrameSizes() { return this.module.FrameSize; }
  getModes() { return this.module.Mode; }
}

// Singleton
export const vadDetector = VadDetector.getInstance();
