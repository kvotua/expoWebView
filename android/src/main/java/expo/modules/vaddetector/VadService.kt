package expo.modules.vaddetector

import com.konovalov.vad.webrtc.Vad
import com.konovalov.vad.webrtc.VadWebRTC
import com.konovalov.vad.webrtc.config.FrameSize
import com.konovalov.vad.webrtc.config.Mode
import com.konovalov.vad.webrtc.config.SampleRate
import java.nio.ByteBuffer
import java.nio.ByteOrder

class VadService {
    private var vad: VadWebRTC? = null
    private var isRunning = false
    
    // Конфигурация по умолчанию
    private var currentConfig = mapOf<String, Any>(
        "sampleRate" to 16000,
        "frameSize" to 320,
        "mode" to 3,
        "silenceDurationMs" to 300,
        "speechDurationMs" to 50
    )
    
    fun initialize(config: Map<String, Any>? = null) {
        // Обновляем конфигурацию если передана
        config?.let { currentConfig = currentConfig + it }
        
        val sampleRate = when (currentConfig["sampleRate"] as? Int) {
            8000 -> SampleRate.SAMPLE_RATE_8K
            16000 -> SampleRate.SAMPLE_RATE_16K
            32000 -> SampleRate.SAMPLE_RATE_32K
            48000 -> SampleRate.SAMPLE_RATE_48K
            else -> SampleRate.SAMPLE_RATE_16K
        }
        
        val frameSize = when (currentConfig["frameSize"] as? Int) {
            80 -> FrameSize.FRAME_SIZE_80
            160 -> FrameSize.FRAME_SIZE_160
            240 -> FrameSize.FRAME_SIZE_240
            320 -> FrameSize.FRAME_SIZE_320
            480 -> FrameSize.FRAME_SIZE_480
            else -> FrameSize.FRAME_SIZE_320
        }
        
        val silenceDurationMs = currentConfig["silenceDurationMs"] as? Int ?: 300
        val speechDurationMs = currentConfig["speechDurationMs"] as? Int ?: 50
        
        vad = Vad.builder()
            .setSampleRate(sampleRate)
            .setFrameSize(frameSize)
            .setMode(Mode.VERY_AGGRESSIVE)
            .setSilenceDurationMs(silenceDurationMs)
            .setSpeechDurationMs(speechDurationMs)
            .build()
    }
    
    fun start() {
        isRunning = true
    }
    
    fun stop() {
        isRunning = false
    }
    
    fun processAudioFrame(audioData: ByteArray): Boolean {
        if (!isRunning || vad == null) {
            return false
        }
        
        // Конвертируем ByteArray в ShortArray (16-bit PCM)
        val shortArray = ByteBuffer.wrap(audioData)
            .order(ByteOrder.LITTLE_ENDIAN)
            .asShortBuffer()
            .let { buffer ->
                val shorts = ShortArray(buffer.remaining())
                buffer.get(shorts)
                shorts
            }
        
        return vad!!.isSpeech(shortArray)
    }

    // Новый метод для обработки массива чисел (из JavaScript)
    fun processFrameFromJS(audioData: List<Int>): Boolean {
        if (!isRunning || vad == null) {
            return false
        }
        
        // Конвертируем List<Int> в ByteArray
        // JavaScript передает числа 0-255, нам нужно их конвертировать в байты
        val byteArray = ByteArray(audioData.size)
        
        for (i in audioData.indices) {
            // JavaScript числа могут быть больше 255, нормализуем
            val value = audioData[i]
            byteArray[i] = (value and 0xFF).toByte()
        }
        
        // Теперь конвертируем ByteArray в ShortArray для VAD
        val shortArray = if (byteArray.size % 2 == 0) {
            ByteBuffer.wrap(byteArray)
                .order(ByteOrder.LITTLE_ENDIAN)
                .asShortBuffer()
                .let { buffer ->
                    val shorts = ShortArray(buffer.remaining())
                    buffer.get(shorts)
                    shorts
                }
        } else {
            // Если нечетное количество байт, отбрасываем последний
            val trimmedByteArray = byteArray.copyOf(byteArray.size - 1)
            ByteBuffer.wrap(trimmedByteArray)
                .order(ByteOrder.LITTLE_ENDIAN)
                .asShortBuffer()
                .let { buffer ->
                    val shorts = ShortArray(buffer.remaining())
                    buffer.get(shorts)
                    shorts
                }
        }
        
        return vad!!.isSpeech(shortArray)
    }
    
    // Альтернативный метод для 16-битных значений напрямую
    fun processShortArrayFromJS(audioData: List<Int>): Boolean {
        if (!isRunning || vad == null) {
            return false
        }
        
        // Создаем ShortArray напрямую из List<Int>
        val shortArray = ShortArray(audioData.size)
        
        for (i in audioData.indices) {
            val jsValue = audioData[i]
            
            // Нормализуем к диапазону short
            val normalizedValue = when {
                jsValue < Short.MIN_VALUE -> Short.MIN_VALUE
                jsValue > Short.MAX_VALUE -> Short.MAX_VALUE
                else -> jsValue.toShort()
            }
            
            shortArray[i] = normalizedValue
        }
        
        return vad!!.isSpeech(shortArray)
    }
    
    fun getCurrentConfig(): Map<String, Any> {
        return currentConfig
    }
    
    fun cleanup() {
        vad?.close()
        vad = null
        isRunning = false
    }
}