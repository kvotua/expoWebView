import React from 'react';
import { View, Text } from 'react-native';

// Если у вас нет View компонента, создайте простую заглушку
const ExpoVadDetectorView = () => {
  return (
    <View style={{ padding: 20, backgroundColor: '#f0f0f0' }}>
      <Text>VAD Detector View (Native only)</Text>
    </View>
  );
};

export default ExpoVadDetectorView;