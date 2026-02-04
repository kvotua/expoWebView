import { registerWebModule, NativeModule } from 'expo';

import { ExpoVadDetectorModuleEvents } from './ExpoVadDetector.types';

class ExpoVadDetectorModule extends NativeModule<ExpoVadDetectorModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ExpoVadDetectorModule, 'ExpoVadDetectorModule');
