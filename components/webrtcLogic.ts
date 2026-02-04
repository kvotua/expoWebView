import { mediaDevices, RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc';

const SERVER_URL = 'http://192.168.0.6:9000/offer'; // Только HTTP эндпоинт

let peerConnection = null;
let localStream = null;

export async function sendAudioToServer() {
    try {
        console.log('1. Запрос доступа к микрофону...');

        // 1. Получаем только аудиопоток
        localStream = await mediaDevices.getUserMedia({
            audio: true,
            video: false
        });

        const audioTrack = localStream.getAudioTracks()[0];
        console.log('✅ Микрофон доступен:', audioTrack.label);

        // 2. Создаем PeerConnection с минимальной конфигурацией
        peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ],
        });

        // 3. Добавляем только ОДНУ аудиодорожку
        peerConnection.addTrack(audioTrack, localStream);

        // 4. ICE-кандидаты - только для отладки
        peerConnection.addEventListener('icecandidate', event => {
            if (event.candidate) {
                console.log('📤 ICE кандидат:', event.candidate.type);
            } else {
                console.log('✅ ICE gathering complete');
            }
        });

        // 5. Создаем SDP offer
        console.log('Создание SDP offer...');
        const offer = await peerConnection.createOffer({
            voiceActivityDetection: true
        });
        await peerConnection.setLocalDescription(offer);

        console.log('Отправка offer на сервер...');

        // 6. Отправляем offer на сервер
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(peerConnection.localDescription)
        });

        if (!response.ok) {
            throw new Error(`HTTP ошибка: ${response.status}`);
        }

        // 7. Получаем и устанавливаем answer от сервера
        const answer = await response.json();
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
        );

        console.log('✅ Соединение установлено! Аудио передается на сервер.');

    } catch (error) {
        console.error('❌ Ошибка:', error);
        stopSendingAudio();
        throw error;
    }
}

export const stopSendingAudio = () => {
    // Останавливаем микрофон
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        console.log('🔇 Микрофон остановлен');
    }

    // Закрываем соединение
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        console.log('🔌 Соединение закрыто');
    }
};

// Функция проверки состояния
export const getConnectionStatus = () => {
    if (!peerConnection) return 'Не подключено';

    return {
        iceState: peerConnection.iceConnectionState,
        signalingState: peerConnection.signalingState,
        hasAudio: localStream?.getAudioTracks().length > 0
    };
};