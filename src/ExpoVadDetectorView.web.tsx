import * as React from 'react';

import { ExpoVadDetectorViewProps } from './ExpoVadDetector.types';

export default function ExpoVadDetectorView(props: ExpoVadDetectorViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
