import { View } from "react-native";

import { palette } from "@/theme/palette";

type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, value * 100));

  return (
    <View
      style={{
        overflow: "hidden",
        borderRadius: 999,
        borderCurve: "continuous",
        backgroundColor: palette.surfaceAlt,
        height: 14,
      }}
    >
      <View
        style={{
          width: `${percentage}%`,
          minWidth: percentage > 0 ? 8 : 0,
          height: "100%",
          borderRadius: 999,
          backgroundColor: palette.accent,
        }}
      />
    </View>
  );
}
