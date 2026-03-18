import { useRouter } from "expo-router";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";

import { RowLaunchCard } from "@/components/row-launch-card";
import {
  CLASSIC_FAMILIES,
  type FamilyFocus,
  formatFamilyLabel,
} from "@/features/learning/facts";
import { stringifyFocusParam } from "@/features/learning/focus";
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
  const isTabletLayout = width >= 768;
  const tileWidth =
    width < 540 ? "48%" : width < 768 ? "31.8%" : width < 1180 ? "23.5%" : "18.8%";
  const menuFocuses: FamilyFocus[] = [...CLASSIC_FAMILIES, "mixed"];
  const nextFocusLabel =
    recommendedFocus === "mixed"
      ? "gemischte Runde"
      : `${formatFamilyLabel(recommendedFocus)}`;

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: isTabletLayout ? "center" : "flex-start",
        padding: isTabletLayout ? 24 : 20,
        paddingBottom: isTabletLayout ? 24 : 36,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View
        style={{
          overflow: "hidden",
          gap: isTabletLayout ? 18 : 16,
          borderRadius: isTabletLayout ? 40 : 36,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: palette.surface,
          boxShadow: "0 18px 38px rgba(17, 32, 49, 0.10)",
          padding: isTabletLayout ? 24 : 20,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -34,
            right: -24,
            height: 156,
            width: 156,
            borderRadius: 999,
            backgroundColor: "#d7fbef",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 118,
            right: width < 500 ? 18 : 148,
            height: 72,
            width: 72,
            borderRadius: 999,
            backgroundColor: "#fff0bf",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -38,
            left: -22,
            height: 124,
            width: 124,
            borderRadius: 999,
            backgroundColor: "#dfeaff",
          }}
        />

        <View
          style={{
            gap: 8,
            paddingRight: isTabletLayout ? 132 : 0,
          }}
        >
          <Text
            style={{
              color: palette.ink,
              fontSize: isTabletLayout ? 34 : 28,
              fontWeight: "900",
              lineHeight: isTabletLayout ? 38 : 32,
            }}
          >
            Alle Reihen auf einen Blick
          </Text>
          <Text
            style={{
              color: palette.muted,
              fontSize: isTabletLayout ? 15 : 14,
              lineHeight: isTabletLayout ? 22 : 20,
            }}
          >
            Tippe auf eine Reihe und starte direkt. Auf dem Tablet bleibt alles
            bewusst kompakt, damit du ohne Scrollen loslegen kannst.
          </Text>
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
              minWidth: 152,
              flex: isTabletLayout ? 0 : 1,
              borderRadius: 22,
              borderCurve: "continuous",
              backgroundColor: "#fff1c7",
              paddingHorizontal: 14,
              paddingVertical: 12,
              gap: 4,
            }}
          >
            <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "700" }}>
              Schon sicher
            </Text>
            <Text
              style={{
                color: palette.ink,
                fontSize: 26,
                fontVariant: ["tabular-nums"],
                fontWeight: "900",
              }}
            >
              {masteredFactCount}/{totalFactCount}
            </Text>
          </View>
          <View
            style={{
              minWidth: 152,
              flex: isTabletLayout ? 0 : 1,
              borderRadius: 22,
              borderCurve: "continuous",
              backgroundColor: "#daf8ee",
              paddingHorizontal: 14,
              paddingVertical: 12,
              gap: 4,
            }}
          >
            <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "700" }}>
              Als Nächstes
            </Text>
            <Text style={{ color: palette.ink, fontSize: 19, fontWeight: "900" }}>
              {nextFocusLabel}
            </Text>
          </View>
        </View>

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
              compact={isTabletLayout}
              focus={focus}
              progress={focus === "mixed" ? overallProgress : getFocusProgress(focus)}
              width={tileWidth}
              onPress={() =>
                router.push({
                  pathname: "/mode-select",
                  params: { focus: stringifyFocusParam(focus) },
                })
              }
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
