import React, { useEffect, useState } from 'react';
import { Button, PermissionsAndroid, Platform, StyleSheet, Text, View } from 'react-native';
// Импортируйте так, как это настроено у вас в проекте. 
// Обычно это: import { ExpoAudioStream } from '@mykin-ai/expo-audio-stream';
// Но я оставлю ваш вариант импорта, если вы используете форк:
// import { ExpoPlayAudioStream, PlaybackModes } from '@mykin-ai/expo-audio-stream';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import * as NavigationBar from 'expo-navigation-bar';
// import { VAD } from 'react-native-webrtc-vad';
// import RNWebrtcVad from 'react-native-webrtc-vad';
import VADTest from '@/components/VADTest';
import { getConnectionStatus, sendAudioToServer, stopSendingAudio } from '@/components/webrtcLogic';

const signalingServerUrl = 'ws://192.168.0.6:9000/ws';
const webrtcServerUrl = 'http://192.168.0.6:9000/offer';

export default function HomeScreen() {
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState('Готово');

  const accessMic = async () => {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      return;
    }
  }

  useEffect(() => {
    activateKeepAwakeAsync();

    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
      NavigationBar.setBackgroundColorAsync('#ffffff00');
    }

    accessMic();

    console.log("Component mounted, starting stream...");

    return () => {
      console.log("Component unmounting, stopping stream...");
    };
  }, []);

  const handleStart = async () => {
        setIsSending(true);
        setStatus('Подключение...');
        
        try {
            await sendAudioToServer();
            setStatus('Аудио передается 🎤');
        } catch (error: any) {
            setStatus('Ошибка: ' + error.message);
            setIsSending(false);
        }
    };

    const handleStop = () => {
        stopSendingAudio();
        setIsSending(false);
        setStatus('Остановлено');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.status}>{status}</Text>
            <Text style={styles.connectionInfo}>
                {JSON.stringify(getConnectionStatus(), null, 2)}
            </Text>
            
            <View style={styles.buttonContainer}>
                {!isSending ? (
                    <Button
                        title="Начать передачу аудио"
                        onPress={handleStart}
                        color="#4CAF50"
                    />
                ) : (
                    <Button
                        title="Остановить передачу"
                        onPress={handleStop}
                        color="#F44336"
                    />
                )}
            </View>
            <VADTest></VADTest>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    status: {
        fontSize: 20,
        marginBottom: 20,
        fontWeight: 'bold'
    },
    connectionInfo: {
        fontSize: 12,
        color: '#666',
        marginBottom: 30
    },
    buttonContainer: {
        width: '80%'
    }
});