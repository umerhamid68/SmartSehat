// import React, { useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Animated,
//   Dimensions,
//   Image,
// } from 'react-native';
// import { MaterialCommunityIcons } from '@expo/vector-icons';

// const { width } = Dimensions.get('window');

// const DietPlanLoadingOverlay = ({ isVisible }) => {
//   // Animation values
//   const spinValue = useRef(new Animated.Value(0)).current;
//   const scaleValue = useRef(new Animated.Value(0)).current;
//   const fadeValue = useRef(new Animated.Value(0)).current;
//   const textPulse = useRef(new Animated.Value(1)).current;
//   const slideValues = useRef([
//     new Animated.Value(-width),
//     new Animated.Value(-width),
//     new Animated.Value(-width),
//   ]).current;
  
//   useEffect(() => {
//     if (isVisible) {
//       // Start all animations
//       Animated.parallel([
//         // Fade in overlay
//         Animated.timing(fadeValue, {
//           toValue: 1,
//           duration: 300,
//           useNativeDriver: true,
//         }),
//         // Scale in main content
//         Animated.spring(scaleValue, {
//           toValue: 1,
//           tension: 50,
//           friction: 7,
//           useNativeDriver: true,
//         }),
//       ]).start();

//       // Spinning animation for the main icon
//       Animated.loop(
//         Animated.timing(spinValue, {
//           toValue: 1,
//           duration: 2000,
//           useNativeDriver: true,
//         })
//       ).start();

//       // Text pulse animation
//       Animated.loop(
//         Animated.sequence([
//           Animated.timing(textPulse, {
//             toValue: 1.1,
//             duration: 1000,
//             useNativeDriver: true,
//           }),
//           Animated.timing(textPulse, {
//             toValue: 1,
//             duration: 1000,
//             useNativeDriver: true,
//           }),
//         ])
//       ).start();

//       // Slide in food icons
//       slideValues.forEach((value, index) => {
//         Animated.timing(value, {
//           toValue: 0,
//           duration: 800,
//           delay: index * 200,
//           useNativeDriver: true,
//         }).start();
//       });
//     } else {
//       // Reset animations
//       Animated.parallel([
//         Animated.timing(fadeValue, {
//           toValue: 0,
//           duration: 300,
//           useNativeDriver: true,
//         }),
//         Animated.timing(scaleValue, {
//           toValue: 0,
//           duration: 300,
//           useNativeDriver: true,
//         }),
//       ]).start();
//     }
//   }, [isVisible]);

//   const spin = spinValue.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0deg', '360deg'],
//   });

//   if (!isVisible) return null;

//   const foodIcons = ['food-apple', 'carrot', 'bread-slice'];
//   const foodColors = ['#FF6B81', '#4CAF50', '#FFA726'];

//   return (
//     <Animated.View 
//       style={[
//         styles.overlay,
//         {
//           opacity: fadeValue,
//         }
//       ]}
//     >
//       <Animated.View 
//         style={[
//           styles.contentContainer,
//           {
//             transform: [{ scale: scaleValue }],
//           }
//         ]}
//       >
//         {/* Main spinning loader */}
//         <Animated.View
//           style={[
//             styles.mainLoader,
//             {
//               transform: [{ rotate: spin }],
//             }
//           ]}
//         >
//           <MaterialCommunityIcons 
//             name="chef-hat" 
//             size={80} 
//             color="#FF6B81" 
//           />
//         </Animated.View>

//         {/* Food icons sliding around */}
//         <View style={styles.foodIconsContainer}>
//           {foodIcons.map((icon, index) => (
//             <Animated.View
//               key={index}
//               style={[
//                 styles.foodIcon,
//                 {
//                   transform: [
//                     { translateX: slideValues[index] },
//                     { 
//                       rotate: slideValues[index].interpolate({
//                         inputRange: [-width, 0],
//                         outputRange: ['-360deg', '0deg'],
//                       })
//                     }
//                   ],
//                 }
//               ]}
//             >
//               <MaterialCommunityIcons 
//                 name={icon} 
//                 size={40} 
//                 color={foodColors[index]} 
//               />
//             </Animated.View>
//           ))}
//         </View>

