import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { requireNativeModule } from 'expo';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import type { ExpoVadDetectorModule, VadConfig } from 'expo-vad-detector';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import AudioRecord from 'react-native-audio-record';

const vadModule = requireNativeModule<ExpoVadDetectorModule>('ExpoVadDetector');

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const STATUS_API_URL = process.env.EXPO_PUBLIC_STATUS_API_URL;

/* ===================== CAPS ===================== */

const VAD_CAPS = {
  WebRTC: {
    sampleRates: {
      8000: [80, 160, 240],
      16000: [160, 320, 480],
      32000: [320, 640, 960],
      48000: [480, 960, 1440],
    },
    modes: [0, 1, 2, 3],
  },
  Silero: {
    sampleRates: {
      8000: [256, 512, 768],
      16000: [512, 1024, 1536],
    },
    modes: [1, 2, 3],
  },
  Yamnet: {
    sampleRates: {
      16000: [243, 487, 731, 975],
    },
    modes: [1, 2, 3],
  },
} as const;

type VadType = keyof typeof VAD_CAPS;

/* ===================== AUDIO ===================== */

const AUDIO_OPTIONS = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6,
  wavFile: './test.wav'
};

/* ===================== COMPONENT ===================== */

export default function VADTest() {
  /* ---- UI / config ---- */
  const [activeVad, setActiveVad] = useState<VadType>('WebRTC');
  const [vadMode, setVadMode] = useState<0 | 1 | 2 | 3>(0);
  const [sampleRate, setSampleRate] =
    useState<8000 | 16000 | 32000 | 48000>(16000);
  const [frameSize, setFrameSize] = useState<number>(320);

  /* ---- runtime ---- */
  const [isRunning, setIsRunning] = useState(false);
  const [isSpeech, setIsSpeech] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const audioQueue = useRef<number[]>([]);
  const processing = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /* ===================== HELPERS ===================== */

  const log = (msg: string) => {
    const t = new Date().toLocaleTimeString();
    setLogs((l) => [`[${t}] ${msg}`, ...l.slice(0, 30)]);
  };

  const getOrCreateDeviceId = async () => {
    try {
      // Пытаемся получить сохраненный ID
      const savedDeviceId = await AsyncStorage.getItem('@device_id');

      if (savedDeviceId) {
        console.log('Found saved device ID:', savedDeviceId);
        return savedDeviceId;
      }

      // Генерируем новый постоянный ID
      let newDeviceId;

      if (Platform.OS === 'android') {
        // Для Android используем installationId или генерируем на основе устройства
        const installationId = await Application.getAndroidId();
        newDeviceId = installationId ||
          `android_${Device.modelId || 'unknown'}_${Date.now()}`;
      } else if (Platform.OS === 'ios') {
        // Для iOS используем identifierForVendor или генерируем
        const iosId = await Application.getIosIdForVendorAsync();
        newDeviceId = iosId ||
          `ios_${Device.modelId || 'unknown'}_${Date.now()}`;
      } else {
        // Для других платформ
        newDeviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Сохраняем для будущих запусков
      await AsyncStorage.setItem('@device_id', newDeviceId);
      console.log('Created new device ID:', newDeviceId);

      return newDeviceId;

    } catch (error) {
      console.error('Error getting device ID:', error);
      // Fallback: генерируем случайный, но пытаемся сохранить
      const fallbackId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      try {
        await AsyncStorage.setItem('@device_id', fallbackId);
      } catch (e) { }
      return fallbackId;
    }
  };

  const sendAppStatus = async (status: string) => {
    const deviceId = await getOrCreateDeviceId();;
    if (!deviceId) {
      console.log('Device ID not ready yet');
      return;
    }
    try {
      const response = await fetch(`${STATUS_API_URL}/devices/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceId,
          status: status,
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
        }),
      });
      console.log(`App status sent: ${status}`);
    } catch (error) {
      console.error('Error sending app status:', error);
    }
  };

  // const startHeartbeat = () => {
  //   const heartbeatInterval = setInterval(() => {
  //     if (AppState.currentState === 'active') {
  //       sendAppStatus('heartbeat');
  //     }
  //   }, 60000);

  //   return () => clearInterval(heartbeatInterval);
  // };

  // const handleStreamingBasedOnTime = () => {
  //   const currentHour = new Date().getHours();

  //   const isWithinTimeWindow = currentHour >= 10 && currentHour < 22;

  //   if (isWithinTimeWindow && !isRecording) {
  //     console.log('Время начинать стриминг!');
  //     startStreaming();
  //   } else if (!isWithinTimeWindow && isRecording) {
  //     console.log('Время останавливать стриминг.');
  //     destroyStreaming();
  //   }
  // };

  /* ===================== CONFIG VALIDATION ===================== */

  // sampleRate / frameSize
  useEffect(() => {
    const rates = VAD_CAPS[activeVad].sampleRates;
    const frames = rates[sampleRate];

    if (!frames) {
      const sr = Number(Object.keys(rates)[0]);
      setSampleRate(sr as any);
      setFrameSize(rates[sr][0]);
      return;
    }

    if (!frames.includes(frameSize)) {
      setFrameSize(frames[0]);
    }
  }, [activeVad, sampleRate]);

  // mode
  useEffect(() => {
    const validModes = VAD_CAPS[activeVad].modes;
    if (!validModes.includes(vadMode)) {
      setVadMode(validModes[0]);
    }
  }, [activeVad]);

  /* ===================== AUDIO ===================== */

  const handleAudio = (base64: string) => {
    try {
      // Конвертируем base64 в Int16Array напрямую
      const int16Data = AudioUtils.base64ToInt16(base64);
      if (int16Data.length === 0) return;

      // Добавляем в очередь для обработки
      const numberData = Array.from(int16Data);
      audioQueue.current.push(...numberData);

      // Обрабатываем все доступные полные фреймы
      const SAMPLES_PER_FRAME = frameSize; // например, 320 сэмплов

      while (audioQueue.current.length >= SAMPLES_PER_FRAME) {
        const frameSamples = audioQueue.current.slice(0, SAMPLES_PER_FRAME);
        audioQueue.current.splice(0, SAMPLES_PER_FRAME);

        // Создаем Int16Array из сэмплов
        const int16Array = new Int16Array(frameSamples);

        // Обрабатываем фрейм
        processFrame(int16Array);
      }

    } catch (error) {
      console.error('Ошибка обработки аудиоданных:', error);
    }
  };

  const processFrame = async (frame: Int16Array) => {
    if (frame.length !== frameSize) return;
    const numbers = Array.from(frame);

    let res;
    switch (activeVad) {
      case 'WebRTC':
        res = await vadModule.processWebRTCFrame(numbers);
        break;
      case 'Silero':
        res = await vadModule.processSileroFrame(numbers);
        break;
      case 'Yamnet':
        res = await vadModule.processYamnetFrame(numbers);
        break;
    }

    console.log(res);

    setIsSpeech(res?.isSpeech === true);
  };

  /* ===================== START / STOP ===================== */

  const start = async () => {
    if (isRunning) return;

    if (Platform.OS === 'android') {
      const ok = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (ok !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Нет доступа к микрофону');
        return;
      }
    }

    AudioRecord.init({ ...AUDIO_OPTIONS, sampleRate });
    AudioRecord.on('data', handleAudio);

    const cfg: VadConfig = { sampleRate, frameSize, mode: vadMode };

    log(`▶️ init ${activeVad}`);

    let ok = false;
    switch (activeVad) {
      case 'WebRTC':
        ok = (await vadModule.initializeWebRTC(cfg)).success;
        await vadModule.startWebRTC();
        break;
      case 'Silero':
        ok = (await vadModule.initializeSilero(cfg)).success;
        await vadModule.startSilero();
        break;
      case 'Yamnet':
        ok = (await vadModule.initializeYamnet(cfg)).success;
        await vadModule.startYamnet();
        break;
    }

    if (!ok) {
      log('❌ init failed');
      return;
    }

    AudioRecord.start();
    setIsRunning(true);
    log('🎤 START');
  };

  const stop = async () => {
    if (!isRunning) return;

    intervalRef.current && clearInterval(intervalRef.current);
    intervalRef.current = null;

    AudioRecord.stop();

    switch (activeVad) {
      case 'WebRTC':
        await vadModule.stopWebRTC();
        break;
      case 'Silero':
        await vadModule.stopSilero();
        break;
      case 'Yamnet':
        await vadModule.stopYamnet();
        break;
    }

    setIsRunning(false);
    setIsSpeech(false);
    log('🛑 STOP');
  };

  /* ===================== UI ===================== */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎤 VAD TEST</Text>

      <Text>VAD:</Text>
      <Picker selectedValue={activeVad} onValueChange={setActiveVad}>
        <Picker.Item label="WebRTC" value="WebRTC" />
        <Picker.Item label="Silero" value="Silero" />
        <Picker.Item label="Yamnet" value="Yamnet" />
      </Picker>

      <Text>Sample Rate</Text>
      <Picker selectedValue={sampleRate} onValueChange={setSampleRate}>
        {Object.keys(VAD_CAPS[activeVad].sampleRates).map((sr) => (
          <Picker.Item key={sr} label={`${sr}`} value={Number(sr)} />
        ))}
      </Picker>

      <Text>Frame Size</Text>
      <Picker selectedValue={frameSize} onValueChange={setFrameSize}>
        {VAD_CAPS[activeVad].sampleRates[sampleRate]?.map((f) => (
          <Picker.Item key={f} label={`${f}`} value={f} />
        ))}
      </Picker>

      <Text>Mode</Text>
      <Picker selectedValue={vadMode} onValueChange={setVadMode}>
        {VAD_CAPS[activeVad].modes.map((m) => (
          <Picker.Item key={m} label={`${m}`} value={m} />
        ))}
      </Picker>

      <Button
        title={isRunning ? '⏹ STOP' : '▶️ START'}
        onPress={isRunning ? stop : start}
      />

      <View style={styles.indicator}>
        <Text style={{ fontSize: 24 }}>
          {isSpeech ? '🎤 SPEECH' : '🔇 SILENCE'}
        </Text>
      </View>

      <ScrollView style={styles.log}>
        {logs.map((l, i) => (
          <Text key={i} style={styles.logLine}>
            {l}
          </Text>
        ))}
      </ScrollView>

      {isRunning && <ActivityIndicator size="large" />}
    </View>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  indicator: {
    marginVertical: 20,
    alignItems: 'center',
  },
  log: {
    marginTop: 10,
    backgroundColor: '#eee',
    padding: 10,
  },
  logLine: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});

class AudioUtils {
  // Конвертация Uint8Array в Int16Array (для 8-битного PCM)
  static uint8ToInt16(uint8Data: Uint8Array): Int16Array {
    const int16Data = new Int16Array(uint8Data.length);
    for (let i = 0; i < uint8Data.length; i++) {
      int16Data[i] = (uint8Data[i] - 128) * 256;
    }
    return int16Data;
  }

  // Конвертация Float32Array в Int16Array (из WebAudio API)
  static float32ToInt16(float32Data: Float32Array): Int16Array {
    const int16Data = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
      const value = Math.max(-1, Math.min(1, float32Data[i]));
      int16Data[i] = Math.round(value * 32767);
    }
    return int16Data;
  }

  // Конвертация Int16Array в Uint8Array (для передачи как байты)
  static int16ToUint8(int16Data: Int16Array): Uint8Array {
    const uint8Data = new Uint8Array(int16Data.length * 2);
    const dataView = new DataView(uint8Data.buffer);

    for (let i = 0; i < int16Data.length; i++) {
      dataView.setInt16(i * 2, int16Data[i], true); // Little endian
    }

    return uint8Data;
  }

  // Конвертация Base64 в Int16Array
  static base64ToInt16(base64Data: string): Int16Array {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Предполагаем, что base64 содержит 16-битные данные
    return new Int16Array(bytes.buffer);
  }
}