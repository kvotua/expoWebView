import { requireNativeModule } from 'expo';
import { 
  ExpoVadDetectorModule, 
  VadConfig, 
  DetectionResult,
  ProcessResult
} from './ExpoVadDetector.types';

// Получаем нативный модуль
const NativeModule = requireNativeModule<ExpoVadDetectorModule>('ExpoVadDetector');

export default NativeModule;

// Вспомогательный класс для удобства
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
  
  // Инициализация VAD
  async initialize(config: VadConfig = {}): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.module.initializeAsync(config);
    } catch (error) {
      console.error('Failed to initialize VAD:', error);
      throw error;
    }
  }
  
  // Запуск детекции
  async start(): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.module.startAsync();
    } catch (error) {
      console.error('Failed to start detection:', error);
      throw error;
    }
  }
  
  // Остановка детекции
  async stop(): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.module.stopAsync();
    } catch (error) {
      console.error('Failed to stop detection:', error);
      throw error;
    }
  }
  
  // Обработка аудио фрейма
  async processFrame(audioData: number[] | Uint8Array): Promise<ProcessResult> {
    try {
      const data = Array.isArray(audioData) 
        ? audioData 
        : Array.from(audioData);
      
      return await this.module.processFrameAsync(data);
    } catch (error) {
      console.error('Failed to process audio frame:', error);
      return { error: String(error) };
    }
  }
  
  // Обработка нескольких фреймов
  async processFrames(frames: (number[] | Uint8Array)[]): Promise<ProcessResult> {
    try {
      const data = frames.map(frame => 
        Array.isArray(frame) ? frame : Array.from(frame)
      );
      
      return await this.module.processFramesAsync(data);
    } catch (error) {
      console.error('Failed to process audio frames:', error);
      return { error: String(error) };
    }
  }
  
  // Получение конфигурации
  getConfig(): VadConfig {
    try {
      return this.module.getConfig();
    } catch (error) {
      console.error('Failed to get config:', error);
      return {};
    }
  }
  
  // Очистка ресурсов
  async cleanup(): Promise<{ success: boolean }> {
    try {
      return await this.module.cleanupAsync();
    } catch (error) {
      console.error('Failed to cleanup:', error);
      throw error;
    }
  }
  
  // Проверка разрешений
  async checkPermissions(): Promise<{ hasPermission: boolean }> {
    try {
      return await this.module.checkPermissionsAsync();
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return { hasPermission: false };
    }
  }
  
  // Получение статических значений
  getSampleRates() {
    return this.module.SampleRate;
  }
  
  getFrameSizes() {
    return this.module.FrameSize;
  }
  
  getModes() {
    return this.module.Mode;
  }
  
  // Подписка на события
  addSpeechListener(callback: (result: DetectionResult) => void) {
    const { EventEmitter } = require('expo-modules-core');
    const emitter = new EventEmitter(this.module);
    
    return emitter.addListener('onSpeechDetected', callback);
  }
  
  addErrorListener(callback: (error: string) => void) {
    const { EventEmitter } = require('expo-modules-core');
    const emitter = new EventEmitter(this.module);
    
    return emitter.addListener('onError', callback);
  }
  
  // Простой метод для тестирования
  hello(): string {
    return this.module.hello();
  }
}

// Экспортируем singleton
export const vadDetector = VadDetector.getInstance();