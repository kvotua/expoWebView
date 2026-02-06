package expo.modules.vaddetector

import com.konovalov.vad.webrtc.Vad as VadWR
import com.konovalov.vad.webrtc.VadWebRTC

import com.konovalov.vad.webrtc.config.FrameSize as FrameSizeWR
import com.konovalov.vad.webrtc.config.Mode as ModeWR
import com.konovalov.vad.webrtc.config.SampleRate as SampleRateWR

import com.konovalov.vad.silero.Vad as VadS
import com.konovalov.vad.silero.VadSilero
import com.konovalov.vad.silero.config.FrameSize as FrameSizeS
import com.konovalov.vad.silero.config.Mode as ModeS
import com.konovalov.vad.silero.config.SampleRate as SampleRateS

import com.konovalov.vad.yamnet.Vad as VadY
import com.konovalov.vad.yamnet.VadYamnet
import com.konovalov.vad.yamnet.config.FrameSize as FrameSizeY
import com.konovalov.vad.yamnet.config.Mode as ModeY
import com.konovalov.vad.yamnet.config.SampleRate as SampleRateY

import java.nio.ByteBuffer
import java.nio.ByteOrder

class VadService {
    private var vadWebRTC: VadWebRTC? = null
    private var vadSilero: VadSilero? = null
    private var vadYamnet: VadYamnet? = null
    private var isRunningWebRTC = false
    private var isRunningSilero = false
    private var isRunningYamnet = false
    
    // Конфигурация по умолчанию
    private var currentConfig = mapOf<String, Any>(
        "sampleRate" to 16000,
        "frameSize" to 320,
        "mode" to 3,
        "silenceDurationMs" to 300,
        "speechDurationMs" to 50
    )
    
    fun initializeWebRTC(config: Map<String, Any>? = null) {
        // Обновляем конфигурацию если передана
        config?.let { currentConfig = currentConfig + it }
        
        val sampleRate = when (currentConfig["sampleRate"] as? Int) {
            8000 -> SampleRateWR.SAMPLE_RATE_8K
            16000 -> SampleRateWR.SAMPLE_RATE_16K
            32000 -> SampleRateWR.SAMPLE_RATE_32K
            48000 -> SampleRateWR.SAMPLE_RATE_48K
            else -> SampleRateWR.SAMPLE_RATE_16K
        }
        
        val frameSize = when (currentConfig["frameSize"] as? Int) {
            80 -> FrameSizeWR.FRAME_SIZE_80
            160 -> FrameSizeWR.FRAME_SIZE_160
            240 -> FrameSizeWR.FRAME_SIZE_240
            320 -> FrameSizeWR.FRAME_SIZE_320
            480 -> FrameSizeWR.FRAME_SIZE_480
            else -> FrameSizeWR.FRAME_SIZE_320
        }
        
        val mode = when (currentConfig["mode"] as? Int) {
            0 -> ModeWR.NORMAL
            1 -> ModeWR.LOW_BITRATE
            2 -> ModeWR.AGGRESSIVE
            3 -> ModeWR.VERY_AGGRESSIVE
            else -> ModeWR.NORMAL
        }
        
        val silenceDurationMs = currentConfig["silenceDurationMs"] as? Int ?: 300
        val speechDurationMs = currentConfig["speechDurationMs"] as? Int ?: 50
        
        vadWebRTC = VadWR.builder()
            .setSampleRate(sampleRate)
            .setFrameSize(frameSize)
            .setMode(mode)
            .setSilenceDurationMs(silenceDurationMs)
            .setSpeechDurationMs(speechDurationMs)
            .build()
    }
    
