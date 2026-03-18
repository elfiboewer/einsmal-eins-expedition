type RecognitionAlternative = {
  confidence: number | null;
  transcript: string;
};

type RecognitionSessionOptions = {
  languageTag?: string;
  onEnd?: () => void;
  onError?: (message: string) => void;
  onResult: (alternatives: RecognitionAlternative[]) => void;
};

type RecognitionSession = {
  stop: () => void;
};

export type MicrophonePermissionStatus =
  | "granted"
  | "denied"
  | "insecure"
  | "unsupported";

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    isFinal?: boolean;
    length: number;
    [index: number]: {
      confidence?: number;
      transcript: string;
    };
  }>;
  resultIndex?: number;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
  message?: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: null | (() => void);
  onerror: null | ((event: SpeechRecognitionErrorEventLike) => void);
  onresult: null | ((event: SpeechRecognitionEventLike) => void);
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpokenNumberCandidate = {
  confidence: number;
  transcript: string;
  value: number;
};

const DIRECT_NUMBER_WORDS = new Map<string, number>([
  ["null", 0],
  ["eins", 1],
  ["ein", 1],
  ["eine", 1],
  ["einen", 1],
  ["zwo", 2],
  ["zwei", 2],
  ["drei", 3],
  ["vier", 4],
  ["fuenf", 5],
  ["funf", 5],
  ["sechs", 6],
  ["sieben", 7],
  ["acht", 8],
  ["neun", 9],
  ["zehn", 10],
  ["elf", 11],
  ["zwoelf", 12],
  ["zwolf", 12],
  ["dreizehn", 13],
  ["vierzehn", 14],
  ["fuenfzehn", 15],
  ["funfzehn", 15],
  ["sechzehn", 16],
  ["siebzehn", 17],
  ["achtzehn", 18],
  ["neunzehn", 19],
  ["zwanzig", 20],
  ["dreissig", 30],
  ["dreisig", 30],
  ["dreizig", 30],
  ["vierzig", 40],
  ["fuenfzig", 50],
  ["funfzig", 50],
  ["sechzig", 60],
  ["siebzig", 70],
  ["achtzig", 80],
  ["neunzig", 90],
  ["hundert", 100],
  ["einhundert", 100],
]);

const UNIT_WORDS = new Map<string, number>([
  ["ein", 1],
  ["eins", 1],
  ["eine", 1],
  ["zwei", 2],
  ["zwo", 2],
  ["drei", 3],
  ["vier", 4],
  ["fuenf", 5],
  ["funf", 5],
  ["sechs", 6],
  ["sieben", 7],
  ["acht", 8],
  ["neun", 9],
]);

const TENS_WORDS = new Map<string, number>([
  ["zwanzig", 20],
  ["dreissig", 30],
  ["dreisig", 30],
  ["dreizig", 30],
  ["vierzig", 40],
  ["fuenfzig", 50],
  ["funfzig", 50],
  ["sechzig", 60],
  ["siebzig", 70],
  ["achtzig", 80],
  ["neunzig", 90],
]);

export function isSpeechRecognitionSupported() {
  return Boolean(getRecognitionConstructor());
}

export function canPromptForMicrophonePermission() {
  if (process.env.EXPO_OS !== "web") {
    return false;
  }

  return Boolean(globalThis.isSecureContext && globalThis.navigator?.mediaDevices?.getUserMedia);
}

export async function requestMicrophonePermissionAsync(): Promise<{
  message: string | null;
  status: MicrophonePermissionStatus;
}> {
  if (process.env.EXPO_OS !== "web") {
    return {
      message: "Die Mikrofonfreigabe ist hier nicht verfugbar.",
      status: "unsupported",
    };
  }

  if (!globalThis.isSecureContext) {
    return {
      message: "Mikrofonzugriff im Browser braucht HTTPS oder localhost.",
      status: "insecure",
    };
  }

  if (!globalThis.navigator?.mediaDevices?.getUserMedia) {
    return {
      message: "Dieser Browser kann keine Mikrofonfreigabe anfragen.",
      status: "unsupported",
    };
  }

  try {
    const stream = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());

    return {
      message: null,
      status: "granted",
    };
  } catch (error) {
    return {
      message: mapMediaPermissionError(error),
      status: "denied",
    };
  }
}

