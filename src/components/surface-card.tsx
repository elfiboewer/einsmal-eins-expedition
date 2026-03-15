import { type PropsWithChildren } from "react";
import { View } from "react-native";

import { palette } from "@/theme/palette";

type SurfaceCardProps = PropsWithChildren<{
  tone?: "accent" | "danger" | "neutral" | "success" | "warning";
}>;

export function SurfaceCard({
  children,
  tone = "neutral",
}: SurfaceCardProps) {
  const backgroundColor =
    tone === "accent"
      ? palette.surface
      : tone === "success"
        ? palette.mintSoft
        : tone === "danger"
          ? "#fff1f3"
        : tone === "warning"
          ? palette.sunSoft
          : palette.surface;

  return (
    <View
      style={{
        gap: 14,
        borderRadius: 28,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: palette.line,
        backgroundColor,
        boxShadow: "0 12px 32px rgba(17, 32, 49, 0.08)",
        padding: 20,
      }}
    >
      {children}
    </View>
  );
}