//         {/* Loading text */}
//         <Animated.Text
//           style={[
//             styles.loadingText,
//             {
//               transform: [{ scale: textPulse }],
//             }
//           ]}
//         >
//           Creating Your Perfect Diet Plan
//         </Animated.Text>

//         {/* Progress indicators */}
//         <View style={styles.dotsContainer}>
//           {[0, 1, 2].map((_, index) => (
//             <Animated.View
//               key={index}
//               style={[
//                 styles.dot,
//                 {
//                   opacity: spinValue.interpolate({
//                     inputRange: [0, 0.25, 0.5, 0.75, 1],
//                     outputRange: index === 0 
//                       ? [1, 0.3, 0.3, 0.3, 1]
//                       : index === 1
//                       ? [0.3, 1, 0.3, 0.3, 0.3]
//                       : [0.3, 0.3, 1, 0.3, 0.3],
//                   }),
//                 }
//               ]}
//             />
//           ))}
//         </View>

//         {/* Fun messages */}
//         <Animated.Text
//           style={[
//             styles.funMessage,
//             {
//               opacity: spinValue.interpolate({
//                 inputRange: [0, 0.5, 1],
//                 outputRange: [1, 0, 1],
//               }),
//             }
//           ]}
//         >
//           Analyzing your nutritional needs...
//         </Animated.Text>
//       </Animated.View>
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   overlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0, 0, 0, 0.9)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 9999,
//   },
//   contentContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 20,
//   },
//   mainLoader: {
//     marginBottom: 30,
//   },
//   foodIconsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     width: width * 0.7,
//     marginBottom: 30,
//   },
//   foodIcon: {
//     padding: 10,
//   },
//   loadingText: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   dotsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginBottom: 20,
//   },
//   dot: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     backgroundColor: '#FF6B81',
//     marginHorizontal: 5,
//   },
//   funMessage: {
//     fontSize: 16,
//     color: '#ccc',
//     textAlign: 'center',
//     fontStyle: 'italic',
//   },
// });

// export default DietPlanLoadingOverlay;










import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const DietPlanLoadingModal = ({ visible }) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const bounceValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const fadeValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      startAnimations();
    }
  }, [visible]);

  const startAnimations = () => {
    // Spinning animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Scale animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Bouncing dots
    bounceValues.forEach((value, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(value, {
            toValue: -10,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Fade animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeValue, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const foodIcons = ['apple', 'coffee', 'cutlery'];
  const colors = ['#FF6B81', '#4CAF50', '#FFA500'];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        <View style={styles.loadingBox}>
          <Animated.View
            style={[
              styles.centerIcon,
              {
                transform: [{ rotate: spin }, { scale: scaleValue }],
              },
            ]}
          >
            <FontAwesome name="cutlery" size={50} color="#FF6B81" />
          </Animated.View>

          <View style={styles.orbitContainer}>
            {foodIcons.map((icon, index) => {
              const angle = (index * 120 * Math.PI) / 180;
              const radius = 80;
              const x = radius * Math.cos(angle);
              const y = radius * Math.sin(angle);

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.orbitingIcon,
                    {
                      transform: [
                        { translateX: x },
                        { translateY: y },
                        { rotate: spin },
                      ],
                    },
                  ]}
                >
                  <FontAwesome
                    name={icon}
                    size={24}
                    color={colors[index]}
                  />
                </Animated.View>
              );
            })}
          </View>

          <Animated.Text
            style={[
              styles.loadingText,
              { opacity: fadeValue },
            ]}
          >
            Creating Your Perfect Diet Plan
          </Animated.Text>

          <View style={styles.dotsContainer}>
            {bounceValues.map((value, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: colors[index],
                    transform: [{ translateY: value }],
                  },
                ]}
              />
            ))}
          </View>

          <Text style={styles.subtitleText}>
            We're personalizing your meal plan based on your preferences...
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: width * 0.85,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  centerIcon: {
    marginBottom: 50,
    zIndex: 2,
  },
  orbitContainer: {
    position: 'absolute',
    top: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  orbitingIcon: {
    position: 'absolute',
  },
  loadingText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginVertical: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
});

export default DietPlanLoadingModal;