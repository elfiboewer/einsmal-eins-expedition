import * as React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Animated,
  Easing,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { ActionButton } from "@/components/action-button";
import { AnswerChoiceCard } from "@/components/answer-choice-card";
import { ConfettiRain } from "@/components/confetti-rain";
import { RowLaunchCard } from "@/components/row-launch-card";
import { ProgressBar } from "@/components/progress-bar";
import { SurfaceCard } from "@/components/surface-card";
import {
  CLASSIC_FAMILIES,
  getFocusTheme,
  type FamilyFocus,
  formatFamilyLabel,
} from "@/features/learning/facts";
import { useLearning } from "@/features/learning/provider";
import { palette } from "@/theme/palette";

export default function TrainingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();
  const { width } = useWindowDimensions();
  const {
    advanceSession,
    answerCurrent,
    getFocusProgress,
    overallProgress,
    resetSession,
    session,
    startSession,
  } = useLearning();
  const requestedFocus = normalizeFocus(params.focus);
  const lastAutoStartedFocusRef = React.useRef<FamilyFocus | null>(null);
  const shakeValue = React.useRef(new Animated.Value(0)).current;
  const [confettiTrigger, setConfettiTrigger] = React.useState(0);
  const isCompact = width < 420;
  const answerWidth = isCompact ? "100%" : "48.5%";
  const tileWidth = width < 540 ? "48%" : width < 900 ? "31.8%" : "23.5%";

  React.useEffect(() => {
    if (requestedFocus && lastAutoStartedFocusRef.current !== requestedFocus) {
      lastAutoStartedFocusRef.current = requestedFocus;
      startSession(requestedFocus);
    }
    if (!requestedFocus) {
      lastAutoStartedFocusRef.current = null;
    }
  }, [requestedFocus, startSession]);

  React.useEffect(() => {
    if (!session || session.status !== "active" || !session.feedback) {
      return;
    }

    if (session.feedback.correct) {
      setConfettiTrigger((currentValue) => currentValue + 1);
      return;
    }

    shakeValue.setValue(0);
    Animated.timing(shakeValue, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      shakeValue.setValue(0);
    });
  }, [session, shakeValue]);

  if (!session && requestedFocus) {
    return (
      <ScrollView
        contentContainerStyle={{
          gap: 18,
          padding: 20,
          paddingBottom: 28,
        }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <SurfaceCard tone="accent">
          <Text style={{ color: palette.accentStrong, fontSize: 14, fontWeight: "800" }}>
            Trainingsrunde
          </Text>
          <Text style={{ color: palette.ink, fontSize: 28, fontWeight: "900" }}>
            Deine Reihe startet...
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            Wir laden die {formatFamilyLabel(requestedFocus)}.
          </Text>
        </SurfaceCard>
      </ScrollView>
    );
  }

  if (!session) {
    return (
      <ScrollView
        contentContainerStyle={{
          gap: 18,
          padding: 20,
          paddingBottom: 28,
        }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <SurfaceCard tone="accent">
          <Text style={{ color: palette.accentStrong, fontSize: 14, fontWeight: "800" }}>
            Trainingsrunde
          </Text>
          <Text style={{ color: palette.ink, fontSize: 28, fontWeight: "900" }}>
            Welche Reihe willst du rechnen?
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            Such dir einfach eine Reihe aus. Normale Reihen gehen klassisch von
            `x1` bis `x10`. Die gemischte Runde zieht Aufgaben aus allem.
          </Text>
        </SurfaceCard>

        <SurfaceCard>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {[...CLASSIC_FAMILIES, "mixed" as const].map((focus) => (
              <RowLaunchCard
                key={focus}
                focus={focus}
                progress={focus === "mixed" ? overallProgress : getFocusProgress(focus)}
                width={tileWidth}
                onPress={() => startSession(focus)}
              />
            ))}
          </View>
        </SurfaceCard>
      </ScrollView>
    );
  }

  if (session.status === "complete") {
    const accuracy = Math.round((session.correctCount / session.length) * 100);
    const nextFamily = getNextFamily(session.focus);

    return (
      <ScrollView
        contentContainerStyle={{
          gap: 18,
          padding: 20,
          paddingBottom: 28,
        }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <SurfaceCard tone="accent">
          <Text style={{ color: palette.accentStrong, fontSize: 14, fontWeight: "800" }}>
            Runde geschafft
          </Text>
          <Text style={{ color: palette.ink, fontSize: 28, fontWeight: "900" }}>
            {session.starCount} Sterne gesammelt
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            Trefferquote: {accuracy}% in der {formatFamilyLabel(session.focus)}.
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <View
              style={{
                flex: 1,
                minWidth: 130,
                borderRadius: 22,
                borderCurve: "continuous",
                backgroundColor: palette.sunSoft,
                padding: 16,
                gap: 4,
              }}
            >
              <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "700" }}>
                Richtig
              </Text>
              <Text style={{ color: palette.ink, fontSize: 28, fontWeight: "900" }}>
                {session.correctCount}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                minWidth: 130,
                borderRadius: 22,
                borderCurve: "continuous",
                backgroundColor: palette.mintSoft,
                padding: 16,
                gap: 4,
              }}
            >
              <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "700" }}>
                Schnellste Antwort
              </Text>
              <Text style={{ color: palette.ink, fontSize: 28, fontWeight: "900" }}>
                {session.fastestAnswerMs ? `${session.fastestAnswerMs} ms` : "—"}
              </Text>
            </View>
          </View>
          <View style={{ gap: 10 }}>
            <ActionButton
              label="Gleiche Reihe nochmal"
              onPress={() => startSession(session.focus)}
            />
            {nextFamily ? (
              <ActionButton
                label={`Weiter mit ${formatFamilyLabel(nextFamily)}`}
                onPress={() => startSession(nextFamily)}
                variant="secondary"
              />
            ) : null}
            <ActionButton
              label="Zur Startseite"
              onPress={() => {
                resetSession();
                router.replace("/");
              }}
              variant="ghost"
            />
          </View>
        </SurfaceCard>
      </ScrollView>
    );
  }

  const currentNumber = session.currentIndex + 1;
  const focusTheme = getFocusTheme(session.focus);
  const answered = Boolean(session.feedback);
  const questionTranslateX = shakeValue.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [0, -12, 12, -9, 9, 0],
  });
  const panelBackgroundColor = session.feedback
    ? session.feedback.correct
      ? "#eefcf5"
      : "#fff5f6"
    : focusTheme.surface;
  const panelBorderColor = session.feedback
    ? session.feedback.correct
      ? "#6fcea4"
      : "#f1a2b0"
    : `${focusTheme.accent}22`;
  const hintBackgroundColor = session.feedback
    ? session.feedback.correct
      ? "#d7f6e9"
      : "#ffe3e8"
    : palette.surface;
  const hintTextColor = session.feedback
    ? session.feedback.correct
      ? "#0e7a53"
      : "#b33b55"
    : focusTheme.accent;

  return (
    <ScrollView
      contentContainerStyle={{
        gap: 18,
        padding: 20,
        paddingBottom: 28,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Animated.View
        style={{
          transform: [{ translateX: questionTranslateX }],
        }}
      >
        <View
          style={{
          overflow: "hidden",
          position: "relative",
          gap: 16,
          borderRadius: 32,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: panelBorderColor,
          backgroundColor: panelBackgroundColor,
          boxShadow: "0 16px 32px rgba(17, 32, 49, 0.08)",
          padding: 20,
        }}
        >
          <ConfettiRain trigger={confettiTrigger} />

          <Text style={{ color: palette.muted, fontSize: 14, fontWeight: "700" }}>
            {formatFamilyLabel(session.focus)} · Frage {currentNumber} von{" "}
            {session.length}
          </Text>
          <ProgressBar value={session.results.length / session.length} />
          <View
            style={{
              alignSelf: "center",
              borderRadius: 999,
              backgroundColor: hintBackgroundColor,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                color: hintTextColor,
                fontSize: 14,
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              {session.feedback
                ? session.feedback.correct
                  ? "Richtig! Super gemacht."
                  : `Nicht ganz. Die richtige Antwort ist ${session.feedback.fact.product}.`
                : session.focus === "mixed"
                  ? "Jetzt kommt alles durcheinander."
                  : "Wir rechnen diese Reihe Schritt fur Schritt."}
            </Text>
          </View>
          <Text
            style={{
              color: palette.ink,
              fontSize: width < 380 ? 42 : 56,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            {session.question.left} x {session.question.right}
          </Text>
          <Text
            style={{
              color: palette.muted,
              fontSize: 16,
              lineHeight: 24,
              textAlign: "center",
            }}
          >
            {session.feedback
              ? session.feedback.correct
                ? "Die grune Karte zeigt dir die richtige Antwort."
                : "Rot war nicht richtig, grun zeigt die Losung."
              : "Tippe die richtige Antwort an."}
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {session.question.options.map((option) => {
              const isSelected = session.feedback?.selectedAnswer === option;
              const isCorrect = session.question.product === option;
              const state = answered
                ? isCorrect
                  ? "correct"
                  : isSelected
                    ? "wrong"
                    : "neutral"
                : "idle";
              const badgeLabel = answered
                ? isCorrect
                  ? isSelected
                    ? "Richtig"
                    : "Losung"
                  : isSelected
                    ? "Nicht richtig"
                    : undefined
                : undefined;

              return (
                <View key={option} style={{ width: answerWidth }}>
                  <AnswerChoiceCard
                    badgeLabel={badgeLabel}
                    label={`${option}`}
                    onPress={() => answerCurrent(option)}
                    disabled={answered}
                    state={state}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {session.feedback ? (
        <SurfaceCard tone={session.feedback.correct ? "success" : "danger"}>
          <Text style={{ color: palette.ink, fontSize: 22, fontWeight: "900" }}>
            {session.feedback.correct ? "Treffer!" : "Noch mal probieren"}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            {session.feedback.correct
              ? `Stark. ${session.feedback.fact.left} x ${session.feedback.fact.right} = ${session.feedback.fact.product}.`
              : `Rot markiert deine Auswahl. Die grune Karte zeigt ${session.feedback.fact.product} als richtige Antwort.`}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 14, fontWeight: "700" }}>
            Antwortzeit: {session.feedback.responseMs} ms
          </Text>
          <View style={{ gap: 10 }}>
            <ActionButton
              label={
                session.results.length >= session.length
                  ? "Auswertung zeigen"
                  : "Weiter"
              }
              onPress={advanceSession}
            />
            <ActionButton
              label="Zur Startseite"
              onPress={() => {
                resetSession();
                router.replace("/");
              }}
              variant="ghost"
            />
          </View>
        </SurfaceCard>
      ) : null}
    </ScrollView>
  );
}

function normalizeFocus(value?: string): FamilyFocus | null {
  if (value === "mixed") {
    return "mixed";
  }

  const numericValue = Number(value);

  if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 10) {
    return numericValue as Exclude<FamilyFocus, "mixed">;
  }

  return null;
}

function getNextFamily(focus: FamilyFocus): FamilyFocus | null {
  if (focus === "mixed") {
    return null;
  }

  if (focus >= 1 && focus < 10) {
    return (focus + 1) as Exclude<FamilyFocus, "mixed">;
  }

  return "mixed";
}
