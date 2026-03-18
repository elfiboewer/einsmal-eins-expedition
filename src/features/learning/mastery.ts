import {
  ALL_TRAINING_FACTS,
  CLASSIC_FAMILIES,
  getFactsForFocus,
  type FamilyFocus,
  type MultiplicationFact,
} from "@/features/learning/facts";

export type MasteryRecord = {
  avgResponseMs: number | null;
  correctStreak: number;
  factId: string;
  lastResult: "correct" | "incorrect" | null;
  lastSeenAt: string | null;
  score: number;
  seenCount: number;
};

export type Question = MultiplicationFact & {
  askedAt: number;
  options: number[];
};

export type AnswerFeedback = {
  correct: boolean;
  fact: MultiplicationFact;
  responseMs: number;
  selectedAnswer: number;
};

export type LearningSessionMode = "learn" | "quiz";

export type SessionSummary = {
  completedAt: string;
  correctCount: number;
  fastestAnswerMs: number | null;
  label: string;
  length: number;
  mode: LearningSessionMode;
  starCount: number;
};

export function getMasteryRecord(
  masteryMap: Record<string, MasteryRecord>,
  factId: string
) {
  return (
    masteryMap[factId] ?? {
      avgResponseMs: null,
      correctStreak: 0,
      factId,
      lastResult: null,
      lastSeenAt: null,
      score: 0,
      seenCount: 0,
    }
  );
}

export function buildQuestion(
  fact: MultiplicationFact,
  factPool: MultiplicationFact[]
): Question {
  return {
    ...fact,
    askedAt: Date.now(),
    options: buildOptions(fact, factPool),
  };
}

export function buildSessionFacts(focus: FamilyFocus): MultiplicationFact[] {
  if (focus === "mixed") {
    return [...ALL_TRAINING_FACTS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 15);
  }

  return [...getFactsForFocus(focus)].sort((left, right) => left.right - right.right);
}

export function getFocusProgress(
  focus: FamilyFocus,
  masteryMap: Record<string, MasteryRecord>
) {
  const facts = getFactsForFocus(focus);
  const total = facts.reduce(
    (sum, fact) => sum + getMasteryRecord(masteryMap, fact.id).score,
    0
  );

  return facts.length === 0 ? 0 : total / facts.length;
}

export function getOverallProgress(
  masteryMap: Record<string, MasteryRecord>
) {
  const total = ALL_TRAINING_FACTS.reduce(
    (sum, fact) => sum + getMasteryRecord(masteryMap, fact.id).score,
    0
  );

  return total / ALL_TRAINING_FACTS.length;
}

export function getMasteredFactCount(
  masteryMap: Record<string, MasteryRecord>
) {
  return ALL_TRAINING_FACTS.filter(
    (fact) => getMasteryRecord(masteryMap, fact.id).score >= 0.85
  ).length;
}

export function getWeakFacts(masteryMap: Record<string, MasteryRecord>) {
  return ALL_TRAINING_FACTS.map((fact) => ({
    ...fact,
    score: getMasteryRecord(masteryMap, fact.id).score,
    seenCount: getMasteryRecord(masteryMap, fact.id).seenCount,
  }))
    .filter((fact) => fact.seenCount > 0)
    .sort((left, right) => left.score - right.score);
}

export function getRecommendedFocus(
  masteryMap: Record<string, MasteryRecord>
): FamilyFocus {
  const rankedFamilies = CLASSIC_FAMILIES.map((family) => ({
    family,
    progress: getFocusProgress(family, masteryMap),
  })).sort((left, right) => left.progress - right.progress);

  if (rankedFamilies.every((family) => family.progress >= 0.92)) {
    return "mixed";
  }

  return rankedFamilies[0]?.family ?? 1;
}

export function summarizeSession(
  focus: FamilyFocus,
  feedbackItems: AnswerFeedback[],
  mode: LearningSessionMode = "quiz"
): SessionSummary {
  const correctCount = feedbackItems.filter((item) => item.correct).length;
  const accuracy =
    feedbackItems.length === 0 ? 0 : correctCount / feedbackItems.length;
  const starCount = accuracy >= 0.9 ? 3 : accuracy >= 0.65 ? 2 : 1;
  const fastestAnswerMs =
    feedbackItems.length === 0
      ? null
      : Math.min(...feedbackItems.map((item) => item.responseMs));

  return {
    completedAt: new Date().toISOString(),
    correctCount,
    fastestAnswerMs,
    label: focus === "mixed" ? "Gemischte Runde" : `${focus}er-Reihe`,
    length: feedbackItems.length,
    mode,
    starCount,
  };
}

export function updateMasteryRecord(
  masteryMap: Record<string, MasteryRecord>,
  feedback: AnswerFeedback
) {
  const current = getMasteryRecord(masteryMap, feedback.fact.id);
  const speedBonus =
    feedback.responseMs <= 2200
      ? 0.12
      : feedback.responseMs <= 4200
        ? 0.08
        : 0.04;
  const delta = feedback.correct ? 0.16 + speedBonus : -0.18;
  const nextScore = Math.max(0, Math.min(1, current.score + delta));
  const avgResponseMs =
    current.avgResponseMs === null
      ? feedback.responseMs
      : Math.round(
          (current.avgResponseMs * current.seenCount + feedback.responseMs) /
            (current.seenCount + 1)
        );
  const nextRecord: MasteryRecord = {
    avgResponseMs,
    correctStreak: feedback.correct ? current.correctStreak + 1 : 0,
    factId: feedback.fact.id,
    lastResult: feedback.correct ? "correct" : "incorrect",
    lastSeenAt: new Date().toISOString(),
    score: nextScore,
    seenCount: current.seenCount + 1,
  };

  return {
    ...masteryMap,
    [feedback.fact.id]: nextRecord,
  };
}

function buildOptions(fact: MultiplicationFact, factPool: MultiplicationFact[]) {
  const options = new Set<number>([fact.product]);
  const offsets = [fact.right, fact.left, fact.right + 1, fact.left + 1];

  for (const offset of offsets) {
    if (options.size >= 4) {
      break;
    }

    const candidate = fact.product + offset;
    if (candidate > 0 && candidate <= 100) {
      options.add(candidate);
    }
  }

  for (const neighbor of factPool) {
    if (options.size >= 4) {
      break;
    }

    if (neighbor.id !== fact.id) {
      options.add(neighbor.product);
    }
  }

  return [...options].slice(0, 4).sort(() => Math.random() - 0.5);
}
