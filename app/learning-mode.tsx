import * as React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { ActionButton } from "@/components/action-button";
import { HandwritingPad } from "@/components/handwriting-pad";
import { SurfaceCard } from "@/components/surface-card";
import {
  formatFactExpression,
  formatFamilyLabel,
  getFactsForFocus,
  getFocusTheme,
} from "@/features/learning/facts";
import {
  normalizeFocusParam,
  stringifyFocusParam,
} from "@/features/learning/focus";
import {
  prepareInkRecognitionAsync,
  recognizeInkAnswerAsync,
  type MathInkRecognition,
} from "@/features/learning/ink-recognition";
import {
  type HandwritingStroke,
} from "@/features/learning/handwriting";
import { useLearning } from "@/features/learning/provider";
import { palette } from "@/theme/palette";

type LearningAnswerState = {
  checked: boolean;
  confidence: number;
  correct: boolean | null;
  digitStrokes: HandwritingStroke[][];
  recognizedValue: number | null;
  responseMs: number | null;
  strokes: HandwritingStroke[];
};

const AUTO_ADVANCE_DELAY_MS = 1050;
const DIGIT_FIELD_X_OFFSET = 136;
const MIN_DIGIT_POINTS = 4;
const EMPTY_RECOGNITION: MathInkRecognition = {
  confidence: 0,
  digits: [],
  rawText: null,
  source: "fallback",
  value: null,
};

