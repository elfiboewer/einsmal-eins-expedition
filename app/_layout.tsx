import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { HeaderMenu } from "@/components/header-menu";
import { LearningProvider, useLearning } from "@/features/learning/provider";
import { palette } from "@/theme/palette";

function AppStack() {
  const { isHydrated } = useLearning();

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          backgroundColor: palette.canvas,
          padding: 24,
        }}
      >
        <ActivityIndicator color={palette.accent} size="large" />
        <Text style={{ color: palette.ink, fontSize: 18, fontWeight: "700" }}>
          Lernstand wird vorbereitet...
        </Text>
        <Text
          style={{
            color: palette.muted,
            fontSize: 15,
            lineHeight: 22,
            textAlign: "center",
          }}
        >
          Wir laden die erste Trainingsrunde und deinen bisherigen Fortschritt.
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: palette.canvas },
          headerTintColor: palette.ink,
          headerRight: () => <HeaderMenu />,
          headerTitleStyle: {
            color: palette.ink,
            fontSize: 20,
            fontWeight: "800",
          },
          contentStyle: { backgroundColor: palette.canvas },
        }}
      >
        <Stack.Screen name="index" options={{ title: "1x1-Expedition" }} />
        <Stack.Screen name="mode-select" options={{ title: "Modus wahlen" }} />
        <Stack.Screen name="learning-mode" options={{ title: "Lernmodus" }} />
        <Stack.Screen name="speaking-mode" options={{ title: "Sprechmodus" }} />
        <Stack.Screen name="training" options={{ title: "Training" }} />
        <Stack.Screen name="map" options={{ title: "Inselkarte" }} />
        <Stack.Screen name="stickers" options={{ title: "Stickeralbum" }} />
        <Stack.Screen name="parents" options={{ title: "Elternblick" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <LearningProvider>
      <AppStack />
    </LearningProvider>
  );
}
