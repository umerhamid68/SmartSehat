import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';

export default function BottomNav() {
  const router = useRouter();
  const segments = useSegments();

  // Define the active route based on the first segment
  const activeRoute = `/${segments[0]}`;

  // Function to get icon color based on the active route
  const getIconColor = (route) => (activeRoute === route ? '#FF6B81' : '#666');

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity onPress={() => router.push('/landing')}>
        <FontAwesome name="home" size={35} color={getIconColor('/landing')} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/allMeals')}>
        <FontAwesome name="cutlery" size={30} color={getIconColor('/allMeals')} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/scanHistory')}>
        <FontAwesome name="camera" size={30} color={getIconColor('/scanHistory')} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/chatBot')}>
        <FontAwesome name="comment" size={30} color={getIconColor('/chatBot')} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/userProfile')}>
        <FontAwesome name="user" size={30} color={getIconColor('/userProfile')} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E5E5E5',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
});