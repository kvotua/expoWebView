// components/VADTest.tsx
import { vadDetector } from 'expo-vad-detector';
import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function VADTest() {
  const [testResult, setTestResult] = useState<string>('');
  
  const testVAD = async () => {
    try {
      setTestResult('Тестирование...');
      
      // 1. Проверяем hello
      const hello = vadDetector.hello();
      setTestResult(prev => prev + `\n1. Hello: ${hello}`);
      
      // 2. Инициализируем VAD
      const initResult = await vadDetector.initialize({
        sampleRate: 16000,
        frameSize: 320,
        mode: 3
      });
      setTestResult(prev => prev + `\n2. Инициализация: ${JSON.stringify(initResult)}`);
      
      // 3. Получаем конфигурацию
      const config = vadDetector.getConfig();
      setTestResult(prev => prev + `\n3. Конфигурация: ${JSON.stringify(config)}`);
      
      // 4. Проверяем разрешения
      const permissions = await vadDetector.checkPermissions();
      setTestResult(prev => prev + `\n4. Разрешения: ${JSON.stringify(permissions)}`);
      
      setTestResult(prev => prev + '\n\n✅ VAD модуль работает!');
      
    } catch (error: any) {
      setTestResult(prev => prev + `\n❌ Ошибка: ${error.message}`);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Тест VAD модуля</Text>
      <Button title="Запустить тест" onPress={testVAD} />
      <Text style={styles.result}>{testResult}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    margin: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  result: {
    marginTop: 10,
    fontFamily: 'monospace',
    fontSize: 12
  }
});