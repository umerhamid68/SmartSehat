// import React from 'react';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   Image,
//   StyleSheet,
//   ScrollView,
// } from 'react-native';

// export default function FoodSafety() {
//   const router = useRouter();
//   // Grab query params passed from FoodScanner
//   const { score, itemName, imageUri, details } = useLocalSearchParams();

//   // These are just dummy placeholders to mimic your Figma design
//   // You can adjust them or make them dynamic as needed
//   const redCircleValue = '371 / 224g';
//   const greenCircleValue = '199 / 120g';
//   const blueCircleValue = '331 / 180g';

//   // Decide if "Safe" or "Unsafe" is highlighted based on the score
//   // For now, let's say score >= 5 => "Safe", else "Unsafe"
//   const numericScore = parseInt(score || '0');
//   const isSafe = numericScore >= 5;

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       {/* Header / Title area */}
//       <TouchableOpacity
//         style={styles.backButton}
//         onPress={() => router.back()}
//       >
//         <Text style={styles.backButtonText}>{'←'}</Text>
//       </TouchableOpacity>

//       <Text style={styles.headerTitle}>Smart Sehat</Text>

//       {/* Product / Meal Image */}
//       <Image
//         source={
//           imageUri
//             ? { uri: imageUri }
//             : require('../../assets/images/logo.png') // fallback image
//         }
//         style={styles.itemImage}
//       />

//       {/* Details */}
//       <Text style={styles.detailsTitle}>Details</Text>
//       <Text style={styles.detailsSubtitle}>
//         {itemName || 'Unknown Item'}
//       </Text>
//       <Text style={styles.detailsDescription}>
//         {details || 'No details provided.'}
//       </Text>

//       {/* Some colored circles - example macros or info */}
//       <View style={styles.circleRow}>
//         <View style={[styles.circle, { borderColor: 'red' }]}>
//           <Text style={styles.circleText}>{redCircleValue}</Text>
//         </View>

//         <View style={[styles.circle, { borderColor: 'green' }]}>
//           <Text style={styles.circleText}>{greenCircleValue}</Text>
//         </View>

//         <View style={[styles.circle, { borderColor: 'blue' }]}>
//           <Text style={styles.circleText}>{blueCircleValue}</Text>
//         </View>
//       </View>

//       {/* Safety Score & Buttons */}
//       <Text style={styles.resultsLabel}>Results</Text>
//       <View style={styles.safetyRow}>
//         <TouchableOpacity
//           style={[
//             styles.safetyButton,
//             isSafe ? styles.safeButtonActive : styles.safeButtonInactive,
//           ]}
//         >
//           <Text style={styles.safetyButtonText}>Safe</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[
//             styles.safetyButton,
//             !isSafe ? styles.unsafeButtonActive : styles.unsafeButtonInactive,
//           ]}
//         >
//           <Text style={styles.safetyButtonText}>Unsafe</Text>
//         </TouchableOpacity>
//       </View>

