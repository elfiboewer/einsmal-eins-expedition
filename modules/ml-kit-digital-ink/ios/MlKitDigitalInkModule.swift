import ExpoModulesCore
import MLKit

public class MlKitDigitalInkModule: Module {
  private let modelManager = ModelManager.modelManager()
  private var modelCache: [String: DigitalInkRecognitionModel] = [:]
  private var recognizerCache: [String: DigitalInkRecognizer] = [:]

  public func definition() -> ModuleDefinition {
    Name("MlKitDigitalInk")

    AsyncFunction("isNativeRecognitionAvailableAsync") {
      true
    }

    AsyncFunction("prepareModelAsync") { (languageTag: String, promise: Promise) in
      do {
        let model = try self.getOrCreateModel(languageTag: languageTag)
        self.ensureModelReady(model: model, languageTag: languageTag, promise: promise) {
          promise.resolve([
            "languageTag": languageTag,
            "ready": true,
          ])
        }
      } catch {
        promise.reject(
          "ERR_ML_KIT_LANGUAGE",
          "Kein ML-Kit-Modell fur \(languageTag) verfugbar.",
          error
        )
      }
    }

    AsyncFunction("recognizeAsync") { (strokes: [[[String: Double]]], languageTag: String, promise: Promise) in
      do {
        let model = try self.getOrCreateModel(languageTag: languageTag)
        self.ensureModelReady(model: model, languageTag: languageTag, promise: promise) {
          do {
            let recognizer = try self.getOrCreateRecognizer(languageTag: languageTag, model: model)
            let ink = self.buildInk(from: strokes)

            recognizer.recognize(ink: ink) { result, error in
              if let error {
                promise.reject(
                  "ERR_ML_KIT_RECOGNIZE",
                  "Die ML-Kit-Erkennung konnte nicht abgeschlossen werden.",
                  error
                )
                return
              }

              promise.resolve(self.buildRecognitionResult(languageTag: languageTag, result: result))
            }
          } catch {
            promise.reject(
              "ERR_ML_KIT_RECOGNIZER",
              "Der ML-Kit-Recognizer konnte nicht initialisiert werden.",
              error
            )
          }
        }
      } catch {
        promise.reject(
          "ERR_ML_KIT_LANGUAGE",
          "Kein ML-Kit-Modell fur \(languageTag) verfugbar.",
          error
        )
      }
    }

    OnDestroy {
      self.recognizerCache.removeAll()
      self.modelCache.removeAll()
    }
  }

  private func getOrCreateModel(languageTag: String) throws -> DigitalInkRecognitionModel {
    if let model = modelCache[languageTag] {
      return model
    }

    guard let identifier = DigitalInkRecognitionModelIdentifier(forLanguageTag: languageTag) else {
      throw NSError(
        domain: "MlKitDigitalInk",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Kein Modell fur \(languageTag)"]
      )
    }

    let model = DigitalInkRecognitionModel(modelIdentifier: identifier)
    modelCache[languageTag] = model
    return model
  }

  private func getOrCreateRecognizer(
    languageTag: String,
    model: DigitalInkRecognitionModel
  ) throws -> DigitalInkRecognizer {
    if let recognizer = recognizerCache[languageTag] {
      return recognizer
    }

    let options = DigitalInkRecognizerOptions(model: model)
    let recognizer = DigitalInkRecognizer.digitalInkRecognizer(options: options)
    recognizerCache[languageTag] = recognizer
    return recognizer
  }

  private func ensureModelReady(
    model: DigitalInkRecognitionModel,
    languageTag: String,
    promise: Promise,
    onReady: @escaping () -> Void
  ) {
    if modelManager.isModelDownloaded(model) {
      onReady()
      return
    }

    var successObserver: NSObjectProtocol?
    var failureObserver: NSObjectProtocol?

    let cleanupObservers = {
      if let successObserver {
        NotificationCenter.default.removeObserver(successObserver)
      }
      if let failureObserver {
        NotificationCenter.default.removeObserver(failureObserver)
      }
    }

    successObserver = NotificationCenter.default.addObserver(
      forName: NSNotification.Name.mlkitModelDownloadDidSucceed,
      object: nil,
      queue: OperationQueue.main
    ) { notification in
      guard
        let downloadedModel = notification.userInfo?[ModelDownloadUserInfoKey.remoteModel.rawValue]
          as? DigitalInkRecognitionModel,
        downloadedModel.modelIdentifier.languageTag == model.modelIdentifier.languageTag
      else {
        return
      }

      cleanupObservers()
      onReady()
    }

    failureObserver = NotificationCenter.default.addObserver(
      forName: NSNotification.Name.mlkitModelDownloadDidFail,
      object: nil,
      queue: OperationQueue.main
    ) { notification in
      guard
        let failedModel = notification.userInfo?[ModelDownloadUserInfoKey.remoteModel.rawValue]
          as? DigitalInkRecognitionModel,
        failedModel.modelIdentifier.languageTag == model.modelIdentifier.languageTag
      else {
        return
      }

      cleanupObservers()
      promise.reject(
        "ERR_ML_KIT_MODEL_DOWNLOAD",
        "Das ML-Kit-Modell fur \(languageTag) konnte nicht geladen werden.",
        nil
      )
    }

    modelManager.download(
      model,
      conditions: ModelDownloadConditions(
        allowsCellularAccess: true,
        allowsBackgroundDownloading: true
      )
    )
  }

  private func buildInk(from strokes: [[[String: Double]]]) -> Ink {
    let inkStrokes = strokes.compactMap { strokePoints -> Stroke? in
      let points = strokePoints.compactMap { point -> StrokePoint? in
        guard let x = point["x"], let y = point["y"] else {
          return nil
        }

        let timestamp = Int(point["t"] ?? Double(Date().timeIntervalSince1970 * 1000))
        return StrokePoint(x: Float(x), y: Float(y), t: timestamp)
      }

      guard !points.isEmpty else {
        return nil
      }

      return Stroke(points: points)
    }

    return Ink(strokes: inkStrokes)
  }

  private func buildRecognitionResult(
    languageTag: String,
    result: DigitalInkRecognitionResult?
  ) -> [String: Any?] {
    let candidates = result?.candidates.map { candidate in
      [
        "score": candidate.score?.doubleValue,
        "text": candidate.text,
      ]
    } ?? []

    return [
      "candidates": candidates,
      "languageTag": languageTag,
      "score": result?.candidates.first?.score?.doubleValue,
      "text": result?.candidates.first?.text,
    ]
  }
}
