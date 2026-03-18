import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { ActionButton } from "@/components/action-button";
import { SurfaceCard } from "@/components/surface-card";
import { formatFamilyLabel, getFocusTheme } from "@/features/learning/facts";
import {
  normalizeFocusParam,
  stringifyFocusParam,
} from "@/features/learning/focus";
import { palette } from "@/theme/palette";

export default function ModeSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();
  const { width } = useWindowDimensions();
  const focus = normalizeFocusParam(params.focus);

  if (!focus) {
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
            Modusauswahl
          </Text>
          <Text style={{ color: palette.ink, fontSize: 28, fontWeight: "900" }}>
            Bitte zuerst eine Reihe auswahlen
          </Text>
          <ActionButton
            label="Zur Startseite"
            onPress={() => router.replace("/")}
          />
        </SurfaceCard>
      </ScrollView>
    );
  }

  const focusTheme = getFocusTheme(focus);
  const isTabletLayout = width >= 768;

  return (
    <ScrollView
      contentContainerStyle={{
        gap: 18,
        padding: isTabletLayout ? 24 : 20,
        paddingBottom: 28,
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
          boxShadow: "0 16px 34px rgba(17, 32, 49, 0.10)",
          padding: isTabletLayout ? 24 : 20,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -22,
            right: -18,
            height: 126,
            width: 126,
            borderRadius: 999,
            backgroundColor: focusTheme.surface,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -28,
            left: -16,
            height: 96,
            width: 96,
            borderRadius: 999,
            backgroundColor: "#fff0bf",
          }}
        />
        <Text style={{ color: focusTheme.accent, fontSize: 14, fontWeight: "800" }}>
          {formatFamilyLabel(focus)}
        </Text>
        <Text style={{ color: palette.ink, fontSize: 32, fontWeight: "900" }}>
          Welchen Modus willst du spielen?
        </Text>
        <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
          Im Quizmodus tippst du Antworten schnell an. Im Lernmodus schreibst du
          sie auf. Im Sprechmodus sagst du das Ergebnis laut.
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <ModeCard
            accentColor={focusTheme.accent}
            badgeColor={focusTheme.badge}
            label="Quizmodus"
            description="Schnell antworten und direkt losrechnen."
            onPress={() =>
              router.push({
                pathname: "/training",
                params: { focus: stringifyFocusParam(focus) },
              })
            }
            width={isTabletLayout ? "31.8%" : "100%"}
          />
          <ModeCard
            accentColor="#c66b16"
            badgeColor="#fbbf24"
            disabled={focus === "mixed"}
            label="Lernmodus"
            description={
              focus === "mixed"
                ? "Nur fur einzelne Reihen verfugbar."
                : "Mit extra Platz zum Schreiben und Erkennen."
            }
            onPress={() =>
              router.push({
                pathname: "/learning-mode",
                params: { focus: stringifyFocusParam(focus) },
              })
            }
            width={isTabletLayout ? "31.8%" : "100%"}
          />
          <ModeCard
            accentColor="#0f62a4"
            badgeColor="#38bdf8"
            label="Sprechmodus"
            description="Ergebnis laut sagen und direkt prufen lassen."
            onPress={() =>
              router.push({
                pathname: "/speaking-mode",
                params: { focus: stringifyFocusParam(focus) },
              })
            }
            width={isTabletLayout ? "31.8%" : "100%"}
          />
        </View>

        <ActionButton
          label="Zuruck zur Startseite"
          onPress={() => router.replace("/")}
          variant="ghost"
        />
      </View>
    </ScrollView>
  );
}

function ModeCard({
  accentColor,
  badgeColor,
  description,
  disabled = false,
  label,
  onPress,
  width,
}: {
  accentColor: string;
  badgeColor: string;
  description: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  width: `${number}%` | number;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        minHeight: 188,
        justifyContent: "space-between",
        gap: 14,
        borderRadius: 28,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: disabled ? palette.line : `${accentColor}22`,
        backgroundColor: disabled ? palette.surfaceAlt : palette.surface,
        boxShadow: "0 12px 28px rgba(17, 32, 49, 0.08)",
        opacity: disabled ? 0.72 : pressed ? 0.94 : 1,
        padding: 18,
      })}
    >
      <View
        style={{
          width: 56,
          alignItems: "center",
          borderRadius: 18,
          borderCurve: "continuous",
          backgroundColor: badgeColor,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "900" }}>
          {label === "Quizmodus" ? "Q" : label === "Lernmodus" ? "L" : "S"}
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text
          style={{
            color: palette.ink,
            fontSize: 26,
            fontWeight: "900",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: palette.muted,
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          {description}
        </Text>
      </View>

      <Text
        style={{
          color: disabled ? palette.muted : accentColor,
          fontSize: 13,
          fontWeight: "800",
        }}
      >
        {disabled ? "Zur Zeit nicht verfugbar" : "Jetzt auswahlen"}
      </Text>
    </Pressable>
  );
}
