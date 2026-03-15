import * as React from "react";
import { Animated, Easing, View } from "react-native";

const CONFETTI_PIECES = [
  { color: "#fbbf24", delay: 0, drift: -18, height: 12, left: "5%", rotate: "210deg", width: 10 },
  { color: "#34d399", delay: 60, drift: 26, height: 14, left: "14%", rotate: "260deg", width: 12 },
  { color: "#60a5fa", delay: 120, drift: -22, height: 10, left: "22%", rotate: "220deg", width: 10 },
  { color: "#f472b6", delay: 40, drift: 20, height: 12, left: "30%", rotate: "280deg", width: 8 },
  { color: "#fb923c", delay: 160, drift: -16, height: 16, left: "38%", rotate: "240deg", width: 10 },
  { color: "#fde047", delay: 80, drift: 14, height: 10, left: "46%", rotate: "300deg", width: 14 },
  { color: "#22c55e", delay: 200, drift: -28, height: 12, left: "55%", rotate: "250deg", width: 8 },
  { color: "#38bdf8", delay: 110, drift: 18, height: 14, left: "63%", rotate: "270deg", width: 10 },
  { color: "#f97316", delay: 150, drift: -20, height: 10, left: "71%", rotate: "240deg", width: 12 },
  { color: "#a78bfa", delay: 30, drift: 22, height: 12, left: "79%", rotate: "290deg", width: 10 },
  { color: "#facc15", delay: 170, drift: -14, height: 16, left: "87%", rotate: "260deg", width: 8 },
  { color: "#4ade80", delay: 90, drift: 12, height: 10, left: "93%", rotate: "210deg", width: 12 },
] as const;

export function ConfettiRain({ trigger }: { trigger: number }) {
  const progressValues = React.useRef(
    CONFETTI_PIECES.map(() => new Animated.Value(0))
  ).current;

  React.useEffect(() => {
    if (trigger === 0) {
      return;
    }

    progressValues.forEach((value) => value.setValue(0));

    Animated.parallel(
      progressValues.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          delay: CONFETTI_PIECES[index].delay,
          duration: 1050,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [progressValues, trigger]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: "hidden",
      }}
    >
      {CONFETTI_PIECES.map((piece, index) => {
        const translateY = progressValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [-32, 250],
        });
        const translateX = progressValues[index].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, piece.drift, piece.drift / 2],
        });
        const rotate = progressValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", piece.rotate],
        });
        const opacity = progressValues[index].interpolate({
          inputRange: [0, 0.08, 0.82, 1],
          outputRange: [0, 1, 1, 0],
        });

        return (
          <Animated.View
            key={`${piece.left}-${index}`}
            style={{
              position: "absolute",
              top: -18,
              left: piece.left,
              height: piece.height,
              width: piece.width,
              borderRadius: 999,
              backgroundColor: piece.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
