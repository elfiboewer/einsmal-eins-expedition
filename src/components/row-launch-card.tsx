import { Pressable, Text, View } from "react-native";

import { ProgressBar } from "@/components/progress-bar";
import {
  formatFamilyLabel,
  getFamilyShortLabel,
  getFocusTheme,
  type FamilyFocus,
} from "@/features/learning/facts";
import { palette } from "@/theme/palette";

type RowLaunchCardProps = {
  compact?: boolean;
  focus: FamilyFocus;
  onPress: () => void;
  progress: number;
  width: number | `${number}%`;
};

export function RowLaunchCard({
  compact = false,
  focus,
  onPress,
  progress,
  width,
}: RowLaunchCardProps) {
  const theme = getFocusTheme(focus);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        minHeight: compact ? 128 : 156,
        justifyContent: "space-between",
        gap: compact ? 12 : 14,
        borderRadius: 28,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: `${theme.accent}22`,
        backgroundColor: theme.surface,
        boxShadow: "0 14px 30px rgba(17, 32, 49, 0.08)",
        opacity: pressed ? 0.92 : 1,
        padding: compact ? 14 : 16,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            minWidth: focus === "mixed" ? 72 : 56,
            alignItems: "center",
            borderRadius: 18,
            borderCurve: "continuous",
            backgroundColor: theme.badge,
            paddingHorizontal: compact ? 12 : 14,
            paddingVertical: compact ? 8 : 10,
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: focus === "mixed" ? (compact ? 16 : 18) : compact ? 22 : 24,
              fontWeight: "900",
            }}
          >
            {getFamilyShortLabel(focus)}
          </Text>
        </View>
        <Text
          style={{
            color: theme.accent,
            fontSize: compact ? 12 : 13,
            fontVariant: ["tabular-nums"],
            fontWeight: "800",
          }}
        >
          {Math.round(progress * 100)}%
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text
          style={{
            color: palette.ink,
            fontSize: compact ? 20 : 22,
            fontWeight: "900",
          }}
        >
          {focus === "mixed" ? "Gemischt" : `${focus}er`}
        </Text>
        <Text
          style={{
            color: palette.muted,
            fontSize: compact ? 13 : 14,
            lineHeight: compact ? 18 : 20,
          }}
        >
          {focus === "mixed"
            ? "Alles bunt durcheinander"
            : `${formatFamilyLabel(focus)} Schritt fur Schritt`}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <ProgressBar value={progress} />
        <Text
          style={{
            color: theme.accent,
            fontSize: compact ? 12 : 13,
            fontWeight: "800",
          }}
        >
          {theme.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
