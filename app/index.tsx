import { useRouter } from "expo-router";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";

import { ActionButton } from "@/components/action-button";
import { ProgressBar } from "@/components/progress-bar";
import { RowLaunchCard } from "@/components/row-launch-card";
import { SurfaceCard } from "@/components/surface-card";
import {
  CLASSIC_FAMILIES,
  type FamilyFocus,
  formatFamilyLabel,
} from "@/features/learning/facts";
import { useLearning } from "@/features/learning/provider";
import { palette } from "@/theme/palette";

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    getFocusProgress,
    masteredFactCount,
    overallProgress,
    recommendedFocus,
    totalFactCount,
  } = useLearning();
  const tileWidth = width < 540 ? "48%" : width < 900 ? "31.8%" : "23.5%";
  const menuFocuses: FamilyFocus[] = [...CLASSIC_FAMILIES, "mixed"];
  const nextFocusLabel =
    recommendedFocus === "mixed"
      ? "gemischte Runde"
      : `${formatFamilyLabel(recommendedFocus)}`;

  return (
    <ScrollView
      contentContainerStyle={{
        gap: 20,
        padding: 20,
        paddingBottom: 36,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View
        style={{
          overflow: "hidden",
          gap: 16,
          borderRadius: 36,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: palette.surface,
          boxShadow: "0 18px 38px rgba(17, 32, 49, 0.10)",
          padding: 20,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -24,
            right: -12,
            height: 120,
            width: 120,
            borderRadius: 999,
            backgroundColor: "#d7fbef",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -26,
            left: -18,
            height: 96,
            width: 96,
            borderRadius: 999,
            backgroundColor: "#fff0bf",
          }}
        />
        <Text
          style={{
            color: palette.accentStrong,
            fontSize: 14,
            fontWeight: "800",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Mathe-Abenteuer
        </Text>
        <Text
          style={{
            color: palette.ink,
            fontSize: width < 400 ? 34 : 40,
            fontWeight: "900",
            lineHeight: width < 400 ? 38 : 44,
          }}
        >
          Wähle einfach
          {"\n"}
          deine Reihe
        </Text>
        <Text
          style={{
            color: palette.muted,
            fontSize: 16,
            lineHeight: 24,
          }}
        >
          Hier siehst du alle Reihen von 1 bis 10. Tippe auf eine Zahl und
          rechne sie der Reihe nach. Danach kannst du alles gemischt üben.
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
              minWidth: 132,
              flex: 1,
              borderRadius: 22,
              borderCurve: "continuous",
              backgroundColor: "#fff1c7",
              padding: 14,
              gap: 4,
            }}
          >
            <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "700" }}>
              Schon sicher
            </Text>
            <Text style={{ color: palette.ink, fontSize: 28, fontWeight: "900" }}>
              {masteredFactCount}/{totalFactCount}
            </Text>
          </View>
          <View
            style={{
              minWidth: 132,
              flex: 1,
              borderRadius: 22,
              borderCurve: "continuous",
              backgroundColor: "#daf8ee",
              padding: 14,
              gap: 4,
            }}
          >
            <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "700" }}>
              Als Nächstes
            </Text>
            <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "900" }}>
              {nextFocusLabel}
            </Text>
          </View>
        </View>

        <ProgressBar value={overallProgress} />

        <ActionButton
          label={`Jetzt ${nextFocusLabel} starten`}
          onPress={() =>
            router.push({
              pathname: "/training",
              params: { focus: `${recommendedFocus}` },
            })
          }
        />
      </View>

      <SurfaceCard>
        <Text
          style={{
            color: palette.ink,
            fontSize: 24,
            fontWeight: "900",
          }}
        >
          Alle Reihen auf einen Blick
        </Text>
        <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
          Jede normale Reihe lauft klassisch von `x1` bis `x10`. Die gemischte
          Runde zieht Aufgaben aus allen Reihen.
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {menuFocuses.map((focus) => (
            <RowLaunchCard
              key={focus}
              focus={focus}
              progress={focus === "mixed" ? overallProgress : getFocusProgress(focus)}
              width={tileWidth}
              onPress={() =>
                router.push({
                  pathname: "/training",
                  params: { focus: `${focus}` },
                })
              }
            />
          ))}
        </View>
      </SurfaceCard>

    </ScrollView>
  );
}
