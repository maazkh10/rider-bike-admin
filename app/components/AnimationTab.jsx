import { useEffect, useRef } from "react";
import { Animated, TouchableOpacity } from "react-native";

const AnimatedButton = ({ accessibilityState, children, onPress }) => {
  const focused = accessibilityState?.selected;

  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1. : 1,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={1}>
      <Animated.View
        style={{
          transform: [{ scale }],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default AnimatedButton;
