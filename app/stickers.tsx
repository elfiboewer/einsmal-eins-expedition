import { ScrollView, Text, useWindowDimensions, View } from "react-native";

import { SurfaceCard } from "@/components/surface-card";
import {
  CLASSIC_FAMILIES,
  type FamilyFocus,
  getFocusTheme,
} from "@/features/learning/facts";
import { useLearning } from "@/features/learning/provider";
import { palette } from "@/theme/palette";

const STICKER_COLLECTION: Array<{
  focus: FamilyFocus;
  id: string;
  subtitle: string;
  title: string;
}> = [
  { focus: 1, id: "wiesen-1", subtitle: "Startersticker", title: "Wiesenflitzer" },
  { focus: 2, id: "funkel-2", subtitle: "Doppelte Power", title: "Funkel-Fuchs" },
  { focus: 3, id: "wellen-3", subtitle: "Rhythmus im Kopf", title: "Wellen-Wal" },
  { focus: 4, id: "feuer-4", subtitle: "Vier gewinnt", title: "Feuerfalke" },
  { focus: 5, id: "blatt-5", subtitle: "Im Fuenfertakt", title: "Blatt-Biber" },
  { focus: 6, id: "kisten-6", subtitle: "Hafenmeister", title: "Kisten-Kapitain" },
  { focus: 7, id: "himmel-7", subtitle: "Mutige Reihe", title: "Himmels-Hai" },
  { focus: 8, id: "glitzer-8", subtitle: "Achter-Schwung", title: "Glitzer-Gecko" },
  { focus: 9, id: "wald-9", subtitle: "Knifflig und stark", title: "Wald-Wirbler" },
  { focus: 10, id: "raketen-10", subtitle: "Turbo-Zehner", title: "Raketen-Rabe" },
  { focus: "mixed", id: "meister-mix", subtitle: "Alles durcheinander", title: "Mix-Meister" },
];

export default function StickersScreen() {
  const { width } = useWindowDimensions();
  const { getFocusProgress, overallProgress, stickerCount } = useLearning();
  const tileWidth = width < 540 ? "100%" : width < 860 ? "48.5%" : "31.8%";

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
          Stickeralbum
        </Text>
        <Text style={{ color: palette.ink, fontSize: 28, fontWeight: "900" }}>
          {stickerCount} von {STICKER_COLLECTION.length} Stickern gesammelt
        </Text>
        <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
          Fur jede Reihe gibt es jetzt einen eigenen Sticker. Wenn eine Reihe
          sicher sitzt, wird ihr Albumfeld freigeschaltet.
        </Text>
      </SurfaceCard>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {STICKER_COLLECTION.map((sticker) => {
          const theme = getFocusTheme(sticker.focus);
          const unlocked =
            sticker.focus === "mixed"
              ? overallProgress >= 0.92
              : getFocusProgress(sticker.focus) >= 0.85;

          return (
            <View
              key={sticker.id}
              style={{
                overflow: "hidden",
                width: tileWidth,
                minHeight: 176,
                justifyContent: "space-between",
                borderRadius: 28,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: unlocked ? `${theme.accent}22` : palette.line,
                backgroundColor: unlocked ? theme.surface : palette.surfaceAlt,
                boxShadow: "0 12px 28px rgba(17, 32, 49, 0.08)",
                padding: 16,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  top: -18,
                  right: -12,
                  height: 82,
                  width: 82,
                  borderRadius: 999,
                  backgroundColor: unlocked ? `${theme.badge}33` : "#f1e6d5",
                }}
              />
              <View
                style={{
                  height: 54,
                  minWidth: 54,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 18,
                  backgroundColor: unlocked ? theme.badge : "#f1e6d5",
                  paddingHorizontal: 12,
                }}
              >
                <Text
                  style={{
                    color: unlocked ? "#ffffff" : palette.muted,
                    fontSize: sticker.focus === "mixed" ? 16 : 20,
                    fontWeight: "900",
                  }}
                >
                  {sticker.focus === "mixed" ? "Mix" : `${sticker.focus}`}
                </Text>
              </View>

              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    color: palette.ink,
                    fontSize: 20,
                    fontWeight: "900",
                  }}
                >
                  {sticker.title}
                </Text>
                <Text
                  style={{
                    color: unlocked ? theme.accent : palette.muted,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  {sticker.subtitle}
                </Text>
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {unlocked
                    ? "Freigeschaltet"
                    : sticker.focus === "mixed"
                      ? "Wird frei, wenn fast alles sitzt"
                      : "Wird frei ab 85% Fortschritt in dieser Reihe"}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
