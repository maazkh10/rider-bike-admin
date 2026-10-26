import { Stack } from "expo-router";
import { useEffect } from "react";
import Backbutton from "./components/backbutton";
import { registerForNotifications } from "../src/services/notifications";

export default function RootLayout() {
  useEffect(() => { registerForNotifications(); }, []);
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: "",
        headerBackTitle: "",
        headerLeft: () => <Backbutton />,
        animation: "slide_from_right",
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