    fun initializeSilero(config: Map<String, Any>? = null) {
        // Обновляем конфигурацию если передана
        config?.let { currentConfig = currentConfig + it }
        
        val sampleRate = when (currentConfig["sampleRate"] as? Int) {
            8000 -> SampleRateS.SAMPLE_RATE_8K
            16000 -> SampleRateS.SAMPLE_RATE_16K
            else -> SampleRateS.SAMPLE_RATE_16K
        }
        
        val frameSize = when (currentConfig["frameSize"] as? Int) {
            256 -> FrameSizeS.FRAME_SIZE_256
            512 -> FrameSizeS.FRAME_SIZE_512
            768 -> FrameSizeS.FRAME_SIZE_768
            1024 -> FrameSizeS.FRAME_SIZE_1024
            1536 -> FrameSizeS.FRAME_SIZE_1536
            else -> FrameSizeS.FRAME_SIZE_512
        }
        
        val mode = when (currentConfig["mode"] as? Int) {
            0 -> ModeS.OFF
            1 -> ModeS.NORMAL
            2 -> ModeS.AGGRESSIVE
            3 -> ModeS.VERY_AGGRESSIVE
            else -> ModeS.NORMAL
        }
        
        val silenceDurationMs = currentConfig["silenceDurationMs"] as? Int ?: 300
        val speechDurationMs = currentConfig["speechDurationMs"] as? Int ?: 50
        
        vadSilero = VadS.builder()
            .setSampleRate(sampleRate)
            .setFrameSize(frameSize)
            .setMode(mode)
            .setSilenceDurationMs(silenceDurationMs)
            .setSpeechDurationMs(speechDurationMs)
            .build()
    }
    
    fun initializeYamnet(config: Map<String, Any>? = null) {
        // Обновляем конфигурацию если передана
        config?.let { currentConfig = currentConfig + it }
        
        val sampleRate = when (currentConfig["sampleRate"] as? Int) {
            16000 -> SampleRateY.SAMPLE_RATE_16K
            else -> SampleRateY.SAMPLE_RATE_16K
        }
        
        val frameSize = when (currentConfig["frameSize"] as? Int) {
            243 -> FrameSizeY.FRAME_SIZE_243
            487 -> FrameSizeY.FRAME_SIZE_487
            731 -> FrameSizeY.FRAME_SIZE_731
            975 -> FrameSizeY.FRAME_SIZE_975
            else -> FrameSizeY.FRAME_SIZE_487
        }
        
        val mode = when (currentConfig["mode"] as? Int) {
            0 -> ModeY.OFF
            1 -> ModeY.NORMAL
            2 -> ModeY.AGGRESSIVE
            3 -> ModeY.VERY_AGGRESSIVE
            else -> ModeY.NORMAL
        }
        
        val silenceDurationMs = currentConfig["silenceDurationMs"] as? Int ?: 300
        val speechDurationMs = currentConfig["speechDurationMs"] as? Int ?: 50
        
        vadYamnet = VadY.builder()
            .setSampleRate(sampleRate)
            .setFrameSize(frameSize)
            .setMode(mode)
            .setSilenceDurationMs(silenceDurationMs)
            .setSpeechDurationMs(speechDurationMs)
            .build()
    }
    
    fun startWebRTC() { isRunningWebRTC = true }
    fun startSilero() { isRunningSilero = true }
    fun startYamnet() { isRunningYamnet = true }

    fun stopWebRTC() { isRunningWebRTC = false }
    fun stopSilero() { isRunningSilero = false }
    fun stopYamnet() { isRunningYamnet = false }

    fun processWebRTCFrame(audioData: List<Int>): Boolean {
        if (!isRunningWebRTC || vadWebRTC == null) {
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
        
        return vadWebRTC!!.isSpeech(shortArray)
    }

    fun processSileroFrame(audioData: List<Int>): Boolean {
        if (!isRunningSilero || vadSilero == null) {
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
        
        return vadSilero!!.isSpeech(shortArray)
    }

    fun processYamnetFrame(audioData: List<Int>): Boolean {
        if (!isRunningYamnet  || vadYamnet == null) {
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
        
        val sc = vadYamnet!!.classifyAudio("Speech", shortArray)
        return sc.label == "Speech"
    }
    
    fun getCurrentConfig(): Map<String, Any> {
        return currentConfig
    }
    
    fun cleanupAsync() {
        vadWebRTC?.close()
        vadSilero?.close()
        vadYamnet?.close()
        vadWebRTC = null
        vadSilero = null
        vadYamnet = null
        isRunningWebRTC = false
        isRunningSilero = false
        isRunningYamnet = false
    }
}