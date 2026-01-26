import React, { useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { View, Platform } from 'react-native';
import { activateKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { ExpoPlayAudioStream, PlaybackModes } from '@mykin-ai/expo-audio-stream';

export default function MyWeb() {
  const webViewRef = useRef(null);
  const ws = useRef(null);
  const subscription = useRef(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const [isRecording, setIsRecording] = useState(false);

  const SAMPLE_RATE = 48000;
  const CHUNK_INTERVAL = 250;

  const startStreaming = async () => {
    try {
      console.log("Requesting recording permissions...");
      const permission = await ExpoPlayAudioStream.requestPermissionsAsync();

      if (!permission.granted) {
        console.error("Permission to record was denied.");
        Alert.alert("Ошибка!", "Для работы приложения необходимо разрешение на использование микрофона.");
        return;
      }
      ws.current = new WebSocket(API_URL);

      ws.current.onopen = async () => {
        console.log("WebSocket connected, starting mic...");

        await ExpoPlayAudioStream.setSoundConfig({
          sampleRate: SAMPLE_RATE,
          playbackMode: PlaybackModes.REGULAR,
        });

        const result = await ExpoPlayAudioStream.startRecording({
          sampleRate: SAMPLE_RATE,
          channels: 1,
          encoding: "pcm_16bit",
          interval: CHUNK_INTERVAL,
          onAudioStream: async (event) => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
              ws.current.send(event.data);

              console.log(`Sent chunk. Size: ${event.eventDataSize}`);
            }
          },
        });

        subscription.current = result?.subscription;

        setIsRecording(true);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket Error Event:', JSON.stringify(error, null, 2));
        // Alert.alert('Ошибка!', JSON.stringify(error, null, 2));
        // console.log('Произошла ошибка WebSocket. Подробности смотрите в событии onclose.');
      };

      ws.current.onclose = (event) => {
        // console.log('WebSocket Closed');
        // console.log(`  Code: ${event.code}`);
        // console.log(`  Reason: ${event.reason}`);

        stopStreaming();
      };

    } catch (e) {
      console.error("Error starting:", e);
    }
  };

  const stopStreaming = async () => {
    try {
      await ExpoPlayAudioStream.stopRecording();

      if (subscription.current?.remove) {
        subscription.current.remove();
      }

      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }

      setIsRecording(false);
      console.log("Stopped.");
    } catch (e) {
      console.error("Error stopping:", e);
    } finally {
      await startStreaming();
    }
  };

  useEffect(() => {
    activateKeepAwake();

    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
      NavigationBar.setBackgroundColorAsync('#ffffff00');
    }

    startStreaming();

    return () => stopStreaming();
  }, []);
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