export default function LearningModeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();
  const { width } = useWindowDimensions();
  const { completePracticeSession, recordPracticeAnswer } = useLearning();
  const focus = normalizeFocusParam(params.focus);
  const facts = React.useMemo(() => {
    if (!focus || focus === "mixed") {
      return [];
    }

    return [...getFactsForFocus(focus)].sort((left, right) => left.right - right.right);
  }, [focus]);
  const [answers, setAnswers] = React.useState<Record<string, LearningAnswerState>>(
    () => buildInitialAnswers(facts)
  );
  const [activeFactId, setActiveFactId] = React.useState<string | null>(
    facts[0]?.id ?? null
  );
  const [activeRecognition, setActiveRecognition] =
    React.useState<MathInkRecognition>(EMPTY_RECOGNITION);
  const [isRecognizerReady, setIsRecognizerReady] = React.useState(
    process.env.EXPO_OS === "web"
  );
  const [isCheckingRecognition, setIsCheckingRecognition] = React.useState(false);
  const [summarySaved, setSummarySaved] = React.useState(false);
  const [isPadInteracting, setIsPadInteracting] = React.useState(false);
  const factStartTimesRef = React.useRef<Record<string, number>>({});
  const autoAdvanceTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRequestIdRef = React.useRef(0);
  const answersRef = React.useRef(answers);
  const activeFactIdRef = React.useRef(activeFactId);

  React.useEffect(() => {
    setAnswers(buildInitialAnswers(facts));
    setActiveFactId(facts[0]?.id ?? null);
    setActiveRecognition(EMPTY_RECOGNITION);
    setIsCheckingRecognition(false);
    setSummarySaved(false);
    factStartTimesRef.current = {};
  }, [facts]);

  React.useEffect(() => {
    if (activeFactId && !factStartTimesRef.current[activeFactId]) {
      factStartTimesRef.current[activeFactId] = Date.now();
    }
  }, [activeFactId]);

  React.useEffect(() => {
    recognitionRequestIdRef.current += 1;
    setActiveRecognition(EMPTY_RECOGNITION);
    setIsCheckingRecognition(false);
  }, [activeFactId]);

  React.useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  React.useEffect(() => {
    activeFactIdRef.current = activeFactId;
  }, [activeFactId]);

  React.useEffect(
    () => () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    },
    []
  );

  const factsById = React.useMemo(
    () => Object.fromEntries(facts.map((fact) => [fact.id, fact])),
    [facts]
  );
  const activeFact = facts.find((fact) => fact.id === activeFactId) ?? facts[0] ?? null;
  const activeAnswer = activeFact ? answers[activeFact.id] : null;
  const activeDigitSlots = React.useMemo(
    () => buildEmptyDigitStrokes(activeFact?.product ?? 0),
    [activeFact?.product]
  );
  const activeDigitStrokes = activeAnswer?.digitStrokes ?? activeDigitSlots;
  const usesMultipleDigitPads = activeDigitStrokes.length > 1;
  const activeStrokePointCount = getStrokePointCount(activeAnswer?.strokes ?? []);
  const activeDigitPointCounts = activeDigitStrokes.map((digitStrokes) =>
    getStrokePointCount(digitStrokes)
  );
  const minimumPointsForCheck = activeFact
    ? Math.max(4, String(activeFact.product).length * 4)
    : 4;
  const hasEnoughDigitInk = usesMultipleDigitPads
    ? activeDigitPointCounts.every((pointCount) => pointCount >= MIN_DIGIT_POINTS)
    : activeStrokePointCount >= minimumPointsForCheck;
  const canCheckActiveAnswer = Boolean(
    activeFact &&
      activeAnswer &&
      !activeAnswer.checked &&
      !isCheckingRecognition &&
      hasEnoughDigitInk
  );

  React.useEffect(() => {
    let isCancelled = false;

    if (!focus || focus === "mixed") {
      return;
    }

    void prepareInkRecognitionAsync().then((result) => {
      if (isCancelled) {
        return;
      }

      setIsRecognizerReady(result.ready || result.source === "fallback");
    });

    return () => {
      isCancelled = true;
    };
  }, [focus]);

  React.useEffect(() => {
    if (!focus || focus === "mixed" || facts.length === 0 || summarySaved) {
      return;
    }

    const feedbackItems = facts.flatMap((fact) => {
      const answer = answers[fact.id];

      if (
        !answer?.checked ||
        answer.recognizedValue === null ||
        answer.responseMs === null
      ) {
        return [];
      }

      return [
        {
          correct: Boolean(answer.correct),
          fact,
          responseMs: answer.responseMs,
          selectedAnswer: answer.recognizedValue,
        },
      ];
    });

    if (feedbackItems.length === facts.length) {
      completePracticeSession(focus, feedbackItems, "learn");
      setSummarySaved(true);
    }
  }, [answers, completePracticeSession, facts, focus, summarySaved]);

  if (!focus || focus === "mixed") {
    return (
      <ScrollView
        contentContainerStyle={{
          gap: 18,
          padding: 20,
          paddingBottom: 28,
        }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <SurfaceCard tone="warning">
          <Text style={{ color: palette.ink, fontSize: 26, fontWeight: "900" }}>
            Lernmodus nur fur einzelne Reihen
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            Fur die gemischte Runde bleibt der Quizmodus die richtige Wahl.
          </Text>
          <ActionButton
            label="Zur Modusauswahl"
            onPress={() => router.replace("/")}
          />
        </SurfaceCard>
      </ScrollView>
    );
  }

  const focusTheme = getFocusTheme(focus);
  const isTabletLayout = width >= 900;
  const completedCount = facts.filter((fact) => answers[fact.id]?.checked).length;
  const correctCount = facts.filter((fact) => answers[fact.id]?.correct).length;

  const commitAnswerForFact = React.useCallback(
    (factId: string, recognition: MathInkRecognition) => {
      const fact = factsById[factId];
      const currentAnswer = answersRef.current[factId];

      if (!fact || !currentAnswer || currentAnswer.checked) {
        return;
      }

      if (recognition.value === null) {
        setAnswers((currentAnswers) => ({
          ...currentAnswers,
          [factId]: {
            ...currentAnswers[factId],
            confidence: recognition.confidence,
            recognizedValue: null,
          },
        }));
        return;
      }

      const responseMs = Math.max(
        400,
        Date.now() - (factStartTimesRef.current[factId] ?? Date.now())
      );
      const feedback = recordPracticeAnswer(
        fact,
        recognition.value,
        responseMs,
        "learn"
      );

      setSummarySaved(false);
      setAnswers((currentAnswers) => {
        const nextAnswer = currentAnswers[factId];

        if (!nextAnswer || nextAnswer.checked) {
          return currentAnswers;
        }

        return {
          ...currentAnswers,
          [factId]: {
            ...nextAnswer,
            checked: true,
            confidence: recognition.confidence,
            correct: feedback.correct,
            recognizedValue: recognition.value,
            responseMs,
          },
        };
      });
    },
    [factsById, recordPracticeAnswer]
  );

  const recognizeForFact = React.useCallback(
    async (factId: string, strokes: HandwritingStroke[]) => {
      const fact = factsById[factId];
      const currentAnswer = answersRef.current[factId];

      if (!fact || !currentAnswer || currentAnswer.checked) {
        return;
      }

      const expectedDigitCount = String(fact.product).length;
      const pointCount = strokes.reduce((sum, stroke) => sum + stroke.length, 0);

      if (pointCount < Math.max(4, expectedDigitCount * 4)) {
        if (activeFactIdRef.current === factId) {
          setActiveRecognition(EMPTY_RECOGNITION);
        }
        return;
      }

      setIsCheckingRecognition(true);
      const currentRequestId = recognitionRequestIdRef.current + 1;
      recognitionRequestIdRef.current = currentRequestId;
      try {
        const [combinedResult, perDigitResult] = await Promise.all([
          recognizeInkAnswerAsync(strokes, {
            expectedDigitCount,
            expectedValue: fact.product,
          }),
          recognizeDigitPadsForExpectedValue(currentAnswer.digitStrokes, fact.product),
        ]);
        const result = chooseBestRecognition(
          combinedResult,
          perDigitResult,
          fact.product
        );

        if (
          recognitionRequestIdRef.current !== currentRequestId ||
          activeFactIdRef.current !== factId
        ) {
          return;
        }

        setActiveRecognition(result);
        commitAnswerForFact(factId, result);
      } finally {
        if (recognitionRequestIdRef.current === currentRequestId) {
          setIsCheckingRecognition(false);
        }
      }
    },
    [commitAnswerForFact, factsById]
  );

  async function recognizeDigitPadsForExpectedValue(
    digitStrokes: HandwritingStroke[][],
    expectedValue: number
  ) {
    const expectedDigits = String(expectedValue).split("").map((digit) => Number(digit));

    if (
      digitStrokes.length !== expectedDigits.length ||
      digitStrokes.some((strokes) => getStrokePointCount(strokes) < MIN_DIGIT_POINTS)
    ) {
      return null;
    }

    const digitResults = await Promise.all(
      digitStrokes.map((strokes, index) =>
        recognizeInkAnswerAsync(strokes, {
          expectedDigitCount: 1,
          expectedValue: expectedDigits[index],
        })
      )
    );

    if (digitResults.some((result) => result.value === null || result.value! > 9)) {
      return null;
    }

    const digits = digitResults.map((result) => ({
      confidence: result.confidence,
      digit: result.value!,
    }));
    const confidence =
      digits.reduce((sum, digit) => sum + digit.confidence, 0) / digits.length;

    return {
      confidence,
      digits,
      rawText: digits.map((digit) => `${digit.digit}`).join(""),
      source: digitResults.every((result) => result.source === "ml-kit")
        ? ("ml-kit" as const)
        : ("fallback" as const),
      value: Number(digits.map((digit) => digit.digit).join("")),
    } satisfies MathInkRecognition;
  }

  function chooseBestRecognition(
    combinedResult: MathInkRecognition,
    perDigitResult: MathInkRecognition | null,
    expectedValue: number
  ) {
    const candidates = [combinedResult, perDigitResult].filter(
      (candidate): candidate is MathInkRecognition => candidate !== null
    );
    const exactCandidates = candidates.filter(
      (candidate) => candidate.value === expectedValue && candidate.confidence >= 0.26
    );

    if (exactCandidates.length > 0) {
      return exactCandidates.sort((left, right) => right.confidence - left.confidence)[0];
    }

    const readableCandidates = candidates.filter((candidate) => candidate.value !== null);

    if (readableCandidates.length > 0) {
      return readableCandidates.sort((left, right) => right.confidence - left.confidence)[0];
    }

    return combinedResult;
  }

  function syncActiveDigitStrokes(digitIndex: number, strokes: HandwritingStroke[]) {
    if (!activeFact) {
      return [] as HandwritingStroke[];
    }

    if (!factStartTimesRef.current[activeFact.id]) {
      factStartTimesRef.current[activeFact.id] = Date.now();
    }

    const nextDigitStrokes = activeDigitStrokes.map((digitStrokeGroup, index) =>
      index === digitIndex ? strokes : digitStrokeGroup
    );
    const combinedStrokes = combineDigitStrokes(nextDigitStrokes);

    recognitionRequestIdRef.current += 1;
    setIsCheckingRecognition(false);
    setActiveRecognition(EMPTY_RECOGNITION);
    setSummarySaved(false);
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [activeFact.id]: {
        ...currentAnswers[activeFact.id],
        checked: false,
        confidence: 0,
        correct: null,
        digitStrokes: nextDigitStrokes,
        recognizedValue: null,
        responseMs: null,
        strokes: combinedStrokes,
      },
    }));

    return combinedStrokes;
  }

  function updateActiveDigitStrokes(digitIndex: number, strokes: HandwritingStroke[]) {
    syncActiveDigitStrokes(digitIndex, strokes);
  }

  function clearActiveAnswer() {
    if (!activeFact) {
      return;
    }

    setIsPadInteracting(false);
    factStartTimesRef.current[activeFact.id] = Date.now();
    recognitionRequestIdRef.current += 1;
    setActiveRecognition(EMPTY_RECOGNITION);
    setIsCheckingRecognition(false);
    setSummarySaved(false);
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [activeFact.id]: {
        checked: false,
        confidence: 0,
        correct: null,
        digitStrokes: buildEmptyDigitStrokes(activeFact.product),
        recognizedValue: null,
        responseMs: null,
        strokes: [],
      },
    }));
  }

  function handleDigitStrokeEnd(digitIndex: number, strokes: HandwritingStroke[]) {
    setIsPadInteracting(false);
    syncActiveDigitStrokes(digitIndex, strokes);
  }

  function checkActiveAnswer() {
    if (!activeFact || !activeAnswer || activeAnswer.checked || isCheckingRecognition) {
      return;
    }

    void recognizeForFact(activeFact.id, activeAnswer.strokes);
  }

  React.useEffect(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    if (!activeFact || !activeAnswer?.checked || completedCount === facts.length) {
      return;
    }

    const currentFactId = activeFact.id;

    autoAdvanceTimeoutRef.current = setTimeout(() => {
      const nextFact = facts.find(
        (fact) => fact.id !== currentFactId && !answers[fact.id]?.checked
      );

      if (nextFact) {
        setActiveRecognition(EMPTY_RECOGNITION);
        setIsCheckingRecognition(false);
        setActiveFactId(nextFact.id);
      }
    }, AUTO_ADVANCE_DELAY_MS);

    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };
  }, [activeAnswer?.checked, activeFact, answers, completedCount, facts]);

  return (
    <ScrollView
      scrollEnabled={!isPadInteracting}
      contentContainerStyle={{
        gap: 18,
        padding: isTabletLayout ? 24 : 20,
        paddingBottom: 28,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <SurfaceCard tone="accent">
        <Text style={{ color: palette.accentStrong, fontSize: 14, fontWeight: "800" }}>
          Lernmodus
        </Text>
        <Text style={{ color: palette.ink, fontSize: 30, fontWeight: "900" }}>
          {formatFamilyLabel(focus)} mit Stift und Touch
        </Text>
        <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
          Rechne die Aufgaben untereinander. Schreibe deine Antwort in Ruhe und
          drucke danach auf den Pruf-Button.
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <StatCard label="Erledigt" value={`${completedCount}/${facts.length}`} />
          <StatCard label="Richtig" value={`${correctCount}`} />
        </View>
      </SurfaceCard>

      <View
        style={{
          flexDirection: isTabletLayout ? "row" : "column",
          alignItems: "stretch",
          gap: 18,
        }}
      >
        <View
          style={{
            flex: isTabletLayout ? 1.05 : undefined,
            gap: 12,
          }}
        >
          <SurfaceCard>
            <Text style={{ color: palette.ink, fontSize: 22, fontWeight: "900" }}>
              Aufgabenliste
            </Text>
            <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
              Alle Aufgaben stehen schon bereit. Die aktive Aufgabe ist hervorgehoben.
            </Text>

            <View style={{ gap: 10 }}>
              {facts.map((fact) => {
                const answer = answers[fact.id];
                const isActive = fact.id === activeFact?.id;

                return (
                  <Pressable
                    key={fact.id}
                    onPress={() => setActiveFactId(fact.id)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      borderRadius: 22,
                      borderCurve: "continuous",
                      borderWidth: 1,
                      borderColor: isActive ? focusTheme.accent : palette.line,
                      backgroundColor: isActive
                        ? focusTheme.surface
                        : pressed
                          ? palette.surfaceAlt
                          : palette.surface,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                    })}
                  >
                    <View style={{ gap: 3 }}>
                      <Text
                        style={{
                          color: palette.ink,
                          fontSize: 20,
                          fontWeight: "900",
                        }}
                      >
                        {formatFactExpression(fact)}
                      </Text>
                      <Text
                        style={{
                          color: palette.muted,
                          fontSize: 14,
                          lineHeight: 20,
                        }}
                      >
                        {getTaskStatusLabel(answer, fact.product, isActive)}
                      </Text>
                    </View>

                    <TaskBadge
                      active={isActive}
                      correct={answer?.correct ?? null}
                      value={answer?.recognizedValue}
                    />
                  </Pressable>
                );
              })}
            </View>
          </SurfaceCard>
        </View>

        <View
          style={{
            flex: isTabletLayout ? 1.1 : undefined,
            gap: 12,
          }}
        >
          <SurfaceCard tone={activeAnswer?.correct === false ? "danger" : "accent"}>
            <Text style={{ color: focusTheme.accent, fontSize: 14, fontWeight: "800" }}>
              Aktive Aufgabe
            </Text>
            <Text style={{ color: palette.ink, fontSize: 34, fontWeight: "900" }}>
              {activeFact ? `${formatFactExpression(activeFact)} = ?` : "Bitte wählen"}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
              {!isRecognizerReady
                ? "Ich lade gerade die bessere Schreib-Erkennung."
                : isCheckingRecognition
                  ? "Ich prufe deine Zahl gerade ganz in Ruhe."
                : activeAnswer?.checked
                  ? activeAnswer.correct
                    ? `Ich habe ${activeAnswer.recognizedValue} erkannt. Das ist richtig.`
                    : `Ich habe ${activeAnswer.recognizedValue} erkannt. Richtig ist ${activeFact?.product}.`
                : activeRecognition.value !== null
                  ? `Ich habe zuletzt ${activeRecognition.value} erkannt. Wenn das nicht passt, male einfach noch einmal und drucke erneut auf Prufen.`
                : !canCheckActiveAnswer
                  ? usesMultipleDigitPads
                    ? "Schreibe erst alle Ziffern deutlich in ihre eigenen Felder, dann wird der Pruf-Button aktiv."
                    : "Schreibe deine Zahl erst fertig, dann wird der Pruf-Button aktiv."
                : usesMultipleDigitPads
                  ? "Schreibe jede Ziffer in ihr eigenes Feld und drucke danach auf Antwort prufen."
                  : "Schreibe eine Zahl in das Feld und drucke danach auf Antwort prufen."}
            </Text>

            {activeAnswer?.checked ? (
              <ResultBanner
                correct={Boolean(activeAnswer.correct)}
                expectedValue={activeFact?.product ?? null}
                recognizedValue={activeAnswer.recognizedValue}
              />
            ) : null}

            <View
              style={{
                flexDirection: usesMultipleDigitPads ? "row" : "column",
                gap: 12,
              }}
            >
              {activeDigitStrokes.map((digitStrokeGroup, digitIndex) => (
                <View
                  key={`${activeFact?.id ?? "active"}-digit-${digitIndex}`}
                  style={{
                    flex: 1,
                    gap: 8,
                  }}
                >
                  {usesMultipleDigitPads ? (
                    <Text
                      style={{
                        color: palette.muted,
                        fontSize: 13,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      {digitIndex + 1}. Ziffer
                    </Text>
                  ) : null}
                  <HandwritingPad
                    accentColor={focusTheme.accent}
                    disabled={Boolean(activeAnswer?.checked)}
                    minHeight={usesMultipleDigitPads ? 180 : 220}
                    onChange={(strokes) => updateActiveDigitStrokes(digitIndex, strokes)}
                    onInteractionChange={setIsPadInteracting}
                    onStrokeEnd={(strokes) => handleDigitStrokeEnd(digitIndex, strokes)}
                    placeholder={
                      usesMultipleDigitPads
                        ? `${digitIndex + 1}. Ziffer`
                        : "Male deine Antwort hier hinein"
                    }
                    strokes={digitStrokeGroup}
                  />
                </View>
              ))}
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <View
                style={{
                  minWidth: 144,
                  flex: 1,
                  borderRadius: 20,
                  borderCurve: "continuous",
                  backgroundColor: palette.surfaceAlt,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "800" }}>
                  ERKENNUNG
                </Text>
                <Text style={{ color: palette.ink, fontSize: 24, fontWeight: "900" }}>
                  {activeAnswer?.checked
                    ? activeAnswer.recognizedValue ?? "?"
                    : activeRecognition.value ?? "?"}
                </Text>
              </View>
              <View
                style={{
                  minWidth: 144,
                  flex: 1,
                  borderRadius: 20,
                  borderCurve: "continuous",
                  backgroundColor: palette.surfaceAlt,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "800" }}>
                  SICHERHEIT
                </Text>
                <Text style={{ color: palette.ink, fontSize: 24, fontWeight: "900" }}>
                  {Math.round(
                    (activeAnswer?.checked
                      ? activeAnswer.confidence
                      : activeRecognition.confidence) * 100
                  )}
                  %
                </Text>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              {activeAnswer?.checked ? null : (
                <>
                  <ActionButton
                    disabled={!canCheckActiveAnswer}
                    label={isCheckingRecognition ? "Antwort wird gepruft..." : "Antwort prufen"}
                    onPress={checkActiveAnswer}
                  />
                  <ActionButton
                    label={usesMultipleDigitPads ? "Felder leeren" : "Feld leeren"}
                    onPress={clearActiveAnswer}
                    variant="secondary"
                  />
                </>
              )}
              <ActionButton
                label="Zur Modusauswahl"
                onPress={() =>
                  router.replace({
                    pathname: "/mode-select",
                    params: { focus: stringifyFocusParam(focus) },
                  })
                }
                variant="ghost"
              />
            </View>
          </SurfaceCard>

          {completedCount === facts.length ? (
            <SurfaceCard tone="success">
              <Text style={{ color: palette.ink, fontSize: 24, fontWeight: "900" }}>
                Lernrunde geschafft
              </Text>
              <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
                Du hast alle Aufgaben bearbeitet. Die Ergebnisse wurden fur den
                Lernstand gespeichert.
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <StatCard label="Richtig" value={`${correctCount}/${facts.length}`} />
                <StatCard label="Trefferquote" value={`${Math.round((correctCount / facts.length) * 100)}%`} />
              </View>
              <ActionButton
                label="Nochmal im Lernmodus"
                onPress={() => {
                  setAnswers(buildInitialAnswers(facts));
                  setActiveFactId(facts[0]?.id ?? null);
                  setActiveRecognition(EMPTY_RECOGNITION);
                  setIsCheckingRecognition(false);
                  setSummarySaved(false);
                  factStartTimesRef.current = {};
                }}
              />
            </SurfaceCard>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function ResultBanner({
  correct,
  expectedValue,
  recognizedValue,
}: {
  correct: boolean;
  expectedValue: number | null;
  recognizedValue: number | null;
}) {
  return (
    <View
      style={{
        borderRadius: 24,
        borderCurve: "continuous",
        backgroundColor: correct ? palette.mintSoft : palette.coralSoft,
        paddingHorizontal: 16,
        paddingVertical: 14,
        boxShadow: "0 10px 22px rgba(17, 32, 49, 0.08)",
        gap: 4,
      }}
    >
      <Text
        style={{
          color: correct ? "#166534" : "#b91c1c",
          fontSize: 22,
          fontWeight: "900",
        }}
      >
        {correct ? "Richtig!" : "Nicht ganz"}
      </Text>
      <Text style={{ color: palette.ink, fontSize: 15, lineHeight: 22 }}>
        {correct
          ? `${recognizedValue} stimmt. Die nächste Aufgabe kommt sofort.`
          : `${recognizedValue} war nicht richtig. Richtig ist ${expectedValue}. Die nächste Aufgabe kommt sofort.`}
      </Text>
    </View>
  );
}

function buildInitialAnswers(
  facts: ReturnType<typeof getFactsForFocus>
): Record<string, LearningAnswerState> {
  return Object.fromEntries(
    facts.map((fact) => [
      fact.id,
      buildInitialAnswerState(fact.product),
    ])
  );
}

function buildInitialAnswerState(product: number): LearningAnswerState {
  return {
    checked: false,
    confidence: 0,
    correct: null,
    digitStrokes: buildEmptyDigitStrokes(product),
    recognizedValue: null,
    responseMs: null,
    strokes: [],
  };
}

function buildEmptyDigitStrokes(product: number) {
  return Array.from({ length: Math.max(1, String(product || 0).length) }, () => []);
}

function getStrokePointCount(strokes: HandwritingStroke[]) {
  return strokes.reduce((sum, stroke) => sum + stroke.length, 0);
}

function combineDigitStrokes(digitStrokes: HandwritingStroke[][]) {
  return digitStrokes.flatMap((strokeGroup, digitIndex) =>
    strokeGroup.map((stroke) =>
      stroke.map((point) => ({
        ...point,
        x: point.x + digitIndex * DIGIT_FIELD_X_OFFSET,
      }))
    )
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        minWidth: 148,
        flex: 1,
        borderRadius: 20,
        borderCurve: "continuous",
        backgroundColor: palette.surfaceAlt,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "800" }}>
        {label}
      </Text>
      <Text
        style={{
          color: palette.ink,
          fontSize: 24,
          fontVariant: ["tabular-nums"],
          fontWeight: "900",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function TaskBadge({
  active,
  correct,
  value,
}: {
  active: boolean;
  correct: boolean | null;
  value: number | null;
}) {
  const backgroundColor =
    correct === true
      ? palette.mintSoft
      : correct === false
        ? "#fff1f3"
        : active
          ? palette.accentSoft
          : palette.surfaceAlt;
  const textColor =
    correct === true
      ? "#0e7a53"
      : correct === false
        ? "#b33b55"
        : palette.ink;

  return (
    <View
      style={{
        minWidth: 58,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        borderCurve: "continuous",
        backgroundColor,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontSize: 18,
          fontWeight: "900",
        }}
      >
        {value ?? (active ? "..." : "—")}
      </Text>
    </View>
  );
}

function getTaskStatusLabel(
  answer: LearningAnswerState | undefined,
  product: number,
  isActive: boolean
) {
  if (!answer) {
    return "Noch offen";
  }

  if (answer.checked && answer.correct) {
    return `Super. ${answer.recognizedValue} ist richtig.`;
  }

  if (answer.checked && answer.correct === false) {
    return `${answer.recognizedValue} erkannt, richtig ware ${product}.`;
  }

  if (isActive) {
    return "Hier schreibst du gerade deine Antwort.";
  }

  if (answer.strokes.length > 0) {
    return "Schon gemalt, aber noch nicht gepruft.";
  }

  return "Noch offen";
}
