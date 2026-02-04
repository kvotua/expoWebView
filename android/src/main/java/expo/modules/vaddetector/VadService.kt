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
        
        // val mode = when (currentConfig["mode"] as? Int) {
        //     0 -> Mode.QUALITY
        //     1 -> Mode.LOW_BITRATE
        //     2 -> Mode.AGGRESSIVE
        //     3 -> Mode.VERY_AGGRESSIVE
        //     else -> Mode.VERY_AGGRESSIVE
        // }
        
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
            .order(ByteOrder.LITTLE_ENDIAN)  // или ByteOrder.BIG_ENDIAN в зависимости от формата
            .asShortBuffer()
            .let { buffer ->
                val shorts = ShortArray(buffer.remaining())
                buffer.get(shorts)
                shorts
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