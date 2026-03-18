export type MlKitInkPoint = {
  t: number;
  x: number;
  y: number;
};

export type MlKitInkStroke = MlKitInkPoint[];

export type MlKitRecognitionCandidate = {
  score: number | null;
  text: string;
};

export type MlKitRecognitionResult = {
  candidates: MlKitRecognitionCandidate[];
  languageTag: string;
  score: number | null;
  text: string | null;
};

export type MlKitPrepareResult = {
  languageTag: string;
  ready: boolean;
};

export type MlKitDigitalInkModuleType = {
  isNativeRecognitionAvailableAsync(): Promise<boolean>;
  prepareModelAsync(languageTag: string): Promise<MlKitPrepareResult>;
  recognizeAsync(
    strokes: MlKitInkStroke[],
    languageTag: string
  ): Promise<MlKitRecognitionResult>;
};
