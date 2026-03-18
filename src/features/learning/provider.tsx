import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as React from "react";

import {
  ALL_TRAINING_FACTS,
  CLASSIC_FAMILIES,
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
  type LearningSessionMode,
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
  completePracticeSession: (
    focus: FamilyFocus,
    feedbackItems: AnswerFeedback[],
    mode?: LearningSessionMode
  ) => SessionSummary;
  getFocusProgress: (focus: FamilyFocus) => number;
  isHydrated: boolean;
  lastCompletedSession: SessionSummary | null;
  lastCompletedSessions: {
    learn: SessionSummary | null;
    quiz: SessionSummary | null;
  };
  masteredFactCount: number;
  overallProgress: number;
  recordPracticeAnswer: (
    fact: MultiplicationFact,
    answer: number,
    responseMs: number,
    mode?: LearningSessionMode
  ) => AnswerFeedback;
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
  const [lastCompletedSessions, setLastCompletedSessions] = React.useState<{
    learn: SessionSummary | null;
    quiz: SessionSummary | null;
  }>({
    learn: null,
    quiz: null,
  });
  const masteryMapRef = React.useRef(masteryMap);
  const lastCompletedSessionRef = React.useRef(lastCompletedSession);
  const lastCompletedSessionsRef = React.useRef(lastCompletedSessions);
  const webSoundPlaybackBlockedRef = React.useRef(false);

  React.useEffect(() => {
    correctAnswerPlayer.volume = 0.45;
    wrongAnswerPlayer.volume = 0.38;
  }, [correctAnswerPlayer, wrongAnswerPlayer]);

  React.useEffect(() => {
    masteryMapRef.current = masteryMap;
  }, [masteryMap]);

  React.useEffect(() => {
    lastCompletedSessionRef.current = lastCompletedSession;
  }, [lastCompletedSession]);

  React.useEffect(() => {
    lastCompletedSessionsRef.current = lastCompletedSessions;
  }, [lastCompletedSessions]);

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
      setLastCompletedSessions({
        learn: storedState?.lastCompletedSessions?.learn ?? null,
        quiz: storedState?.lastCompletedSessions?.quiz ?? null,
      });
      setIsHydrated(true);
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  async function persistState(
    nextMasteryMap: Record<string, MasteryRecord>,
    nextSummary: SessionSummary | null,
    nextSummaries: {
      learn: SessionSummary | null;
      quiz: SessionSummary | null;
    } = lastCompletedSessionsRef.current
  ) {
    await saveStoredLearningState({
      lastCompletedSession: nextSummary,
      lastCompletedSessions: nextSummaries,
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

  function applyFeedback(feedback: AnswerFeedback) {
    const nextMasteryMap = updateMasteryRecord(masteryMapRef.current, feedback);

    masteryMapRef.current = nextMasteryMap;
    setMasteryMap(nextMasteryMap);
    void persistState(
      nextMasteryMap,
      lastCompletedSessionRef.current,
      lastCompletedSessionsRef.current
    );
    void Haptics.notificationAsync(
      feedback.correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
    void playFeedbackSound(feedback.correct);

    return feedback;
  }

  function completePracticeSession(
    focus: FamilyFocus,
    feedbackItems: AnswerFeedback[],
    mode: LearningSessionMode = "quiz"
  ) {
    const summary = summarizeSession(focus, feedbackItems, mode);
    const nextSummaries = {
      ...lastCompletedSessionsRef.current,
      [mode]: summary,
    };

    lastCompletedSessionRef.current = summary;
    lastCompletedSessionsRef.current = nextSummaries;
    setLastCompletedSession(summary);
    setLastCompletedSessions(nextSummaries);
    void persistState(masteryMapRef.current, summary, nextSummaries);

    return summary;
  }

  function recordPracticeAnswer(
    fact: MultiplicationFact,
    answer: number,
    responseMs: number,
    _mode: LearningSessionMode = "learn"
  ) {
    return applyFeedback({
      correct: fact.product === answer,
      fact,
      responseMs,
      selectedAnswer: answer,
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
      applyFeedback(feedback);

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
        const summary = completePracticeSession(
          currentSession.focus,
          currentSession.results,
          "quiz"
        );

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

    if (process.env.EXPO_OS === "web") {
      if (webSoundPlaybackBlockedRef.current) {
        return;
      }

      const media = (
        player as unknown as {
          media?: {
            currentTime?: number;
            play?: () => Promise<unknown> | void;
          };
        }
      ).media;

      if (!media?.play) {
        return;
      }

      try {
        if (typeof media.currentTime === "number") {
          media.currentTime = 0;
        }

        const playResult = media.play();

        if (
          playResult &&
          typeof (playResult as Promise<unknown>).catch === "function"
        ) {
          await (playResult as Promise<unknown>).catch(() => {
            webSoundPlaybackBlockedRef.current = true;
          });
        }
      } catch {
        webSoundPlaybackBlockedRef.current = true;
      }

      return;
    }

    try {
      await player.seekTo(0);
      player.play();
    } catch {
      try {
        player.play();
      } catch {
        // Ignore audio failures so feedback never breaks the game flow.
      }
    }
  }

  const overallProgress = getOverallProgress(masteryMap);
  const masteredFactCount = getMasteredFactCount(masteryMap);
  const weakFacts = getWeakFacts(masteryMap);
  const recommendedFocus = getRecommendedFocus(masteryMap);
  const stickerCount =
    CLASSIC_FAMILIES.filter(
      (family) => getFocusProgress(family, masteryMap) >= 0.85
    ).length + (overallProgress >= 0.92 ? 1 : 0);

  const value: LearningContextValue = {
    advanceSession,
    answerCurrent,
    completePracticeSession,
    getFocusProgress: (focus) => getFocusProgress(focus, masteryMap),
    isHydrated,
    lastCompletedSession,
    lastCompletedSessions,
    masteredFactCount,
    overallProgress,
    recordPracticeAnswer,
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
