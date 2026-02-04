import { EventEmitter } from 'expo-modules-core';

import { ExpoVadDetectorModule, ExpoVadDetectorModuleEvents } from './ExpoVadDetector.types';

// Web implementation of the ExpoVadDetectorModule
export default {
  PI: Math.PI,
  
  hello(): string {
    return 'Hello from the web!';
  },
  
  async setValueAsync(value: string): Promise<void> {
    console.log('Setting value on web:', value);
  },
  
  // VAD методы - заглушки для web
  async initializeAsync(config: any): Promise<{ success: boolean; error?: string }> {
    console.log('VAD initialize on web:', config);
    return { success: false, error: 'VAD not supported on web' };
  },
  
  async startAsync(): Promise<{ success: boolean; error?: string }> {
    console.log('VAD start on web');
    return { success: false, error: 'VAD not supported on web' };
  },
  
  async stopAsync(): Promise<{ success: boolean; error?: string }> {
    console.log('VAD stop on web');
    return { success: false, error: 'VAD not supported on web' };
  },
  
  async processFrameAsync(audioData: number[]): Promise<any> {
    console.log('VAD process frame on web, length:', audioData.length);
    return { error: 'VAD not supported on web' };
  },
  
  async processFramesAsync(frames: number[][]): Promise<any> {
    console.log('VAD process frames on web, count:', frames.length);
    return { error: 'VAD not supported on web' };
  },
  
  getConfig(): any {
    return {};
  },
  
  async cleanupAsync(): Promise<{ success: boolean }> {
    return { success: true };
  },
  
  async checkPermissionsAsync(): Promise<{ hasPermission: boolean }> {
    return { hasPermission: false };
  },
  
  // События
  ...new EventEmitter<ExpoVadDetectorModuleEvents>(),
} as ExpoVadDetectorModule;