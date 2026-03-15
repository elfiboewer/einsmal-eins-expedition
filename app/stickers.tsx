import { ScrollView, Text, View } from "react-native";

import { SurfaceCard } from "@/components/surface-card";
import { useLearning } from "@/features/learning/provider";
import { palette } from "@/theme/palette";

const STICKER_COLLECTION = [
  { id: "komet", title: "Komet", tint: "#d7fbef" },
  { id: "krone", title: "Krone", tint: "#fff1c7" },
  { id: "insel", title: "Insel", tint: "#dfeaff" },
  { id: "rakete", title: "Rakete", tint: "#ffe0dc" },
  { id: "stern", title: "Stern", tint: "#f0facf" },
  { id: "turm", title: "Turm", tint: "#ffdff0" },
];

export default function StickersScreen() {
  const { stickerCount } = useLearning();

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
          {stickerCount} Sticker gesammelt
        </Text>
        <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
          Hier landen die Belohnungen fur gespielte Reihen. Mit mehr Training
          wird das Album voller.
        </Text>
      </SurfaceCard>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {STICKER_COLLECTION.map((sticker, index) => {
          const unlocked = index < stickerCount;

          return (
            <View
              key={sticker.id}
              style={{
                width: "48.5%",
                minHeight: 156,
                justifyContent: "space-between",
                borderRadius: 28,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: palette.line,
                backgroundColor: unlocked ? sticker.tint : palette.surfaceAlt,
                boxShadow: "0 12px 28px rgba(17, 32, 49, 0.08)",
                padding: 16,
              }}
            >
              <View
                style={{
                  height: 54,
                  width: 54,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 18,
                  backgroundColor: unlocked ? palette.surface : "#f1e6d5",
                }}
              >
                <Text
                  style={{
                    color: unlocked ? palette.ink : palette.muted,
                    fontSize: 20,
                    fontWeight: "900",
                  }}
                >
                  {index + 1}
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
                    color: palette.muted,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {unlocked ? "Freigeschaltet" : "Noch gesperrt"}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
