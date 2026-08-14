import { Stack } from "expo-router";
import { useEffect } from "react";
import { registerForNotifications } from "../src/services/notifications";

export default function RootLayout() {
  useEffect(() => { registerForNotifications(); }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
