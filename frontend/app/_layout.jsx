// // import { Stack } from "expo-router";
// // import {useFonts} from "expo-font"
// // import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo'
// // import * as SecureStore from 'expo-secure-store'

// // const tokenCache = {
// //   async getToken(key) {
// //     try {
// //       const item = await SecureStore.getItemAsync(key)
// //       if (item) {
// //         console.log(`${key} was used 🔐 \n`)
// //       } else {
// //         console.log('No values stored under key: ' + key)
// //       }
// //       return item
// //     } catch (error) {
// //       console.error('SecureStore get item error: ', error)
// //       await SecureStore.deleteItemAsync(key)
// //       return null
// //     }
// //   },
// //   async saveToken(key, value) {
// //     try {
// //       return SecureStore.setItemAsync(key, value)
// //     } catch (err) {
// //       return
// //     }
// //   },
// // }


// // export default function RootLayout() {

// //   const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
// //   useFonts({
// //     'poppin-bold': require("./../assets/fonts/Poppins-Bold.ttf")
// //   })

// //   return (
// //     <ClerkProvider
// //     tokenCache={tokenCache} 
// //     publishableKey={publishableKey}>
// //     <Stack>
// //       <Stack.Screen name="index" />
// //       <Stack.Screen name="getStarted/index"
// //       options={
// //         {
// //           headerShown:false
// //         }
// //       }
// //       />
// //       <Stack.Screen name="SignUp/index"
// //       options={
// //         {
// //           headerShown:false
// //         }
// //       }
// //       />
// //       <Stack.Screen name="userLogin/index"
// //       options={
// //         {
// //           headerShown:false
// //         }
// //       }
// //       />
// //       <Stack.Screen name="home"
// //       options={
// //         {
// //           headerShown:false
// //         }
// //       }
// //       />
// //       <Stack.Screen name="medicalHistory/index"
// //       options={
// //         {
// //           headerShown:false
// //         }
// //       }
// //       />
// //       <Stack.Screen name="landing"
// //       options={
// //         {
// //           headerShown:false
// //         }
// //       }
// //       />
// //       <Stack.Screen name="chatBot/index"
// //       options={
// //         {
// //           headerShown:false
// //         }
// //       }
// //       />
// //     </Stack>
// //     </ClerkProvider>
// //   );
// // }
// import { Stack, useRouter, useSegments } from "expo-router";
// import { useFonts } from "expo-font";
// import { ClerkProvider } from '@clerk/clerk-expo';
// import * as SecureStore from 'expo-secure-store';
// import BottomNav from '../components/BottomNav'; // Import BottomNav component
// import { View } from 'react-native';

// const tokenCache = {
//   async getToken(key) {
//     try {
//       const item = await SecureStore.getItemAsync(key);
//       return item;
//     } catch (error) {
//       console.error('SecureStore get item error: ', error);
//       return null;
//     }
//   },
//   async saveToken(key, value) {
//     try {
//       return SecureStore.setItemAsync(key, value);
//     } catch (err) {
//       return;
//     }
//   },
// };

// export default function RootLayout() {
//   const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
//   const segments = useSegments();  // Get current route segments

//   // Logic to determine if BottomNav should be shown
//   const shouldShowBottomNav = () => {
//     const currentRoute = segments.join('/'); // Get full current route

//     // Define screens where BottomNav should be hidden
//     const noNavScreens = ['/getStarted', '/SignUp', '/userLogin', '/medicalHistory', ''];

//     // If currentRoute matches one of these, hide BottomNav
//     return !noNavScreens.includes(`/${segments[0]}`); // Check first segment for matching screen
//   };

//   useFonts({
//     'poppin-bold': require("./../assets/fonts/Poppins-Bold.ttf"),
//   });

//   return (
//     <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
//       <View style={{ flex: 1 }}>
//         <Stack>
//           <Stack.Screen name="index" />
//           <Stack.Screen name="getStarted/index" options={{ headerShown: false }} />
//           <Stack.Screen name="SignUp/index" options={{ headerShown: false }} />
//           <Stack.Screen name="userLogin/index" options={{ headerShown: false }} />
//           <Stack.Screen name="home" options={{ headerShown: false }} />
//           <Stack.Screen name="medicalHistory/index" options={{ headerShown: false }} />
//           <Stack.Screen name="landing" options={{ headerShown: false }} />
//           <Stack.Screen name="chatBot/index" options={{ headerShown: false }} />
//         </Stack>

//         {/* Conditionally render BottomNav */}
//         {shouldShowBottomNav() && <BottomNav />}
//       </View>
//     </ClerkProvider>
//   );
// }

import React, { useState, useEffect } from 'react';
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Keyboard, View } from 'react-native';
import BottomNav from '../components/BottomNav'; // Import BottomNav component

const tokenCache = {
  async getToken(key) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      console.error('SecureStore get item error: ', error);
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const segments = useSegments();  // Get current route segments
  const [keyboardVisible, setKeyboardVisible] = useState(false);  // Track if the keyboard is visible

  useEffect(() => {
    // Add listeners for keyboard events
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);  // Hide BottomNav when the keyboard is visible
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);  // Show BottomNav when the keyboard is hidden
    });

    // Cleanup listeners on component unmount
    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  // Logic to determine if BottomNav should be shown
  const shouldShowBottomNav = () => {
    const currentRoute = segments.join('/'); // Get full current route

    // Define screens where BottomNav should be hidden
    const noNavScreens = ['/getStarted', '/SignUp', '/userLogin', '/medicalHistory', ''];

    // If currentRoute matches one of these, hide BottomNav
    return !noNavScreens.includes(`/${segments[0]}`) && !keyboardVisible;  // Hide BottomNav if keyboard is visible
  };

  useFonts({
    'poppin-bold': require("./../assets/fonts/Poppins-Bold.ttf"),
  });
  const isNavBarVisible = shouldShowBottomNav();
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <View style={{ flex: 1 }}>
        <Stack>
          {/* <Stack.Screen name="index" /> */}
          <Stack.Screen name="getStarted/index" options={{ headerShown: false }} />
          <Stack.Screen name="SignUp/index" options={{ headerShown: false }} />
          <Stack.Screen name="userLogin/index" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="medicalHistory/index" options={{ headerShown: false }} />
          <Stack.Screen name="landing" options={{ headerShown: false }} />
          <Stack.Screen name="chatBot/index" options={{ headerShown: false, initialParams: { isNavBarVisible } }} />
          <Stack.Screen name="foodScanner/index" options={{ headerShown: false }}/>
          <Stack.Screen name="userProfile/index" options={{ headerShown: false }}/>
        </Stack>

        {/* Conditionally render BottomNav */}
        {shouldShowBottomNav() && <BottomNav />}
      </View>
    </ClerkProvider>
  );
}
//removed the testing comment
