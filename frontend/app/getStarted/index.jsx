// import { View, Text ,Image,TouchableOpacity, StyleSheet, Pressable ,ImageBackground} from 'react-native'
// import React, { useCallback } from 'react'

// import * as WebBrowser from 'expo-web-browser'
// //import { Link } from 'expo-router'
// import { useOAuth } from '@clerk/clerk-expo'
// import * as Linking from 'expo-linking'


// export const useWarmUpBrowser = () => {
//     React.useEffect(() => {
//       // Warm up the android browser to improve UX
//       // https://docs.expo.dev/guides/authentication/#improving-user-experience
//       void WebBrowser.warmUpAsync()
//       return () => {
//         void WebBrowser.coolDownAsync()
//       }
//     }, [])
//   }
  
//   WebBrowser.maybeCompleteAuthSession()

// export default function LoginScreen() {
//     useWarmUpBrowser();
//     const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })
//     const onPress = useCallback(async () => {
//         try {
//           const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow({
//             redirectUrl: Linking.createURL('/home', { scheme: 'myapp' }),
//           })
    
//           if (createdSessionId) {
//             //setActive({ session: createdSessionId })
//           } else {
//             // Use signIn or signUp for next steps such as MFA
//           }
//         } catch (err) {
//           console.error('OAuth error', err)
//         }
//       }, [])

//   return (
//     <View style={styles.container}>
//       <View style={styles.logoContainer}>
//         <Image
//           source={require('./../../assets/images/logo.png')} 
//           style={styles.logo}
//         />
//         {/* <ImageBackground
//         source={require('./../../assets/images/bg.png')}
//         style={styles.backgroundImage}
//         >
//         </ImageBackground> */}
//       </View>
//       <View style={styles.textContainer}>
//         <Text style={styles.title}>Smart Sehat</Text>
//         <Text style={styles.subtitle}>APKA APNA NUTRITIONIST</Text>
//       </View>
      
//       <Pressable
//       onPress={onPress}
//         style={styles.button}
//         //onPress={() => navigation.navigate('Home')} 
//       >
//         <Text style={styles.buttonText}>Get started</Text>
//       </Pressable>
//     </View>
//   );
// };
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'white',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   logoContainer: {
//     flex: 1,
//     justifyContent: 'center',
//   },
//   logo: {
//     width: 250, 
//     height: 250,
//     resizeMode: 'contain',
//   },
// //   backgroundImage: {
// //     width: 250, 
// //     height: 250,
// //     resizeMode: 'contain',
// //   },
// //   container: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //   },
//   textContainer: {
//     flex: 0.5,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 50,
//     fontWeight: 'bold',
//     color: '#5B3566',
//     marginBottom: 5,
//   },
//   subtitle: {
//     fontSize: 25,
//     color: '#5B3566',
//     marginBottom: 180,
//   },
//   button: {
//     backgroundColor: '#F7577A',
//     paddingVertical: 15,
//     paddingHorizontal: 100,
//     borderRadius: 25,
//     marginBottom: 50,
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
// });

import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';  

export default function LoginScreen() {
  const router = useRouter();  // Initialize router

  const navigateToSignUp = () => {
    router.push('/SignUp');  // Navigate to the SignUp screen
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('./../../assets/images/logo.png')}
          style={styles.logo}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Smart Sehat</Text>
        <Text style={styles.subtitle}>APKA APNA NUTRITIONIST</Text>
      </View>

      <TouchableOpacity
        onPress={navigateToSignUp}  // Navigate to the SignUp screen when pressed
        style={styles.button}
      >
        <Text style={styles.buttonText}>Get started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
  },
  textContainer: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#5B3566',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 25,
    color: '#5B3566',
    marginBottom: 180,
  },
  button: {
    backgroundColor: '#F7577A',
    paddingVertical: 15,
    paddingHorizontal: 100,
    borderRadius: 25,
    marginBottom: 50,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