export function startSpeechRecognitionSession({
  languageTag = "de-DE",
  onEnd,
  onError,
  onResult,
}: RecognitionSessionOptions): RecognitionSession {
  const SpeechRecognition = getRecognitionConstructor();

  if (!SpeechRecognition) {
    throw new Error("Spracherkennung wird in diesem Browser nicht unterstutzt.");
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = languageTag;
  recognition.maxAlternatives = 5;
  recognition.onresult = (event) => {
    const lastResultIndex = event.resultIndex ?? Math.max(0, event.results.length - 1);
    const result = event.results[lastResultIndex];

    if (!result) {
      onResult([]);
      return;
    }

    const alternatives = Array.from({ length: result.length }, (_, index) => ({
      confidence: result[index]?.confidence ?? null,
      transcript: result[index]?.transcript ?? "",
    })).filter((alternative) => alternative.transcript.trim().length > 0);

    onResult(alternatives);
  };
  recognition.onerror = (event) => {
    onError?.(mapRecognitionError(event.error, event.message));
  };
  recognition.onend = () => {
    onEnd?.();
  };
  recognition.start();

  return {
    stop: () => {
      recognition.stop();
    },
  };
}

export function getSpokenNumberCandidate(
  alternatives: RecognitionAlternative[],
  expectedValue?: number
) {
  const candidates = alternatives.flatMap((alternative, index) =>
    extractNumberCandidates(alternative.transcript).map((value, candidateIndex) => ({
      confidence: alternative.confidence ?? Math.max(0.34, 0.82 - index * 0.12 - candidateIndex * 0.04),
      transcript: alternative.transcript.trim(),
      value,
    }))
  );

  if (candidates.length === 0) {
    return null;
  }

  if (expectedValue !== undefined) {
    const exactMatch = candidates
      .filter((candidate) => candidate.value === expectedValue)
      .sort((left, right) => right.confidence - left.confidence)[0];

    if (exactMatch) {
      return exactMatch;
    }
  }

  return candidates.sort((left, right) => right.confidence - left.confidence)[0];
}

function getRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (process.env.EXPO_OS !== "web") {
    return null;
  }

  const scope = globalThis as typeof globalThis & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

function mapRecognitionError(error?: string, fallbackMessage?: string) {
  switch (error) {
    case "audio-capture":
      return "Ich kann dein Mikrofon gerade nicht benutzen.";
    case "network":
      return "Die Spracherkennung braucht gerade eine stabile Verbindung.";
    case "not-allowed":
    case "service-not-allowed":
      return "Bitte erlaube den Mikrofonzugriff fur diesen Browser.";
    case "no-speech":
      return "Ich habe gerade keine gesprochene Zahl gehort.";
    case "aborted":
      return "Das Einsprechen wurde abgebrochen.";
    default:
      return fallbackMessage ?? "Die Spracherkennung konnte nicht gestartet werden.";
  }
}

function mapMediaPermissionError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
  ) {
    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "Bitte erlaube den Mikrofonzugriff fur diese Website.";
      case "NotFoundError":
        return "Ich konnte gerade kein Mikrofon finden.";
      case "NotReadableError":
        return "Das Mikrofon wird gerade von etwas anderem benutzt.";
      default:
        break;
    }
  }

  return "Die Mikrofonfreigabe konnte gerade nicht angefragt werden.";
}

function extractNumberCandidates(transcript: string) {
  const normalized = normalizeSpeechText(transcript);
  const digitMatches = [...normalized.matchAll(/\b\d{1,3}\b/g)]
    .map((match) => Number(match[0]))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 100);

  if (digitMatches.length > 0) {
    return [...new Set(digitMatches.reverse())];
  }

  const tokens = normalized.split(" ").filter(Boolean);
  const candidates: number[] = [];

  for (const token of tokens) {
    const parsed = parseGermanNumberWord(token);

    if (parsed !== null) {
      candidates.push(parsed);
    }
  }

  for (let start = 0; start < tokens.length; start += 1) {
    for (let size = 2; size <= 4 && start + size <= tokens.length; size += 1) {
      const joined = tokens.slice(start, start + size).join("");
      const parsed = parseGermanNumberWord(joined);

      if (parsed !== null) {
        candidates.push(parsed);
      }
    }
  }

  const compact = tokens.join("");
  const compactParsed = parseGermanNumberWord(compact);

  if (compactParsed !== null) {
    candidates.push(compactParsed);
  }

  return [...new Set(candidates.reverse())];
}

function normalizeSpeechText(input: string) {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseGermanNumberWord(word: string) {
  if (!word) {
    return null;
  }

  const directMatch = DIRECT_NUMBER_WORDS.get(word);

  if (directMatch !== undefined) {
    return directMatch;
  }

  for (const [tensWord, tensValue] of TENS_WORDS.entries()) {
    const separator = "und";

    if (!word.endsWith(tensWord) || !word.includes(separator)) {
      continue;
    }

    const unitWord = word.slice(0, word.length - tensWord.length - separator.length);
    const unitValue = UNIT_WORDS.get(unitWord);

    if (unitValue !== undefined) {
      return tensValue + unitValue;
    }
  }

  return null;
}
