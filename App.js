import React, { useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { View, Platform, PermissionsAndroid, AppState, BackHandler, Alert, NativeModules } from 'react-native';
import { activateKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import AudioRecord from 'react-native-audio-record';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireNativeModule } from 'expo-modules-core';
import ExpoVadDetectorModule, { VadConfig } from 'expo-vad-detector';

const vadModule = requireNativeModule < ExpoVadDetectorModule > ('ExpoVadDetector');
const vadModule2 = requireNativeModule < ExpoVadDetectorModule > ('ExpoVadDetector');
const vadModule3 = requireNativeModule('ExpoVadDetector');

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const STATUS_API_URL = process.env.EXPO_PUBLIC_STATUS_API_URL;

console.log(`API_URL: ${API_URL}`);

export default function MyWeb() {
  const webViewRef = useRef(null);
  const ws = useRef(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('Ожидание...');
  const [isRecording, setIsRecording] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  const audioQueue = useRef([]);

  const lastSendRef = useRef(Date.now());
  const MIN_SEND_INTERVAL = 20;

  const sendWatchdogRef = useRef(null);

  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const shouldReconnect = useRef(true);

  const MAX_RECONNECT_DELAY = 30000;

  const SAMPLE_RATE = 48000;
  const FRAME_SIZE = 1440;

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

  const sendAppStatus = async (status) => {
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

  const startHeartbeat = () => {
    const heartbeatInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        sendAppStatus('heartbeat');
      }
    }, 60000);

    return () => clearInterval(heartbeatInterval);
  };

  const handleStreamingBasedOnTime = () => {
    const currentHour = new Date().getHours();

    const isWithinTimeWindow = currentHour >= 10 && currentHour < 22;

    if (isWithinTimeWindow && !isRecording) {
      console.log('Время начинать стриминг!');
      startStreaming();
    } else if (!isWithinTimeWindow && isRecording) {
      console.log('Время останавливать стриминг.');
      destroyStreaming();
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // console.log('Подробная информация о vadModule:');
    // Object.keys(vadModule).forEach(key => {
    //   console.log(`${key}:`, typeof vadModule[key]);
    // });
    // console.log('Подробная информация о vadModule2:');
    // Object.keys(vadModule2).forEach(key => {
    //   console.log(`${key}:`, typeof vadModule[key]);
    // });
    // console.log('Подробная информация о vadModule3:');
    // Object.keys(vadModule3).forEach(key => {
    //   console.log(`${key}:`, typeof vadModule[key]);
    // });
    // console.log('=== ExpoVadDetectorModule (default import) ===');
    // console.log('Тип:', typeof ExpoVadDetectorModule);

    // Проверяем, является ли это объектом
    // if (ExpoVadDetectorModule && typeof ExpoVadDetectorModule === 'object') {
    //   console.log('Методы:', Object.keys(ExpoVadDetectorModule));
    // } else {
    //   console.log('Значение:', ExpoVadDetectorModule);
    // }

    activateKeepAwake();
    NavigationBar.setVisibilityAsync('hidden');
    NavigationBar.setBehaviorAsync('overlay-swipe');
    NavigationBar.setBackgroundColorAsync('#00000000');

    sendAppStatus('opened');

    // console.log('startStreaming 1');
    // startStreaming();
    handleStreamingBasedOnTime();

    // Устанавливаем интервал для проверки времени каждую минуту
    const timeCheckInterval = setInterval(handleStreamingBasedOnTime, 60000);

    const cleanupHeartbeat = startHeartbeat();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        sendAppStatus('resumed');
        // startStreaming();
      } else if (nextAppState.match(/inactive|background/)) {
        sendAppStatus('background');
        // stopStreaming(false);
      }
      setAppState(nextAppState);
    });

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      sendAppStatus('closing');
      setTimeout(() => {
        BackHandler.exitApp();
      }, 1000);
      return true;
    });

    return () => {
      clearInterval(timeCheckInterval);
      sendAppStatus('closed');
      subscription.remove();
      backHandler.remove();
      cleanupHeartbeat();
      destroyStreaming();
    };
  }, []);

  useEffect(() => {
    setStatus(isSpeaking ? "Обнаружена речь" : "Тишина...");
  }, [isSpeaking]);

  useEffect(() => {
    console.log(status);
  }, [status]);

  useEffect(() => {
    sendWatchdogRef.current = setInterval(() => {
      if (!isRecording) return;

      const delta = Date.now() - lastSendRef.current;

      if (delta > 7000) {
        console.log('No audio sent for', delta, 'ms → stopping');
        stopStreaming(true);
      }
    }, 3000);

    return () => {
      if (sendWatchdogRef.current) {
        clearInterval(sendWatchdogRef.current);
        sendWatchdogRef.current = null;
      }
    };
  }, [isRecording]);

  const scheduleReconnect = () => {
    console.log(`if shouldReconnect.current(${shouldReconnect.current}) - true, значит выполняем`);
    if (!shouldReconnect.current) return;

    const delay = Math.min(
      1000 * Math.pow(2, reconnectAttempts.current),
      MAX_RECONNECT_DELAY
    );

    console.log(`Reconnect in ${delay} ms | attempts: ${reconnectAttempts.current}`);
    reconnectTimeout.current = setTimeout(() => {
      reconnectAttempts.current++;
      console.log('startStreaming 2');
      startStreaming();
    }, delay);
  };

  function rms(frame) {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      const v = frame[i] / 32768;
      sum += v * v;
    }
    return Math.sqrt(sum / frame.length);
  }

  const processFrame = async (frame, frameSamples) => {
    if (frame.length !== FRAME_SIZE) return;
    const numbers = Array.from(frame);

    // const energy = rms(frame);
    // if (energy < 0.005) {
    //   setIsSpeaking(false);
    //   return;
    // }

    let res = await vadModule3.processWebRTCFrame(numbers);
    const speaking = res?.isSpeech === true;

    setIsSpeaking(speaking);

    if (
      speaking &&
      ws.current?.readyState === WebSocket.OPEN
      // Date.now() - lastSendRef.current > MIN_SEND_INTERVAL
    ) {
      // console.log(res);
      ws.current.send(frame.buffer);
      lastSendRef.current = Date.now();
    }
  };

  const handleAudio = (base64) => {
    if (ws.current?.readyState !== WebSocket.OPEN) return;



    // 1. base64 → Int16Array (PCM16LE)
    let pcm = AudioUtils.base64ToInt16(base64);
    // if (pcm.length % 2 === 0) {
    //   pcm = AudioUtils.stereoToMono(pcm);
    // }
    // console.log(`pcm.length = ${pcm.length}`);
    if (pcm.length === 0) return;
    
    // ws.current.send(pcm.buffer);
    // return;

    // 2. кладём в очередь
    for (let i = 0; i < pcm.length; i++) {
      audioQueue.current.push(pcm[i]);
    }

    // 3. режем на фреймы
    while (audioQueue.current.length >= FRAME_SIZE) {
      const frameSamples = audioQueue.current.splice(0, FRAME_SIZE);
      const frame = new Int16Array(frameSamples);

      // 4. детект речи
      processFrame(frame, frameSamples);
    }
  };

  const startStreaming = async () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setStatus("Нет доступа к микрофону");
        return;
      }

      AudioRecord.init({
        sampleRate: SAMPLE_RATE,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6,
      });

      await vadModule3.initializeWebRTC({
        sampleRate: SAMPLE_RATE,
        frameSize: FRAME_SIZE, mode: 0
      })
      await vadModule3.startWebRTC();

      ws.current = new WebSocket(API_URL);

      ws.current.onopen = () => {
        console.log("WS connected");
        reconnectAttempts.current = 0;
        shouldReconnect.current = false;

        AudioRecord.start();
        setIsRecording(true);

        AudioRecord.on("data", handleAudio);
      };

      ws.current.onerror = err => {
        console.log("WS error", err);
      };

      ws.current.onclose = e => {
        shouldReconnect.current = true;
        console.log("WS closed", e.code);
        stopStreaming(true);
      };

    } catch (e) {
      console.error("Start error", e);
      scheduleReconnect();
    }
  };

  const stopStreaming = async (reconnect = true) => {
    let tempVar = isRecording;
    try {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }

      if (isRecording) {
        AudioRecord.stop();
        setIsRecording(false);
        tempVar = false;
      }

      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    } finally {
      if (reconnect && !tempVar) scheduleReconnect();
    }
  };

  const destroyStreaming = () => {
    shouldReconnect.current = false;
    stopStreaming(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar hidden={true} />

      <WebView
        ref={webViewRef}
        cacheEnabled={true}
        cacheMode='LOAD_CACHE_ELSE_NETWORK'
        source={{ uri: 'https://factory.thankstab.com/' }}
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        setSupportMultipleWindows={false}
        bounces={false}
        overScrollMode="never"
        scrollEnabled={true}
        scalesPageToFit={true}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        // Критически важные настройки для работы Canvas
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        mixedContentMode="always"
        // Настройки для улучшения производительности
        hardwareAccelerationEnabled={true}
        useWebKit={true}
        onShouldStartLoadWithRequest={(request) => {
          return true;
        }}
        injectedJavaScript={`
            // Запрещаем масштабирование
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no';
            document.head.appendChild(meta);
            
            // Улучшаем работу Canvas
            const originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(type, attributes) {
              if (type === '2d') {
                const ctx = originalGetContext.call(this, type, attributes);
                if (ctx) {
                  // Оптимизация для Canvas
                  ctx.imageSmoothingEnabled = false;
                  ctx.webkitImageSmoothingEnabled = false;
                  ctx.mozImageSmoothingEnabled = false;
                }
                return ctx;
              }
              return originalGetContext.call(this, type, attributes);
            };
            
            // Улучшаем обработку касаний для Canvas
            function enhanceCanvasElements() {
              const canvases = document.querySelectorAll('canvas');
              canvases.forEach(canvas => {
                canvas.style.touchAction = 'none';
                canvas.style.webkitTapHighlightColor = 'transparent';
                canvas.style.webkitUserSelect = 'none';
                canvas.style.userSelect = 'none';
                canvas.style.msUserSelect = 'none';
                canvas.style.mozUserSelect = 'none';
              });
            }
            
            // Применяем улучшения при загрузке и периодически
            document.addEventListener('DOMContentLoaded', enhanceCanvasElements);
            setTimeout(enhanceCanvasElements, 1000);
            setInterval(enhanceCanvasElements, 3000);
            
            // Перехватываем и улучшаем функцию initScratchFunctionality
            if (typeof initScratchFunctionality === 'function') {
              const originalInitScratch = initScratchFunctionality;
              initScratchFunctionality = function(cardData) {
                // Даем время на инициализацию DOM
                setTimeout(() => {
                  const result = originalInitScratch.call(this, cardData);
                  // Дополнительные улучшения после инициализации
                  enhanceCanvasElements();
                  return result;
                }, 200);
              };
            }
            
            // Улучшаем обработку touch событий для скретч-карт
            document.addEventListener('touchstart', function(e) {
              if (e.target.tagName === 'CANVAS') {
                e.preventDefault();
              }
            }, { passive: false });
            
            document.addEventListener('touchmove', function(e) {
              if (e.target.tagName === 'CANVAS') {
                e.preventDefault();
              }
            }, { passive: false });
            
            // Запрещаем выделение текста и контекстное меню
            document.addEventListener('contextmenu', function(e) {
              e.preventDefault();
            });
            
            // Убираем overscroll эффект на веб-странице
            document.body.style.overscrollBehavior = 'none';
            document.documentElement.style.overscrollBehavior = 'none';
            document.body.style.overscrollBehaviorX = 'none';
            document.body.style.overscrollBehaviorY = 'none';
            
            // Запрещаем выделение текста
            document.body.style.webkitUserSelect = 'none';
            document.body.style.userSelect = 'none';
            document.body.style.webkitTouchCallout = 'none';
            
            // Фиксируем скролл
            document.body.style.overflow = 'auto';
            document.body.style.webkitOverflowScrolling = 'touch';
            
            // Предотвращаем масштабирование жестами
            document.addEventListener('gesturestart', function(e) {
              e.preventDefault();
            });
            document.addEventListener('gesturechange', function(e) {
              e.preventDefault();
            });
            document.addEventListener('gestureend', function(e) {
              e.preventDefault();
            });
            
            console.log('Canvas enhancements applied');
            true;
          `}
        // Обработка сообщений для отладки
        onMessage={(event) => {
          console.log('WebView message:', event.nativeEvent.data);
        }}
        // Обработка ошибок загрузки
        onError={(error) => {
          console.log('WebView error:', error);
        }}
        // Обработка завершения загрузки
        onLoadEnd={() => {
          console.log('WebView loaded successfully');
        }}
      />
    </View>
  );
}

class AudioUtils {
  static base64ToInt16(base64Data) {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Int16Array(bytes.buffer);
  }

  static stereoToMono(pcm) {
    const mono = new Int16Array(pcm.length / 2);
    for (let i = 0, j = 0; i < pcm.length; i += 2, j++) {
      mono[j] = (pcm[i] + pcm[i + 1]) >> 1;
    }
    return mono;
  }
}