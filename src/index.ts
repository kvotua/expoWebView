// Reexport the native module. On web, it will be resolved to ExpoVadDetectorModule.web.ts
// and on native platforms to ExpoVadDetectorModule.ts
export { default } from './ExpoVadDetectorModule';
export { default as ExpoVadDetectorView } from './ExpoVadDetectorView';
export * from  './ExpoVadDetector.types';
