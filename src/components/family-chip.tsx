import { Pressable, Text } from "react-native";

import { palette } from "@/theme/palette";

type FamilyChipProps = {
  active: boolean;
  label: string;
  onPress: () => void;
};

export function FamilyChip({ active, label, onPress }: FamilyChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 999,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: active ? palette.accent : palette.line,
        backgroundColor: active
          ? palette.accentSoft
          : pressed
            ? palette.surfaceAlt
            : palette.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
      })}
    >
      <Text
        style={{
          color: active ? palette.accentStrong : palette.ink,
          fontSize: 15,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
