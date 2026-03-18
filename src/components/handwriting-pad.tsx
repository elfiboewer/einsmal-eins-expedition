import * as React from "react";
import {
  PanResponder,
  type GestureResponderEvent,
  Text,
  View,
} from "react-native";

import {
  type HandwritingPoint,
  type HandwritingStroke,
} from "@/features/learning/handwriting";
import { palette } from "@/theme/palette";

type HandwritingPadProps = {
  accentColor: string;
  disabled?: boolean;
  minHeight?: number;
  onChange: (strokes: HandwritingStroke[]) => void;
  onInteractionChange?: (isInteracting: boolean) => void;
  onStrokeEnd?: (strokes: HandwritingStroke[]) => void;
  placeholder?: string;
  strokes: HandwritingStroke[];
};

export function HandwritingPad({
  accentColor,
  disabled = false,
  minHeight = 220,
  onChange,
  onInteractionChange,
  onStrokeEnd,
  placeholder = "Male deine Antwort hier hinein",
  strokes,
}: HandwritingPadProps) {
  const strokesRef = React.useRef(strokes);
  const webTouchStyle =
    process.env.EXPO_OS === "web" ? ({ touchAction: "none" } as object) : null;

  React.useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          if (disabled) {
            return;
          }

          onInteractionChange?.(true);
          const point = getLocalPoint(event);
          onChange([...strokesRef.current, [point]]);
        },
        onPanResponderMove: (event) => {
          if (disabled) {
            return;
          }

          const point = getLocalPoint(event);
          const nextStrokes = [...strokesRef.current];
          const lastStroke = nextStrokes.at(-1);

          if (!lastStroke) {
            onChange([[point]]);
            return;
          }

          lastStroke.push(point);
          onChange(nextStrokes);
        },
        onPanResponderRelease: () => {
          if (disabled) {
            return;
          }

          onInteractionChange?.(false);
          onStrokeEnd?.(strokesRef.current);
        },
        onPanResponderTerminate: () => {
          if (disabled) {
            return;
          }

          onInteractionChange?.(false);
          onStrokeEnd?.(strokesRef.current);
        },
        onStartShouldSetPanResponderCapture: () => !disabled,
        onStartShouldSetPanResponder: () => !disabled,
      }),
    [disabled, onChange, onInteractionChange, onStrokeEnd]
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        {
          overflow: "hidden",
          minHeight,
          borderRadius: 30,
          borderCurve: "continuous",
          borderWidth: 2,
          borderColor: disabled ? palette.line : `${accentColor}55`,
          backgroundColor: "#fffefb",
        },
        webTouchStyle,
      ]}
    >
      <GuideLine top={56} />
      <GuideLine top={110} />
      <GuideLine top={164} />

      {strokes.length === 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              color: palette.muted,
              fontSize: minHeight <= 170 ? 16 : 18,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {placeholder}
          </Text>
        </View>
      ) : null}

      {strokes.map((stroke, strokeIndex) => (
        <React.Fragment key={`stroke-${strokeIndex}`}>
          {stroke.slice(1).map((point, pointIndex) => (
            <Segment
              key={`segment-${strokeIndex}-${pointIndex}`}
              accentColor={accentColor}
              from={stroke[pointIndex]}
              to={point}
            />
          ))}
        </React.Fragment>
      ))}
    </View>
  );
}

function GuideLine({ top }: { top: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        right: 18,
        left: 18,
        borderTopWidth: 2,
        borderColor: "#f1e7d8",
      }}
    />
  );
}

function Segment({
  accentColor,
  from,
  to,
}: {
  accentColor: string;
  from: HandwritingPoint;
  to: HandwritingPoint;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const angle = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: from.x,
        top: from.y - 5,
        width: length,
        height: 10,
        borderRadius: 999,
        backgroundColor: accentColor,
        transform: [{ rotate: angle }],
      }}
    />
  );
}

function getLocalPoint(event: GestureResponderEvent) {
  return {
    t: Date.now(),
    x: event.nativeEvent.locationX,
    y: event.nativeEvent.locationY,
  };
}
