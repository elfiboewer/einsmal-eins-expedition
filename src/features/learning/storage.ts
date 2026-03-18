import { File, Paths } from "expo-file-system";

import {
  type MasteryRecord,
  type SessionSummary,
} from "@/features/learning/mastery";

type StoredLearningState = {
  lastCompletedSession: SessionSummary | null;
  lastCompletedSessions?: {
    learn: SessionSummary | null;
    quiz: SessionSummary | null;
  };
  masteryMap: Record<string, MasteryRecord>;
};

const STORAGE_KEY = "einsmal-eins-expedition.learning-state";

export async function loadStoredLearningState(): Promise<StoredLearningState | null> {
  try {
    if (canUseLocalStorage()) {
      const rawValue = localStorage.getItem(STORAGE_KEY);

      if (!rawValue) {
        return null;
      }

      const parsedState = JSON.parse(rawValue) as StoredLearningState;

      return {
        ...parsedState,
        lastCompletedSession: normalizeStoredSummary(parsedState.lastCompletedSession),
        lastCompletedSessions: normalizeStoredSummaries(
          parsedState.lastCompletedSessions,
          parsedState.lastCompletedSession
        ),
      };
    }

    const storageFile = getNativeStorageFile();

    if (!storageFile.exists) {
      return null;
    }

    const rawValue = await storageFile.text();

    if (!rawValue) {
      return null;
    }

    const parsedState = JSON.parse(rawValue) as StoredLearningState;

    return {
      ...parsedState,
      lastCompletedSession: normalizeStoredSummary(parsedState.lastCompletedSession),
      lastCompletedSessions: normalizeStoredSummaries(
        parsedState.lastCompletedSessions,
        parsedState.lastCompletedSession
      ),
    };
  } catch {
    return null;
  }
}

export async function saveStoredLearningState(state: StoredLearningState) {
  const serializedState = JSON.stringify(state);

  if (canUseLocalStorage()) {
    localStorage.setItem(STORAGE_KEY, serializedState);
    return;
  }

  const storageFile = getNativeStorageFile();

  if (!storageFile.parentDirectory.exists) {
    storageFile.parentDirectory.create({
      idempotent: true,
      intermediates: true,
    });
  }

  if (!storageFile.exists) {
    storageFile.create({ intermediates: true, overwrite: true });
  }

  storageFile.write(serializedState, { encoding: "utf8" });
}

function canUseLocalStorage() {
  return process.env.EXPO_OS === "web" && typeof localStorage !== "undefined";
}

function getNativeStorageFile() {
  return new File(
    Paths.document,
    "einsmal-eins-expedition",
    "learning-state.json"
  );
}

function normalizeStoredSummary(summary: SessionSummary | null | undefined) {
  if (!summary) {
    return null;
  }

  return {
    ...summary,
    completedAt: summary.completedAt ?? new Date(0).toISOString(),
    mode: summary.mode ?? "quiz",
  };
}

function normalizeStoredSummaries(
  summaries:
    | {
        learn: SessionSummary | null;
        quiz: SessionSummary | null;
      }
    | undefined,
  fallbackSummary: SessionSummary | null | undefined
) {
  const normalizedSummaries = {
    learn: normalizeStoredSummary(summaries?.learn),
    quiz: normalizeStoredSummary(summaries?.quiz),
  };

  if (!normalizedSummaries.learn && !normalizedSummaries.quiz && fallbackSummary) {
    const normalizedFallback = normalizeStoredSummary(fallbackSummary);

    if (normalizedFallback) {
      normalizedSummaries[normalizedFallback.mode] = normalizedFallback;
    }
  }

  return normalizedSummaries;
}
