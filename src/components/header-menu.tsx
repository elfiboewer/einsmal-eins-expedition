import { usePathname, useRouter } from "expo-router";
import * as React from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";

import { useLearning } from "@/features/learning/provider";
import { palette } from "@/theme/palette";

const PLAYER_NAME = "EliBo";

export function HeaderMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { stickerCount } = useLearning();
  const [isOpen, setIsOpen] = React.useState(false);

  function navigateTo(pathnameTarget: "/" | "/parents" | "/stickers") {
    setIsOpen(false);

    if (pathname !== pathnameTarget) {
      router.push(pathnameTarget);
    }
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Menü öffnen"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderRadius: 999,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: pressed ? palette.surfaceAlt : palette.surface,
          paddingLeft: 12,
          paddingRight: 10,
          paddingVertical: 8,
        })}
      >
        <View
          style={{
            height: 28,
            minWidth: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            backgroundColor: palette.accentSoft,
            paddingHorizontal: 10,
          }}
        >
          <Text
            style={{
              color: palette.accentStrong,
              fontSize: 14,
              fontWeight: "800",
            }}
          >
            {PLAYER_NAME}
          </Text>
        </View>
        <BurgerGlyph />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <Pressable
          onPress={() => setIsOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(17, 32, 49, 0.18)",
            paddingHorizontal: 18,
            paddingTop: 72,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              alignSelf: "flex-end",
              width: 260,
              gap: 12,
              borderRadius: 28,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.surface,
              boxShadow: "0 18px 40px rgba(17, 32, 49, 0.16)",
              padding: 16,
            }}
          >
            <View
              style={{
                gap: 4,
                borderRadius: 22,
                borderCurve: "continuous",
                backgroundColor: palette.surfaceAlt,
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 12,
                  fontWeight: "700",
                  textTransform: "uppercase",
                }}
              >
                Spieler
              </Text>
              <Text
                style={{
                  color: palette.ink,
                  fontSize: 22,
                  fontWeight: "900",
                }}
              >
                {PLAYER_NAME}
              </Text>
            </View>

            <MenuEntry
              active={pathname === "/"}
              label="Hauptmenü"
              meta="Zuruck zur Startseite"
              onPress={() => navigateTo("/")}
            />
            <MenuEntry
              active={pathname === "/stickers"}
              label="Stickeralbum"
              meta={`${stickerCount} gesammelt`}
              onPress={() => navigateTo("/stickers")}
            />
            <MenuEntry
              active={pathname === "/parents"}
              label="Elternblick"
              meta="Fortschritt und Probleme"
              onPress={() => navigateTo("/parents")}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuEntry({
  active,
  label,
  meta,
  onPress,
}: {
  active: boolean;
  label: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        gap: 2,
        borderRadius: 22,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: active ? palette.accent : palette.line,
        backgroundColor: active
          ? palette.accentSoft
          : pressed
            ? palette.surfaceAlt
            : palette.surface,
        paddingHorizontal: 14,
        paddingVertical: 14,
      })}
    >
      <Text
        style={{
          color: palette.ink,
          fontSize: 17,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: palette.muted,
          fontSize: 13,
          lineHeight: 18,
        }}
      >
        {meta}
      </Text>
    </Pressable>
  );
}

function BurgerGlyph() {
  return (
    <View
      style={{
        gap: 3,
      }}
    >
      {[1, 2, 3].map((bar) => (
        <View
          key={bar}
          style={{
            height: 2.5,
            width: 18,
            borderRadius: 999,
            backgroundColor: palette.ink,
          }}
        />
      ))}
    </View>
  );
}
