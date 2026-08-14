import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { getAuthToken, clearAuthToken } from "../src/services/authToken";
import { getAdminProfileApi } from "../src/api/ride.api";

export default function Index() {
  const [route, setRoute] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const token = await getAuthToken();

      if (!token) {
        if (mounted) setRoute("/(auth)/Launch-screen");
        return;
      }

      try {
        const response = await getAdminProfileApi(token);
        if (!mounted) return;
        setRoute(response?.data?.role === "ADMIN" ? "/(tabs)/home" : "/(auth)/Launch-screen");
      } catch {
        await clearAuthToken();
        if (mounted) setRoute("/(auth)/Launch-screen");
      }
    })();

    return () => { mounted = false; };
  }, []);

  if (!route) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#5C9200" />
      </View>
    );
  }

  return <Redirect href={route} />;
}
