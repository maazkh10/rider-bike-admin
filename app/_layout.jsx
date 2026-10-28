import { Stack, router, usePathname, useGlobalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import Backbutton from "./components/backbutton";
import { startPushLifecycle } from "../src/services/pushClient";
import api from "../src/api/client";
import { isCurrentRideMonitor } from "../src/services/rideMonitorState";

export default function RootLayout() {
  const pathname = usePathname(), params = useGlobalSearchParams();
  const currentScreen = useRef({});
  currentScreen.current = { pathname, params };
  useEffect(() => {
    let disposed = false, cleanup = () => {};
    startPushLifecycle(async data => {
      if (isCurrentRideMonitor(currentScreen.current.pathname, currentScreen.current.params, data.rideId)) return;
      try {
        const response = await api.get("/api/profile/me/rides");
        if (response.data.some(ride => Number(ride.rideId) === data.rideId))
          router.push({ pathname: "/ride-monitor", params: { rideId: String(data.rideId) } });
        // An unavailable/unauthorized ride must not reset the current screen.
      } catch { /* Keep the current screen if the verification request fails. */ }
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
