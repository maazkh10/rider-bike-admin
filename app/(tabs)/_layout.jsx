import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import AnimatedButton from "../components/AnimationTab";
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "rgb(0, 0, 0)",
        tabBarStyle: {
          // position: "absolute",
          bottom: 25,
          right: 200,
          alignSelf: "center",
          width: "80%",
          height: 60,
          borderRadius: 15,
          backgroundColor: "#BBFF5B",
        

          elevation: 10,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarButton: (props) => <AnimatedButton {...props} />,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={focused ? "#000000" : color}
            />
          ),
        }}
      />



<Tabs.Screen
        name="collection"
        options={{
          tabBarButton: (props) => <AnimatedButton {...props} />,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name="database"
              size={size}
              color={focused ? "#000000" : color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarButton: (props) => <AnimatedButton {...props} />,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name="person-circle"
              size={size}
              color={focused ? "#000000" : color}
            />
          ),
        }}
      />


    </Tabs>
  );
}
