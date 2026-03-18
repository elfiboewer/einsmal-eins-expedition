import type {
  MlKitDigitalInkModuleType,
  MlKitInkStroke,
  MlKitPrepareResult,
  MlKitRecognitionResult,
} from './MlKitDigitalInk.types';

const MlKitDigitalInkModule: MlKitDigitalInkModuleType = {
  async isNativeRecognitionAvailableAsync() {
    return false;
  },
  async prepareModelAsync(languageTag: string): Promise<MlKitPrepareResult> {
    return {
      languageTag,
      ready: false,
    };
  },
  async recognizeAsync(
    _strokes: MlKitInkStroke[],
    languageTag: string
  ): Promise<MlKitRecognitionResult> {
    return {
      candidates: [],
      languageTag,
      score: null,
      text: null,
    };
  },
};

export default MlKitDigitalInkModule;
