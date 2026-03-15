import { Pressable, Text } from "react-native";

import { palette } from "@/theme/palette";

type ActionButtonProps = {
  backgroundColor?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  textColor?: string;
  variant?: "ghost" | "primary" | "secondary";
};

export function ActionButton({
  backgroundColor,
  disabled = false,
  label,
  onPress,
  textColor,
  variant = "primary",
}: ActionButtonProps) {
  const resolvedBackground =
    backgroundColor ??
    (variant === "primary"
      ? palette.accent
      : variant === "secondary"
        ? palette.surfaceAlt
        : "transparent");
  const resolvedTextColor =
    textColor ?? (variant === "primary" ? palette.surface : palette.ink);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        borderRadius: 22,
        borderCurve: "continuous",
        borderWidth: variant === "ghost" ? 1 : 0,
        borderColor: palette.line,
        backgroundColor: disabled
          ? palette.line
          : pressed
            ? palette.accentPressed
            : resolvedBackground,
        boxShadow: "0 8px 20px rgba(17, 32, 49, 0.08)",
        opacity: disabled ? 0.75 : 1,
        paddingHorizontal: 18,
        paddingVertical: 16,
      })}
    >
      <Text
        style={{
          color: resolvedTextColor,
          fontSize: 16,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
