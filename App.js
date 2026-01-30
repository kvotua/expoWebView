import React, { useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { View, Platform, PermissionsAndroid, AppState, BackHandler } from 'react-native';
import { activateKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import AudioRecord from 'react-native-audio-record';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const STATUS_API_URL = process.env.EXPO_PUBLIC_STATUS_API_URL;

export default function MyWeb() {
  const webViewRef = useRef(null);
  const ws = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('Ожидание...');
  const [isRecording, setIsRecording] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [deviceId, setDeviceId] = useState(null);
  const lastSendRef = useRef(Date.now());
  const sendWatchdogRef = useRef(null);

  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const shouldReconnect = useRef(true);

  const MAX_RECONNECT_DELAY = 30000;

  const SAMPLE_RATE = 48000;

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
    }, 30000);

    return () => clearInterval(heartbeatInterval);
  };

  useEffect(() => {
    // Инициализируем deviceId при запуске
    const initDevice = async () => {
      const id = await getOrCreateDeviceId();
      setDeviceId(id);
    };

    initDevice();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    activateKeepAwake();
    NavigationBar.setVisibilityAsync('hidden');
    NavigationBar.setBehaviorAsync('overlay-swipe');
    NavigationBar.setBackgroundColorAsync('#00000000');
    sendAppStatus('opened');

    startStreaming();

    const cleanupHeartbeat = startHeartbeat();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        sendAppStatus('resumed');
        startStreaming();
      } else if (nextAppState.match(/inactive|background/)) {
        sendAppStatus('background');
        stopStreaming();
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
      sendAppStatus('closed');
      subscription.remove();
      backHandler.remove();
      cleanupHeartbeat();
      destroyStreaming();
    };
  }, [deviceId]);

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
      startStreaming();
    }, delay);
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

      ws.current = new WebSocket(API_URL);

      ws.current.onopen = () => {
        console.log("WS connected");
        reconnectAttempts.current = 0;
        shouldReconnect.current = false;

        AudioRecord.start();
        setIsRecording(true);

        AudioRecord.on("data", chunk => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(chunk);
            lastSendRef.current = Date.now();
          }
        });
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
    // console.log(`isRecording: ${isRecording} | ws.current: ${ws.current} | reconnect: ${reconnect}`);
    // if (!isRecording && !ws.current) return;
    let tempVar = isRecording;
    try {
      if (reconnectTimeout.current) {
        console.log('if (reconnectTimeout.current) {');
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }

      if (isRecording) {
        console.log('if (isRecording) {');
        AudioRecord.stop();
        setIsRecording(false);
        tempVar = false;
      }

      if (ws.current) {
        console.log('if (ws.current) {');
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