import MlKitDigitalInkModule, {
  type MlKitInkStroke,
  type MlKitPrepareResult,
  type MlKitRecognitionResult,
} from "@modules/ml-kit-digital-ink";

import {
  recognizeNumberFromStrokes,
  type HandwritingStroke,
} from "@/features/learning/handwriting";

type DigitConfidence = {
  confidence: number;
  digit: number;
};

export type MathInkRecognition = {
  confidence: number;
  digits: DigitConfidence[];
  rawText: string | null;
  source: "fallback" | "ml-kit";
  value: number | null;
};

type RecognitionOptions = {
  expectedDigitCount?: number;
  expectedValue?: number;
  languageTag?: string;
};

const DEFAULT_LANGUAGE_TAG = "de-DE";

let preparedLanguageTag: string | null = null;
let preparePromise: Promise<MlKitPrepareResult> | null = null;

export async function prepareInkRecognitionAsync(
  languageTag = DEFAULT_LANGUAGE_TAG
) {
  if (!supportsNativeMlKit()) {
    return {
      languageTag,
      ready: false,
      source: "fallback" as const,
    };
  }

  if (preparedLanguageTag === languageTag) {
    return {
      languageTag,
      ready: true,
      source: "ml-kit" as const,
    };
  }

  if (!preparePromise) {
    preparePromise = MlKitDigitalInkModule!.prepareModelAsync(languageTag)
      .then((result) => {
        if (result.ready) {
          preparedLanguageTag = languageTag;
        }
        return result;
      })
      .finally(() => {
        preparePromise = null;
      });
  }

  try {
    const result = await preparePromise;
    return {
      ...result,
      source: result.ready ? ("ml-kit" as const) : ("fallback" as const),
    };
  } catch {
    return {
      languageTag,
      ready: false,
      source: "fallback" as const,
    };
  }
}

export async function recognizeInkAnswerAsync(
  strokes: HandwritingStroke[],
  options: RecognitionOptions = {}
): Promise<MathInkRecognition> {
  const expectedDigitCount = options.expectedDigitCount;
  const expectedValue = options.expectedValue;
  const fallbackResult = toFallbackRecognition(strokes, expectedValue);

  if (!supportsNativeMlKit()) {
    return fallbackResult;
  }

  try {
    await prepareInkRecognitionAsync(options.languageTag ?? DEFAULT_LANGUAGE_TAG);

    const nativeResult = await MlKitDigitalInkModule!.recognizeAsync(
      toMlKitStrokes(strokes),
      options.languageTag ?? DEFAULT_LANGUAGE_TAG
    );
    const normalizedNativeResult = toMlKitRecognition(
      nativeResult,
      expectedDigitCount,
      expectedValue
    );

    if (normalizedNativeResult.value === null) {
      return fallbackResult;
    }

    if (
      fallbackResult.value !== null &&
      fallbackResult.confidence > normalizedNativeResult.confidence + 0.08
    ) {
      return fallbackResult;
    }

    return normalizedNativeResult;
  } catch {
    return fallbackResult;
  }
}

function supportsNativeMlKit() {
  return process.env.EXPO_OS !== "web" && Boolean(MlKitDigitalInkModule);
}

function toMlKitStrokes(strokes: HandwritingStroke[]): MlKitInkStroke[] {
  return strokes.map((stroke) =>
    stroke.map((point) => ({
      t: point.t ?? Date.now(),
      x: point.x,
      y: point.y,
    }))
  );
}

function toFallbackRecognition(
  strokes: HandwritingStroke[],
  expectedValue?: number
): MathInkRecognition {
  const fallback = recognizeNumberFromStrokes(strokes, { expectedValue });
  const boostedConfidence =
    expectedValue !== undefined && fallback.value === expectedValue
      ? Math.max(fallback.confidence, 0.68)
      : fallback.confidence;

  return {
    confidence: boostedConfidence,
    digits: fallback.digits,
    rawText:
      fallback.value === null
        ? null
        : fallback.digits.map((digit) => `${digit.digit}`).join(""),
    source: "fallback",
    value: fallback.value,
  };
}

function toMlKitRecognition(
  result: MlKitRecognitionResult,
  expectedDigitCount?: number,
  expectedValue?: number
): MathInkRecognition {
  const bestCandidate = result.candidates
    .map((candidate, index) => normalizeCandidate(candidate.text, candidate.score, index))
    .filter(
      (candidate): candidate is NormalizedNumericCandidate =>
        candidate.normalizedText !== null
    )
    .sort((left, right) =>
      compareCandidates(left, right, expectedDigitCount, expectedValue)
    )[0];

  if (!bestCandidate) {
    return {
      confidence: 0,
      digits: [],
      rawText: result.text,
      source: "ml-kit",
      value: null,
    };
  }

  const digits = bestCandidate.normalizedText.split("").map((digit) => ({
    confidence: bestCandidate.confidence,
    digit: Number(digit),
  }));

  return {
    confidence: bestCandidate.confidence,
    digits,
    rawText: bestCandidate.rawText,
    source: "ml-kit",
    value: Number(bestCandidate.normalizedText),
  };
}

type NormalizedCandidate = {
  confidence: number;
  normalizedText: string | null;
  rawText: string;
};

type NormalizedNumericCandidate = {
  confidence: number;
  normalizedText: string;
  rawText: string;
};

function normalizeCandidate(
  text: string,
  score: number | null,
  index: number
): NormalizedCandidate {
  const rawText = text.trim();
  const normalizedText = rawText
    .replace(/\s+/g, "")
    .split("")
    .map((character) => normalizeCharacter(character))
    .join("");

  if (!normalizedText || /[^0-9]/.test(normalizedText)) {
    return {
      confidence: 0,
      normalizedText: null,
      rawText,
    };
  }

  const fallbackScore = clamp(0.88 - index * 0.12, 0.24, 0.92);
  const confidence = clamp(score ?? fallbackScore, 0.24, 0.99);

  return {
    confidence,
    normalizedText,
    rawText,
  };
}

function compareCandidates(
  left: NormalizedNumericCandidate,
  right: NormalizedNumericCandidate,
  expectedDigitCount?: number,
  expectedValue?: number
) {
  const expectedText =
    expectedValue === undefined ? null : String(expectedValue);
  const leftMatchesExpected = expectedText !== null && left.normalizedText === expectedText;
  const rightMatchesExpected = expectedText !== null && right.normalizedText === expectedText;

  if (leftMatchesExpected !== rightMatchesExpected) {
    return leftMatchesExpected ? -1 : 1;
  }

  const leftMatchesLength =
    expectedDigitCount === undefined ||
    left.normalizedText.length === expectedDigitCount;
  const rightMatchesLength =
    expectedDigitCount === undefined ||
    right.normalizedText.length === expectedDigitCount;

  if (leftMatchesLength !== rightMatchesLength) {
    return leftMatchesLength ? -1 : 1;
  }

  return right.confidence - left.confidence;
}

function normalizeCharacter(character: string) {
  switch (character) {
    case "O":
    case "o":
    case "D":
      return "0";
    case "I":
    case "l":
    case "|":
      return "1";
    case "Z":
      return "2";
    case "S":
    case "s":
      return "5";
    case "B":
      return "8";
    default:
      return character;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
