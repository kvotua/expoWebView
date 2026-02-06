import { requireNativeModule } from 'expo';
import {
  DetectionResult,
  ExpoVadDetectorModule,
  ProcessResult,
  VadConfig
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

  processFrameAsync = async (
    audioData: Int16Array | number[]
  ): Promise<ProcessResult> => {
    try {
      const data = Array.from(audioData)
      return await this.module.processFrame(data)
    } catch (e) {
      console.error(e)
      return { isSpeech: false, error: String(e) }
    }
  }

  // Основной метод обработки аудио фрейма
  // async processFrameAsync(audioData: number[] | Uint8Array | Int16Array): Promise<ProcessResult> {
  //   try {
  //     let dataArray: number[];

  //     if (audioData instanceof Uint8Array) {
  //       // Uint8Array: значения 0-255
  //       // Конвертируем в массив чисел (уже правильный формат для нового метода)
  //       dataArray = Array.from(audioData);

  //       // Вызываем метод для байтов
  //       return await this.module.processFrame(dataArray);

  //     } else if (audioData instanceof Int16Array) {
  //       // Int16Array: 16-битные значения (-32768...32767)
  //       // Просто конвертируем в массив чисел и используем новый метод
  //       dataArray = Array.from(audioData);

  //       // Используем метод для 16-битных значений
  //       return await this.module.processFrame(dataArray);

  //     } else if (Array.isArray(audioData)) {
  //       // Уже массив чисел
  //       // Предполагаем, что это 16-битные значения
  //       dataArray = audioData;

  //       // Используем метод для 16-битных значений
  //       return await this.module.processFrame(dataArray);

  //     } else {
  //       throw new Error('Unsupported audio data type');
  //     }

  //   } catch (error) {
  //     console.error('Failed to process audio frame:', error);
  //     return {
  //       error: String(error),
  //       isSpeech: false,
  //       simulator: true
  //     };
  //   }
  // }

  // Метод для быстрой обработки 16-битных данных
  async processFrameDirect(int16Data: Int16Array): Promise<ProcessResult> {
    try {
      const dataArray = Array.from(int16Data);
      return await this.module.processFrame(dataArray); // ✅
    } catch (error) {
      console.error(error)
      return { isSpeech: false, error: String(error) }
    }
  }


  // Метод для обработки байтов
  async processFrameBytes(uint8Data: Uint8Array): Promise<ProcessResult> {
    try {
      const dataArray = Array.from(uint8Data);
      return await this.module.processFrame(dataArray); // ✅
    } catch (error) {
      console.error(error)
      return { isSpeech: false, error: String(error) }
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