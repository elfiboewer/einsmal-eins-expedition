package expo.modules.mlkitdigitalink

import com.google.mlkit.common.MlKitException
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.common.RecognitionResult
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognizer
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognizerOptions
import com.google.mlkit.vision.digitalink.recognition.Ink
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MlKitDigitalInkModule : Module() {
  private val remoteModelManager = RemoteModelManager.getInstance()
  private val modelCache = mutableMapOf<String, DigitalInkRecognitionModel>()
  private val recognizerCache = mutableMapOf<String, DigitalInkRecognizer>()

  override fun definition() = ModuleDefinition {
    Name("MlKitDigitalInk")

    AsyncFunction("isNativeRecognitionAvailableAsync") {
      true
    }

    AsyncFunction("prepareModelAsync") { languageTag: String, promise: Promise ->
      val model = try {
        getOrCreateModel(languageTag)
      } catch (error: Throwable) {
        promise.reject("ERR_ML_KIT_LANGUAGE", error.message, error)
        return@AsyncFunction
      }

      ensureModelReady(languageTag, model, promise) {
        promise.resolve(
          mapOf(
            "languageTag" to languageTag,
            "ready" to true
          )
        )
      }
    }

    AsyncFunction("recognizeAsync") { strokes: List<List<Map<String, Double>>>, languageTag: String, promise: Promise ->
      val model = try {
        getOrCreateModel(languageTag)
      } catch (error: Throwable) {
        promise.reject("ERR_ML_KIT_LANGUAGE", error.message, error)
        return@AsyncFunction
      }

      ensureModelReady(languageTag, model, promise) {
        val recognizer = try {
          getOrCreateRecognizer(languageTag, model)
        } catch (error: Throwable) {
          promise.reject("ERR_ML_KIT_RECOGNIZER", error.message, error)
          return@ensureModelReady
        }

        val ink = buildInk(strokes)

        recognizer
          .recognize(ink)
          .addOnSuccessListener { result ->
            promise.resolve(buildRecognitionResult(languageTag, result))
          }
          .addOnFailureListener { error ->
            promise.reject("ERR_ML_KIT_RECOGNIZE", error.message, error)
          }
      }
    }

    OnDestroy {
      recognizerCache.values.forEach { recognizer ->
        recognizer.close()
      }
      recognizerCache.clear()
      modelCache.clear()
    }
  }

  private fun ensureModelReady(
    languageTag: String,
    model: DigitalInkRecognitionModel,
    promise: Promise,
    onReady: () -> Unit
  ) {
    remoteModelManager
      .isModelDownloaded(model)
      .addOnSuccessListener { isDownloaded ->
        if (isDownloaded) {
          onReady()
          return@addOnSuccessListener
        }

        remoteModelManager
          .download(model, DownloadConditions.Builder().build())
          .addOnSuccessListener {
            onReady()
          }
          .addOnFailureListener { error ->
            promise.reject(
              "ERR_ML_KIT_MODEL_DOWNLOAD",
              "Das ML-Kit-Modell fur $languageTag konnte nicht geladen werden.",
              error
            )
          }
      }
      .addOnFailureListener { error ->
        promise.reject(
          "ERR_ML_KIT_MODEL_STATUS",
          "Der ML-Kit-Modellstatus fur $languageTag konnte nicht gepruft werden.",
          error
        )
      }
  }

  private fun getOrCreateModel(languageTag: String): DigitalInkRecognitionModel {
    modelCache[languageTag]?.let { return it }

    val modelIdentifier = try {
      DigitalInkRecognitionModelIdentifier.fromLanguageTag(languageTag)
    } catch (error: MlKitException) {
      throw IllegalArgumentException("Kein ML-Kit-Modell fur Sprache $languageTag.", error)
    } ?: throw IllegalArgumentException("Kein ML-Kit-Modell fur Sprache $languageTag.")

    return DigitalInkRecognitionModel
      .builder(modelIdentifier)
      .build()
      .also { model ->
        modelCache[languageTag] = model
      }
  }

  private fun getOrCreateRecognizer(
    languageTag: String,
    model: DigitalInkRecognitionModel
  ): DigitalInkRecognizer {
    recognizerCache[languageTag]?.let { return it }

    return DigitalInkRecognition
      .getClient(DigitalInkRecognizerOptions.builder(model).build())
      .also { recognizer ->
        recognizerCache[languageTag] = recognizer
      }
  }

  private fun buildInk(strokes: List<List<Map<String, Double>>>): Ink {
    val inkBuilder = Ink.builder()

    strokes.forEach { strokePoints ->
      if (strokePoints.isEmpty()) {
        return@forEach
      }

      val strokeBuilder = Ink.Stroke.builder()

      strokePoints.forEach { point ->
        val x = point["x"]?.toFloat() ?: return@forEach
        val y = point["y"]?.toFloat() ?: return@forEach
        val t = point["t"]?.toLong() ?: System.currentTimeMillis()
        strokeBuilder.addPoint(Ink.Point.create(x, y, t))
      }

      inkBuilder.addStroke(strokeBuilder.build())
    }

    return inkBuilder.build()
  }

  private fun buildRecognitionResult(
    languageTag: String,
    result: RecognitionResult
  ): Map<String, Any?> {
    val candidates = result.candidates.map { candidate ->
      mapOf(
        "score" to null,
        "text" to candidate.text
      )
    }
    val topText = result.candidates.firstOrNull()?.text

    return mapOf(
      "candidates" to candidates,
      "languageTag" to languageTag,
      "score" to null,
      "text" to topText
    )
  }
}
