import { Link, useRouter, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (rootNavigationState.key) {
      // Navigate to the /getStarted page once the navigation state is ready
      router.replace("/getStarted");
    }
  }, [rootNavigationState.key]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Loading...</Text>
    </View>
  );
}