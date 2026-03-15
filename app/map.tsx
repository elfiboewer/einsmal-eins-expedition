import { useRouter } from "expo-router";
import { ScrollView, Text } from "react-native";

import { ActionButton } from "@/components/action-button";
import { ProgressBar } from "@/components/progress-bar";
import { SurfaceCard } from "@/components/surface-card";
import { ISLANDS, formatFamilyLabel } from "@/features/learning/facts";
import { useLearning } from "@/features/learning/provider";
import { palette } from "@/theme/palette";

export default function MapScreen() {
  const router = useRouter();
  const { getFocusProgress } = useLearning();

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
          Inselkarte
        </Text>
        <Text style={{ color: palette.ink, fontSize: 28, fontWeight: "900" }}>
          Drei Inseln für den ersten Spiel-Slice
        </Text>
        <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
          Jede Insel bündelt ein paar Reihen. Später können wir daraus richtige
          Missionen mit Gegnern, Brücken und Sammelwesen machen.
        </Text>
      </SurfaceCard>

      {ISLANDS.map((island) => {
        const progress = getFocusProgress(island.focus);

        return (
          <SurfaceCard key={island.id}>
            <Text style={{ color: island.tint, fontSize: 14, fontWeight: "800" }}>
              {island.tagline}
            </Text>
            <Text style={{ color: palette.ink, fontSize: 22, fontWeight: "900" }}>
              {island.title}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
              {island.description}
            </Text>
            <Text style={{ color: palette.ink, fontSize: 15, fontWeight: "700" }}>
              Fokus:{" "}
              {island.focus === "mixed"
                ? "Gemischte Runde"
                : formatFamilyLabel(island.focus)}
            </Text>
            <ProgressBar value={progress} />
            <ActionButton
              label="Diese Insel trainieren"
              onPress={() =>
                router.push({
                  pathname: "/training",
                  params: { focus: `${island.focus}` },
                })
              }
              variant="secondary"
            />
          </SurfaceCard>
        );
      })}
    </ScrollView>
  );
}
