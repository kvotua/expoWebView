import ExpoVadDetectorModule from './ExpoVadDetectorModule';
import { VadDetector, vadDetector } from './ExpoVadDetectorModule';
import ExpoVadDetectorView from './ExpoVadDetectorView';

// Экспортируем основной модуль
export default ExpoVadDetectorModule;

// Экспортируем класс и инстанс для удобства
export { VadDetector, vadDetector };

// Экспортируем View компонент (если есть)
export { ExpoVadDetectorView };

// Экспортируем типы
export type {
  VadConfig,
  DetectionResult,
  ProcessResult,
  ExpoVadDetectorModule,
  ExpoVadDetectorModuleEvents,
} from './ExpoVadDetector.types';