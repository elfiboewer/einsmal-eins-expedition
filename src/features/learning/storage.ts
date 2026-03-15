import { File, Paths } from "expo-file-system";

import {
  type MasteryRecord,
  type SessionSummary,
} from "@/features/learning/mastery";

type StoredLearningState = {
  lastCompletedSession: SessionSummary | null;
  masteryMap: Record<string, MasteryRecord>;
};

const STORAGE_KEY = "einsmal-eins-expedition.learning-state";

export async function loadStoredLearningState(): Promise<StoredLearningState | null> {
  try {
    if (canUseLocalStorage()) {
      const rawValue = localStorage.getItem(STORAGE_KEY);

      return rawValue ? (JSON.parse(rawValue) as StoredLearningState) : null;
    }

    const storageFile = getNativeStorageFile();

    if (!storageFile.exists) {
      return null;
    }

    const rawValue = await storageFile.text();

    return rawValue ? (JSON.parse(rawValue) as StoredLearningState) : null;
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
