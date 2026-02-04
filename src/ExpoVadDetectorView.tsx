import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoVadDetectorViewProps } from './ExpoVadDetector.types';

const NativeView: React.ComponentType<ExpoVadDetectorViewProps> =
  requireNativeView('ExpoVadDetector');

export default function ExpoVadDetectorView(props: ExpoVadDetectorViewProps) {
  return <NativeView {...props} />;
}
