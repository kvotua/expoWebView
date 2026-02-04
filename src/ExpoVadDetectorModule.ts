import { NativeModule, requireNativeModule } from 'expo';

import { ExpoVadDetectorModuleEvents } from './ExpoVadDetector.types';

declare class ExpoVadDetectorModule extends NativeModule<ExpoVadDetectorModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoVadDetectorModule>('ExpoVadDetector');
