package expo.modules.vaddetector

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

class ExpoVadDetectorModule : Module() {
    private val vadService = VadService()
    
    override fun definition() = ModuleDefinition {
        Name("ExpoVadDetector")
        
        // Константы для TypeScript
        Constants {
            mapOf(
                "SampleRate" to mapOf(
                    "SAMPLE_RATE_8K" to 8000,
                    "SAMPLE_RATE_16K" to 16000,
                    "SAMPLE_RATE_32K" to 32000,
                    "SAMPLE_RATE_48K" to 48000
                ),
                "FrameSize" to mapOf(
                    "FRAME_SIZE_80" to 80,
                    "FRAME_SIZE_160" to 160,
                    "FRAME_SIZE_240" to 240,
                    "FRAME_SIZE_320" to 320,
                    "FRAME_SIZE_480" to 480
                ),
                "Mode" to mapOf(
                    "QUALITY" to 0,
                    "LOW_BITRATE" to 1,
                    "AGGRESSIVE" to 2,
                    "VERY_AGGRESSIVE" to 3
                )
            )
        }
        
        Events("onSpeechDetected", "onError")
        
        // Тестовая функция
        Function("hello") {
            "Hello from VAD Detector Module (Simulator)"
        }
        
        // Инициализация VAD
        AsyncFunction("initializeAsync") { config: Map<String, Any>? ->
            try {
                vadService.initialize(config)
                mapOf("success" to true, "simulator" to true)
            } catch (e: Exception) {
                sendEvent("onError", mapOf("error" to (e.message ?: "Unknown error")))
                mapOf("success" to false, "error" to e.message, "simulator" to true)
            }
        }
        
        // Запуск детекции
        AsyncFunction("startAsync") {
            try {
                vadService.start()
                mapOf("success" to true)
            } catch (e: Exception) {
                sendEvent("onError", mapOf("error" to (e.message ?: "Unknown error")))
                mapOf("success" to false, "error" to e.message)
            }
        }
        
        // Остановка детекции
        AsyncFunction("stopAsync") {
            try {
                vadService.stop()
                mapOf("success" to true)
            } catch (e: Exception) {
                mapOf("success" to false, "error" to e.message)
            }
        }
        
        // Обработка одного аудио фрейма
        AsyncFunction("processFrameAsync") { audioData: ByteArray ->
            try {
                val isSpeech = vadService.processAudioFrame(audioData)
                
                // Отправляем событие если обнаружена речь
                if (isSpeech) {
                    sendEvent("onSpeechDetected", mapOf(
                        "isSpeech" to isSpeech,
                        "timestamp" to System.currentTimeMillis(),
                        "simulator" to true
                    ))
                }
                
                mapOf("isSpeech" to isSpeech, "simulator" to true)
            } catch (e: Exception) {
                mapOf("error" to e.message, "simulator" to true)
            }
        }
        
        // Получить текущую конфигурацию
        Function("getConfig") {
            vadService.getCurrentConfig()
        }
        
        // Очистка ресурсов
        AsyncFunction("cleanupAsync") {
            vadService.cleanup()
            mapOf("success" to true)
        }
        
        // Проверка разрешений
        Function("checkPermissionsAsync") {
            val context = appContext.reactContext
            val hasPermission = context?.let {
                PackageManager.PERMISSION_GRANTED ==
                ContextCompat.checkSelfPermission(
                    it,
                    Manifest.permission.RECORD_AUDIO
                )
            } ?: false
            
            mapOf("hasPermission" to hasPermission)
        }
    }
}