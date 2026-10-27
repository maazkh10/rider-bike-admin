import { Stack, router } from "expo-router";
import { useEffect } from "react";
import Backbutton from "./components/backbutton";
import { startPushLifecycle } from "../src/services/pushClient";
import api from "../src/api/client";

export default function RootLayout() {
  useEffect(() => {
    let disposed = false, cleanup = () => {};
    startPushLifecycle(async data => {
      try {
        const response = await api.get("/api/profile/me/rides");
        if (response.data.some(ride => Number(ride.rideId) === data.rideId))
          router.push({ pathname: "/ride-monitor", params: { rideId: String(data.rideId) } });
        else router.push("/(tabs)/home");
      } catch { router.push("/(tabs)/home"); }
    }).then(remove => { if (disposed) remove(); else cleanup = remove; }).catch(() => {});
    return () => { disposed = true; cleanup(); };
  }, []);
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
