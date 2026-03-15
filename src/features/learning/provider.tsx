import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as React from "react";

import {
  ALL_TRAINING_FACTS,
  getFactsForFocus,
  type FamilyFocus,
  type MultiplicationFact,
} from "@/features/learning/facts";
import {
  buildQuestion,
  buildSessionFacts,
  getFocusProgress,
  getMasteredFactCount,
  getOverallProgress,
  getRecommendedFocus,
  getWeakFacts,
  summarizeSession,
  type AnswerFeedback,
  type MasteryRecord,
  type Question,
  type SessionSummary,
  updateMasteryRecord,
} from "@/features/learning/mastery";
import {
  loadStoredLearningState,
  saveStoredLearningState,
} from "@/features/learning/storage";

type ActiveSession = {
  currentIndex: number;
  feedback: AnswerFeedback | null;
  focus: FamilyFocus;
  length: number;
  questionPool: MultiplicationFact[];
  queue: MultiplicationFact[];
  question: Question;
  results: AnswerFeedback[];
  status: "active";
};

type CompletedSession = SessionSummary & {
  focus: FamilyFocus;
  status: "complete";
};

type SessionState = ActiveSession | CompletedSession | null;

type LearningContextValue = {
  advanceSession: () => void;
  answerCurrent: (answer: number) => void;
  getFocusProgress: (focus: FamilyFocus) => number;
  isHydrated: boolean;
  lastCompletedSession: SessionSummary | null;
  masteredFactCount: number;
  overallProgress: number;
  recommendedFocus: FamilyFocus;
  resetSession: () => void;
  session: SessionState;
  startSession: (focus: FamilyFocus) => void;
  stickerCount: number;
  totalFactCount: number;
  weakFacts: Array<{
    id: string;
    left: number;
    product: number;
    right: number;
    score: number;
    seenCount: number;
  }>;
};

const LearningContext = React.createContext<LearningContextValue | null>(null);

export function LearningProvider({
  children,
}: React.PropsWithChildren) {
  const correctAnswerPlayer = useAudioPlayer(
    require("../../../assets/sounds/correct.wav")
  );
  const wrongAnswerPlayer = useAudioPlayer(
    require("../../../assets/sounds/wrong.wav")
  );
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [masteryMap, setMasteryMap] = React.useState<
    Record<string, MasteryRecord>
  >({});
  const [session, setSession] = React.useState<SessionState>(null);
  const [lastCompletedSession, setLastCompletedSession] =
    React.useState<SessionSummary | null>(null);

  React.useEffect(() => {
    correctAnswerPlayer.volume = 0.45;
    wrongAnswerPlayer.volume = 0.38;
  }, [correctAnswerPlayer, wrongAnswerPlayer]);

  React.useEffect(() => {
    void setAudioModeAsync({
      interruptionMode: "mixWithOthers",
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
    }).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const storedState = await loadStoredLearningState();

      if (!isMounted) {
        return;
      }

      setMasteryMap(storedState?.masteryMap ?? {});
      setLastCompletedSession(storedState?.lastCompletedSession ?? null);
      setIsHydrated(true);
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  async function persistState(
    nextMasteryMap: Record<string, MasteryRecord>,
    nextSummary: SessionSummary | null
  ) {
    await saveStoredLearningState({
      lastCompletedSession: nextSummary,
      masteryMap: nextMasteryMap,
    });
  }

  function startSession(focus: FamilyFocus) {
    const queue = buildSessionFacts(focus);
    const questionPool = focus === "mixed" ? ALL_TRAINING_FACTS : getFactsForFocus(focus);

    setSession({
      currentIndex: 0,
      feedback: null,
      focus,
      length: queue.length,
      question: buildQuestion(queue[0], questionPool),
      questionPool,
      queue,
      results: [],
      status: "active",
    });
  }

  function answerCurrent(answer: number) {
    setSession((currentSession) => {
      if (
        !currentSession ||
        currentSession.status !== "active" ||
        currentSession.feedback
      ) {
        return currentSession;
      }

      const responseMs = Date.now() - currentSession.question.askedAt;
      const feedback: AnswerFeedback = {
        correct: currentSession.question.product === answer,
        fact: currentSession.question,
        responseMs,
        selectedAnswer: answer,
      };
      const nextMasteryMap = updateMasteryRecord(masteryMap, feedback);

      setMasteryMap(nextMasteryMap);
      void persistState(nextMasteryMap, lastCompletedSession);
      void Haptics.notificationAsync(
        feedback.correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      void playFeedbackSound(feedback.correct);

      return {
        ...currentSession,
        feedback,
        results: [...currentSession.results, feedback],
      };
    });
  }

  function advanceSession() {
    setSession((currentSession) => {
      if (
        !currentSession ||
        currentSession.status !== "active" ||
        !currentSession.feedback
      ) {
        return currentSession;
      }

      if (currentSession.results.length >= currentSession.length) {
        const summary = summarizeSession(
          currentSession.focus,
          currentSession.results
        );

        setLastCompletedSession(summary);
        void persistState(masteryMap, summary);

        return {
          ...summary,
          focus: currentSession.focus,
          status: "complete",
        };
      }

      const nextIndex = currentSession.currentIndex + 1;
      const nextFact = currentSession.queue[nextIndex];

      return {
        ...currentSession,
        currentIndex: nextIndex,
        feedback: null,
        question: buildQuestion(nextFact, currentSession.questionPool),
      };
    });
  }

  function resetSession() {
    setSession(null);
  }

  async function playFeedbackSound(isCorrect: boolean) {
    const player = isCorrect ? correctAnswerPlayer : wrongAnswerPlayer;

    try {
      await player.seekTo(0);
      player.play();
    } catch {
      player.play();
    }
  }

  const overallProgress = getOverallProgress(masteryMap);
  const masteredFactCount = getMasteredFactCount(masteryMap);
  const weakFacts = getWeakFacts(masteryMap);
  const recommendedFocus = getRecommendedFocus(masteryMap);
  const stickerCount = Math.max(1, Math.floor(masteredFactCount / 10) + 1);

  const value: LearningContextValue = {
    advanceSession,
    answerCurrent,
    getFocusProgress: (focus) => getFocusProgress(focus, masteryMap),
    isHydrated,
    lastCompletedSession,
    masteredFactCount,
    overallProgress,
    recommendedFocus,
    resetSession,
    session,
    startSession,
    stickerCount,
    totalFactCount: ALL_TRAINING_FACTS.length,
    weakFacts,
  };

  return (
    <LearningContext.Provider value={value}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = React.use(LearningContext);

  if (!context) {
    throw new Error("useLearning must be used within LearningProvider.");
  }

  return context;
}

export type { FamilyFocus };
