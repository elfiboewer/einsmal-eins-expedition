import * as React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { ActionButton } from "@/components/action-button";
import { SurfaceCard } from "@/components/surface-card";
import {
  formatFactExpression,
  getFocusTheme,
} from "@/features/learning/facts";
import { normalizeFocusParam, stringifyFocusParam } from "@/features/learning/focus";
import {
  buildSessionFacts,
  type AnswerFeedback,
} from "@/features/learning/mastery";
import {
  canPromptForMicrophonePermission,
  getSpokenNumberCandidate,
  isSpeechRecognitionSupported,
  requestMicrophonePermissionAsync,
  startSpeechRecognitionSession,
  type MicrophonePermissionStatus,
} from "@/features/learning/speech-recognition";
import { useLearning } from "@/features/learning/provider";
import { palette } from "@/theme/palette";

const AUTO_ADVANCE_DELAY_MS = 1200;

export default function SpeakingModeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();
  const { width } = useWindowDimensions();
  const { completePracticeSession, recordPracticeAnswer } = useLearning();
  const focus = normalizeFocusParam(params.focus);
  const facts = React.useMemo(
    () => (focus ? buildSessionFacts(focus) : []),
    [focus]
  );
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [currentFeedback, setCurrentFeedback] = React.useState<AnswerFeedback | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [recognizedValue, setRecognizedValue] = React.useState<number | null>(null);
  const [spokenTranscript, setSpokenTranscript] = React.useState<string | null>(null);
  const [microphonePermission, setMicrophonePermission] =
    React.useState<MicrophonePermissionStatus>(
      canPromptForMicrophonePermission()
        ? "denied"
        : process.env.EXPO_OS === "web" && !globalThis.isSecureContext
          ? "insecure"
          : "unsupported"
    );
  const [summarySaved, setSummarySaved] = React.useState(false);
  const [supported, setSupported] = React.useState(() => isSpeechRecognitionSupported());
  const [results, setResults] = React.useState<AnswerFeedback[]>([]);
  const recognitionSessionRef = React.useRef<ReturnType<
    typeof startSpeechRecognitionSession
  > | null>(null);
  const factStartTimesRef = React.useRef<Record<string, number>>({});
  const autoAdvanceTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
    setMicrophonePermission(
      canPromptForMicrophonePermission()
        ? "denied"
        : process.env.EXPO_OS === "web" && !globalThis.isSecureContext
          ? "insecure"
          : "unsupported"
    );
  }, []);

  React.useEffect(() => {
    setCurrentIndex(0);
    setCurrentFeedback(null);
    setErrorMessage(null);
    setIsListening(false);
    setRecognizedValue(null);
    setResults([]);
    setSpokenTranscript(null);
    setSummarySaved(false);
    factStartTimesRef.current = {};
  }, [facts]);

  React.useEffect(
    () => () => {
      recognitionSessionRef.current?.stop();

      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    },
    []
  );

  const currentFact = facts[currentIndex] ?? null;
  const focusTheme = getFocusTheme(focus ?? 1);
  const isCompactLayout = width < 700;
  const isRoundComplete = facts.length > 0 && results.length === facts.length;

  React.useEffect(() => {
    if (currentFact && !factStartTimesRef.current[currentFact.id]) {
      factStartTimesRef.current[currentFact.id] = Date.now();
    }
  }, [currentFact]);

  React.useEffect(() => {
    if (!focus || summarySaved || results.length !== facts.length || facts.length === 0) {
      return;
    }

    completePracticeSession(focus, results, "learn");
    setSummarySaved(true);
  }, [completePracticeSession, facts.length, focus, results, summarySaved]);

  React.useEffect(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    if (!currentFeedback || currentIndex >= facts.length - 1) {
      return;
    }

    autoAdvanceTimeoutRef.current = setTimeout(() => {
      setCurrentIndex((index) => index + 1);
      setCurrentFeedback(null);
      setErrorMessage(null);
      setRecognizedValue(null);
      setSpokenTranscript(null);
    }, AUTO_ADVANCE_DELAY_MS);

    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };
  }, [currentFeedback, currentIndex, facts.length]);

  if (!focus) {
    return (
      <ScrollView
        contentContainerStyle={{ gap: 18, padding: 20, paddingBottom: 28 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <SurfaceCard tone="warning">
          <Text style={{ color: palette.ink, fontSize: 26, fontWeight: "900" }}>
            Bitte zuerst eine Reihe auswahlen
          </Text>
          <ActionButton label="Zur Startseite" onPress={() => router.replace("/")} />
        </SurfaceCard>
      </ScrollView>
    );
  }

  function startListening() {
    if (!currentFact || isListening || currentFeedback) {
      return;
    }

    recognitionSessionRef.current?.stop();
    setErrorMessage(null);
    setRecognizedValue(null);
    setSpokenTranscript(null);
    setIsListening(true);

    void ensureMicrophonePermissionAndStart(currentFact);
  }

  function retryCurrent() {
    recognitionSessionRef.current?.stop();
    setCurrentFeedback(null);
    setErrorMessage(null);
    setRecognizedValue(null);
    setSpokenTranscript(null);
    if (currentFact) {
      factStartTimesRef.current[currentFact.id] = Date.now();
    }
  }

  const completedCount = results.length;
  const correctCount = results.filter((item) => item.correct).length;

  async function ensureMicrophonePermissionAndStart(
    fact: NonNullable<typeof currentFact>
  ) {
    const permissionResult = await requestMicrophonePermissionAsync();

    setMicrophonePermission(permissionResult.status);

    if (permissionResult.status !== "granted") {
      setIsListening(false);
      setErrorMessage(permissionResult.message);
      return;
    }

    try {
      recognitionSessionRef.current = startSpeechRecognitionSession({
        onEnd: () => {
          recognitionSessionRef.current = null;
          setIsListening(false);
        },
        onError: (message) => {
          setErrorMessage(message);
          setIsListening(false);
        },
        onResult: (alternatives) => {
          const candidate = getSpokenNumberCandidate(alternatives, fact.product);
          const responseMs = Math.max(
            600,
            Date.now() - (factStartTimesRef.current[fact.id] ?? Date.now())
          );

          if (!candidate) {
            setSpokenTranscript(alternatives[0]?.transcript ?? null);
            setRecognizedValue(null);
            setErrorMessage("Ich konnte darin noch keine Zahl sicher erkennen.");
            return;
          }

          const feedback = recordPracticeAnswer(
            fact,
            candidate.value,
            responseMs,
            "learn"
          );

          setCurrentFeedback(feedback);
          setResults((currentResults) => [...currentResults, feedback]);
          setRecognizedValue(candidate.value);
          setSpokenTranscript(candidate.transcript);
          setErrorMessage(null);
        },
      });
    } catch (error) {
      setIsListening(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Spracherkennung konnte nicht gestartet werden."
      );
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        gap: 16,
        padding: isCompactLayout ? 16 : 20,
        paddingBottom: 28,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {!supported ? (
        <SurfaceCard tone="warning">
          <Text style={{ color: palette.ink, fontSize: 24, fontWeight: "900" }}>
            Dieser Browser kann gerade nicht zuhoren
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            Fur den Sprechmodus braucht der Browser eine eingebaute
            Spracherkennung mit Mikrofonzugriff.
          </Text>
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
        </SurfaceCard>
      ) : microphonePermission === "insecure" ? (
        <SurfaceCard tone="warning">
          <Text style={{ color: palette.ink, fontSize: 24, fontWeight: "900" }}>
            Mikrofon im Browser hier noch blockiert
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            Uber diese LAN-Adresse lauft die Seite ohne HTTPS. Der Browser darf
            deshalb kein Mikrofon freigeben, auch wenn wir einen Knopf anzeigen.
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            Fur den Sprechmodus brauchst du entweder `https://...` oder einen
            nativen Build.
          </Text>
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
        </SurfaceCard>
      ) : !isRoundComplete && currentFact ? (
        <SurfaceCard>
          <Text style={{ color: palette.ink, fontSize: 22, fontWeight: "900" }}>
            Reihenfolge
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            Tippe bei der aktuellen Aufgabe auf das Mikrofon und sprich nur das
            Ergebnis ein.
          </Text>

          {errorMessage ? (
            <SurfaceCard tone="warning">
              <Text style={{ color: palette.ink, fontSize: 18, fontWeight: "900" }}>
                Das hat noch nicht geklappt
              </Text>
              <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
                {errorMessage}
              </Text>
              {spokenTranscript ? (
                <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>
                  Gehoret: {spokenTranscript}
                </Text>
              ) : null}
              {!isListening ? (
                <ActionButton
                  label="Nochmal versuchen"
                  onPress={retryCurrent}
                  variant="secondary"
                />
              ) : null}
            </SurfaceCard>
          ) : null}

          <View style={{ gap: 10 }}>
            {facts.map((fact, index) => {
              const result = results.find((item) => item.fact.id === fact.id);
              const isActive = currentFact.id === fact.id;
              const isDone = index < currentIndex || Boolean(result);

              return (
                <View
                  key={fact.id}
                  style={{
                    gap: 12,
                    borderRadius: 22,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: isActive ? focusTheme.accent : palette.line,
                    backgroundColor: isActive ? focusTheme.surface : palette.surface,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text
                        style={{
                          color: palette.ink,
                          fontSize: isActive ? 28 : 22,
                          fontWeight: "900",
                        }}
                      >
                        {formatFactExpression(fact)}
                      </Text>
                      <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>
                        {result
                          ? result.correct
                            ? "Richtig eingesprochen"
                            : `Verstanden: ${result.selectedAnswer}`
                          : isActive
                            ? isListening
                              ? "Ich hore zu..."
                              : "Jetzt dran"
                            : isDone
                              ? "Schon bearbeitet"
                              : "Noch offen"}
                      </Text>
                    </View>

                    {isActive && !currentFeedback ? (
                      <MicrophoneButton
                        active={isListening}
                        disabled={isListening}
                        onPress={startListening}
                      />
                    ) : (
                      <TaskBadge
                        active={isActive}
                        correct={result?.correct ?? null}
                        value={result?.selectedAnswer ?? null}
                      />
                    )}
                  </View>

                  {isActive && currentFeedback ? (
                    <ResultBanner
                      correct={currentFeedback.correct}
                      expectedValue={currentFact.product}
                      recognizedValue={recognizedValue}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </SurfaceCard>
      ) : (
        <SurfaceCard tone="success">
          <Text style={{ color: palette.ink, fontSize: 24, fontWeight: "900" }}>
            Sprechrunde geschafft
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            Die Runde ist fertig und wurde fur deinen Lernstand gespeichert.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <StatCard label="Richtig" value={`${correctCount}/${facts.length}`} />
            <StatCard
              label="Trefferquote"
              value={`${facts.length === 0 ? 0 : Math.round((correctCount / facts.length) * 100)}%`}
            />
          </View>
          <ActionButton
            label="Nochmal im Sprechmodus"
            onPress={() => {
              setCurrentIndex(0);
              setCurrentFeedback(null);
              setErrorMessage(null);
              setIsListening(false);
              setRecognizedValue(null);
              setResults([]);
              setSpokenTranscript(null);
              setSummarySaved(false);
              factStartTimesRef.current = {};
            }}
          />
        </SurfaceCard>
      )}
    </ScrollView>
  );
}

function ResultBanner({
  correct,
  expectedValue,
  recognizedValue,
}: {
  correct: boolean;
  expectedValue: number;
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
          ? `${recognizedValue} stimmt. Die nachste Aufgabe kommt sofort.`
          : `${recognizedValue} war nicht richtig. Richtig ist ${expectedValue}.`}
      </Text>
    </View>
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

function MicrophoneButton({
  active,
  disabled,
  onPress,
}: {
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityHint="Startet die Sprachaufnahme fur diese Aufgabe."
      accessibilityLabel="Mikrofon"
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 76,
        height: 76,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 24,
        borderCurve: "continuous",
        backgroundColor: active ? focusRingColor : palette.accentSoft,
        borderWidth: 1,
        borderColor: active ? palette.accent : "rgba(17, 32, 49, 0.08)",
        boxShadow: active
          ? "0 12px 24px rgba(71, 120, 246, 0.22)"
          : "0 10px 22px rgba(17, 32, 49, 0.08)",
        opacity: disabled ? 0.72 : 1,
      }}
    >
      <MicrophoneGlyph active={active} />
    </Pressable>
  );
}

const focusRingColor = "rgba(71, 120, 246, 0.16)";

function MicrophoneGlyph({ active }: { active: boolean }) {
  const glyphColor = active ? palette.accent : palette.ink;

  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: 4 }}>
      <View
        style={{
          width: 22,
          height: 30,
          alignItems: "center",
          justifyContent: "flex-end",
          borderRadius: 12,
          borderCurve: "continuous",
          borderWidth: 3,
          borderColor: glyphColor,
          paddingBottom: 4,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: glyphColor,
          }}
        />
      </View>
      <View
        style={{
          width: 4,
          height: 12,
          borderRadius: 999,
          backgroundColor: glyphColor,
        }}
      />
      <View
        style={{
          width: 22,
          height: 4,
          borderRadius: 999,
          backgroundColor: glyphColor,
          marginTop: -2,
        }}
      />
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
      <Text style={{ color: textColor, fontSize: 18, fontWeight: "900" }}>
        {value ?? (active ? "..." : "—")}
      </Text>
    </View>
  );
}
