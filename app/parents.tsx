import { ScrollView, Text, View } from "react-native";

import { SurfaceCard } from "@/components/surface-card";
import {
  CLASSIC_FAMILIES,
  formatFactExpression,
  formatFamilyLabel,
} from "@/features/learning/facts";
import { useLearning } from "@/features/learning/provider";
import { palette } from "@/theme/palette";

export default function ParentsScreen() {
  const {
    getFocusProgress,
    lastCompletedSession,
    lastCompletedSessions,
    masteredFactCount,
    totalFactCount,
    weakFacts,
  } = useLearning();

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
          Elternblick
        </Text>
        <Text style={{ color: palette.ink, fontSize: 28, fontWeight: "900" }}>
          Lernstand auf einen Blick
        </Text>
        <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
          Die App zeigt jetzt alle zehn Reihen plus gemischte Runden. Hier sehen
          Sie Fortschritt und Problemaufgaben kompakt zusammen.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "800" }}>
          Gesamtfortschritt
        </Text>
        <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
          Gemeisterte Fakten: {masteredFactCount} von {totalFactCount}
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "800" }}>
          Reihenstand
        </Text>
        <View style={{ gap: 10 }}>
          {CLASSIC_FAMILIES.map((family) => (
            <View
              key={family}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderRadius: 18,
                borderCurve: "continuous",
                backgroundColor: palette.surfaceAlt,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "800" }}>
                {formatFamilyLabel(family)}
              </Text>
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 14,
                  fontVariant: ["tabular-nums"],
                  fontWeight: "700",
                }}
              >
                {Math.round(getFocusProgress(family) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "800" }}>
          Schwierige Aufgaben
        </Text>
        {weakFacts.length > 0 ? (
          <View style={{ gap: 10 }}>
            {weakFacts.slice(0, 6).map((fact) => (
              <View
                key={fact.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  borderRadius: 18,
                  borderCurve: "continuous",
                  backgroundColor: palette.surfaceAlt,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ color: palette.ink, fontSize: 17, fontWeight: "800" }}>
                  {formatFactExpression(fact)}
                </Text>
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 14,
                    fontVariant: ["tabular-nums"],
                    fontWeight: "700",
                  }}
                >
                  {Math.round(fact.score * 100)}%
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            Sobald ein paar Runden gespielt wurden, erscheinen hier die
            schwächsten Aufgaben.
          </Text>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "800" }}>
          Letzte Session
        </Text>
        {lastCompletedSession ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
              Fokus: {lastCompletedSession.label}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
              Modus: {lastCompletedSession.mode === "learn" ? "Lernmodus" : "Quizmodus"}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
              Treffer: {lastCompletedSession.correctCount}/{lastCompletedSession.length}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
              Sterne: {lastCompletedSession.starCount}
            </Text>
          </View>
        ) : (
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
            Noch keine abgeschlossene Runde gespeichert.
          </Text>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "800" }}>
          Modi im Vergleich
        </Text>
        <View style={{ gap: 10 }}>
          <ModeSummaryCard
            summary={lastCompletedSessions.quiz}
            title="Quizmodus"
          />
          <ModeSummaryCard
            summary={lastCompletedSessions.learn}
            title="Lernmodus"
          />
        </View>
      </SurfaceCard>
    </ScrollView>
  );
}

function ModeSummaryCard({
  summary,
  title,
}: {
  summary: ReturnType<typeof useLearning>["lastCompletedSession"];
  title: string;
}) {
  return (
    <View
      style={{
        gap: 4,
        borderRadius: 18,
        borderCurve: "continuous",
        backgroundColor: palette.surfaceAlt,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "800" }}>
        {title}
      </Text>
      {summary ? (
        <>
          <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>
            {summary.label}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>
            Treffer: {summary.correctCount}/{summary.length}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>
            Sterne: {summary.starCount}
          </Text>
        </>
      ) : (
        <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>
          Noch keine gespeicherte Runde in diesem Modus.
        </Text>
      )}
    </View>
  );
}
