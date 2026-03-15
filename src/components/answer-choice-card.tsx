import { Pressable, Text, View } from "react-native";

import { palette } from "@/theme/palette";

type AnswerChoiceCardProps = {
  badgeLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  state?: "correct" | "idle" | "neutral" | "wrong";
};

export function AnswerChoiceCard({
  badgeLabel,
  disabled = false,
  label,
  onPress,
  state = "idle",
}: AnswerChoiceCardProps) {
  const borderColor =
    state === "correct"
      ? "#64c99a"
      : state === "wrong"
        ? "#f099a8"
        : palette.line;
  const backgroundColor =
    state === "correct"
      ? palette.mintSoft
      : state === "wrong"
        ? "#fff1f3"
        : state === "neutral"
          ? "#f5ecdf"
          : palette.surface;
  const textColor =
    state === "neutral"
      ? palette.muted
      : state === "wrong"
        ? "#b33b55"
        : palette.ink;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 108,
        justifyContent: "space-between",
        gap: 10,
        borderRadius: 24,
        borderCurve: "continuous",
        borderWidth: 2,
        borderColor,
        backgroundColor:
          disabled || state !== "idle"
            ? backgroundColor
            : pressed
              ? palette.accentSoft
              : backgroundColor,
        boxShadow: "0 12px 24px rgba(17, 32, 49, 0.08)",
        opacity: state === "neutral" ? 0.78 : 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
      })}
    >
      <View style={{ minHeight: 28 }}>
        {badgeLabel ? (
          <View
            style={{
              alignSelf: "flex-start",
              borderRadius: 999,
              backgroundColor:
                state === "correct"
                  ? "#c5f2de"
                  : state === "wrong"
                    ? "#ffd8e0"
                    : palette.surfaceAlt,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                color:
                  state === "correct"
                    ? "#0e7a53"
                    : state === "wrong"
                      ? "#b33b55"
                      : palette.muted,
                fontSize: 12,
                fontWeight: "900",
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={{
          color: textColor,
          fontSize: 34,
          fontVariant: ["tabular-nums"],
          fontWeight: "900",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