//       {/* Done Button */}
//       <TouchableOpacity
//         style={styles.doneButton}
//         onPress={() => router.push('/landing')}
//       >
//         <Text style={styles.doneButtonText}>Done</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// // ====== STYLES ======
// const styles = StyleSheet.create({
//   container: {
//     alignItems: 'center',
//     paddingVertical: 20,
//     backgroundColor: '#FFF',
//   },
//   backButton: {
//     position: 'absolute',
//     left: 20,
//     top: 50,
//     padding: 10,
//     zIndex: 99,
//   },
//   backButtonText: {
//     fontSize: 24,
//     color: '#5B3566',
//   },
//   headerTitle: {
//     marginTop: 50,
//     marginBottom: 20,
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#5B3566',
//   },
//   itemImage: {
//     width: 150,
//     height: 150,
//     resizeMode: 'contain',
//     marginBottom: 20,
//   },
//   detailsTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#5B3566',
//     marginBottom: 10,
//   },
//   detailsSubtitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#000',
//     marginBottom: 5,
//   },
//   detailsDescription: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 20,
//     textAlign: 'center',
//     paddingHorizontal: 20,
//   },
//   circleRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     width: '80%',
//     marginBottom: 20,
//   },
//   circle: {
//     borderWidth: 4,
//     borderRadius: 60,
//     width: 80,
//     height: 80,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   circleText: {
//     fontSize: 14,
//     fontWeight: 'bold',
//   },
//   resultsLabel: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#5B3566',
//     marginBottom: 10,
//   },
//   safetyRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     width: '60%',
//     marginBottom: 30,
//   },
//   safetyButton: {
//     borderWidth: 2,
//     borderRadius: 8,
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//   },
//   safetyButtonText: {
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   safeButtonActive: {
//     backgroundColor: '#4CAF50',
//     borderColor: '#388E3C',
//   },
//   safeButtonInactive: {
//     backgroundColor: '#E0E0E0',
//     borderColor: '#9E9E9E',
//   },
//   unsafeButtonActive: {
//     backgroundColor: '#F44336',
//     borderColor: '#D32F2F',
//   },
//   unsafeButtonInactive: {
//     backgroundColor: '#E0E0E0',
//     borderColor: '#9E9E9E',
//   },
//   doneButton: {
//     backgroundColor: '#FF6B81',
//     marginTop: 10,
//     paddingVertical: 15,
//     paddingHorizontal: 50,
//     borderRadius: 10,
//   },
//   doneButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
// });


























import React from 'react';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

export default function FoodSafety() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();

  // Get all params including loading state
  const {
    imageUri,
    loading,
    calories,
    totalFat,
    servingSize,
    safetyScore,
    safetyRating,
    details
  } = searchParams;
  const [imageError, setImageError] = useState(false);

  const renderImage = () => {
    if (!imageUri || imageError) {
      return (
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.itemImage}
        />
      );
    }

    return (
      <Image 
        source={{ uri: imageUri }}
        style={styles.itemImage}
        onError={(error) => {
          console.log('Image loading error:', error);
          setImageError(true);
        }}
        // Add these props to help with image loading
        resizeMode="contain"
        defaultSource={require('../../assets/images/logo.png')}
      />
    );
  };

  // Determine rating color
  let ratingColor = '#9E9E9E';
  if (safetyRating?.toLowerCase() === 'safe') {
    ratingColor = '#4CAF50';
  } else if (safetyRating?.toLowerCase() === 'unsafe') {
    ratingColor = '#F44336';
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Smart Sehat</Text>

      {loading === 'true' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B81" />
          <Text style={{ marginTop: 10, fontSize: 16 }}>Checking Safety...</Text>
        </View>
      ) : (
        <>
          {renderImage()}

          <Text style={styles.detailsTitle}>Details</Text>
          <Text style={styles.detailsText}>{details}</Text>

          <View style={styles.circleRow}>
            <View style={[styles.circle, { borderColor: 'red' }]}>
              <Text style={styles.circleText}>{calories}</Text>
              <Text style={styles.circleLabel}>Calories</Text>
            </View>
            <View style={[styles.circle, { borderColor: 'green' }]}>
              <Text style={styles.circleText}>{totalFat}</Text>
              <Text style={styles.circleLabel}>Total Fat</Text>
            </View>
            <View style={[styles.circle, { borderColor: 'blue' }]}>
              <Text style={styles.circleText}>{servingSize}</Text>
              <Text style={styles.circleLabel}>Serving</Text>
            </View>
          </View>

          <Text style={styles.resultsLabel}>Results</Text>

          {safetyRating ? (
            <View style={styles.safetyRow}>
              <Text style={[styles.safetyText, { color: ratingColor }]}>
                {safetyRating.toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={styles.safetyRow}>
              <Text style={[styles.safetyText, { color: '#9E9E9E' }]}>
                Unknown
              </Text>
            </View>
          )}

          {safetyScore ? (
            <Text style={styles.scoreText}>Safety Score: {safetyScore}</Text>
          ) : null}

          <TouchableOpacity 
            style={styles.doneButton} 
            onPress={() => router.replace('/landing')}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    padding: 10,
    zIndex: 99,
  },
  backButtonText: {
    fontSize: 24,
    color: '#5B3566',
  },
  headerTitle: {
    marginTop: 50,
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5B3566',
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  itemImage: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B3566',
    marginBottom: 10,
  },
  detailsText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  circleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '85%',
    marginBottom: 30,
  },
  circle: {
    borderWidth: 3,
    borderRadius: 60,
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  circleText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  circleLabel: {
    fontSize: 12,
    color: '#666',
  },
  resultsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5B3566',
    marginBottom: 10,
  },
  safetyRow: {
    marginBottom: 10,
  },
  safetyText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  scoreText: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 30,
  },
  doneButton: {
    backgroundColor: '#FF6B81',
    paddingHorizontal: 50,
    paddingVertical: 15,
    borderRadius: 10,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
