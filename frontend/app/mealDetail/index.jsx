
// import React, { useState, useEffect } from 'react';
// import { 
//   View, 
//   Text, 
//   StyleSheet, 
//   Image, 
//   ScrollView, 
//   TouchableOpacity,
//   ActivityIndicator,
//   StatusBar,
//   SafeAreaView
// } from 'react-native';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { API_URL } from '../../constants';

// const API_BASE_URL = API_URL;

// export default function MealDetail() {
//   const params = useLocalSearchParams();
//   const router = useRouter();
//   const { mealId, mealName } = params;
  
//   const [meal, setMeal] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     fetchMealDetails();
//   }, [mealId]);

//   const fetchMealDetails = async () => {
//     try {
//       setLoading(true);
//       const token = await AsyncStorage.getItem('jwt_token');
      
//       if (!token) {
//         setError('Authentication token not found');
//         setLoading(false);
//         return;
//       }

//       const response = await fetch(`${API_BASE_URL}/diet/meal/${mealId}`, {
//         method: 'GET',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();
//       setMeal(data.meal);
//       setLoading(false);
//     } catch (error) {
//       console.error('Error fetching meal details:', error);
//       setError(error.message);
//       setLoading(false);
//     }
//   };

//   const markMealCompleted = async () => {
//     try {
//       const token = await AsyncStorage.getItem('jwt_token');
      
//       if (!token) {
//         setError('Authentication token not found');
//         return;
//       }
      
//       const response = await fetch(`${API_BASE_URL}/diet/meal/complete`, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ mealId })
//       });
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
      
//       // Update local state
//       setMeal({
//         ...meal,
//         is_completed: true
//       });
      
//     } catch (error) {
//       console.error('Error marking meal as completed:', error);
//       setError('Failed to mark meal as completed');
//     }
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#FF6B81" />
//         <Text style={styles.loadingText}>Loading meal details...</Text>
//       </SafeAreaView>
//     );
//   }

//   if (error || !meal) {
//     return (
//       <SafeAreaView style={styles.errorContainer}>
//         <Text style={styles.errorText}>Error loading meal details</Text>
//         <Text>{error}</Text>
//         <TouchableOpacity 
//           style={styles.buttonPrimary}
//           onPress={() => router.back()}
//         >
//           <Text style={styles.buttonText}>Go Back</Text>
//         </TouchableOpacity>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" />
      
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
//           <FontAwesome name="arrow-left" size={24} color="#333" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle} numberOfLines={1}>{meal.name}</Text>
//         <View style={styles.placeholder}></View>
//       </View>
      
//       <ScrollView showsVerticalScrollIndicator={false}>
//         {/* Meal Image */}
//         <Image 
//           source={meal.image ? { uri: meal.image } : require('../../assets/images/meal.png')} 
//           style={styles.mealImage}
//           defaultSource={require('../../assets/images/meal.png')}
//         />
        
//         {/* Meal Status */}
//         {meal.is_completed && (
//           <View style={styles.completedBadge}>
//             <FontAwesome name="check-circle" size={16} color="#4CAF50" />
//             <Text style={styles.completedText}>Completed</Text>
//           </View>
//         )}
        
//         {/* Meal Time */}
//         <View style={styles.timeContainer}>
//           <MaterialIcons name="access-time" size={22} color="#FF6B81" />
//           <Text style={styles.timeText}>Recommended Time: {meal.time_range}</Text>
//         </View>
        
//         {/* Description/Summary */}
//         <Text style={styles.description}>{meal.summary || meal.description}</Text>

//         {/* Portion */}
//         <View style={styles.sectionContainer}>
//           <Text style={styles.sectionTitle}>Portion Size</Text>
//           <Text style={styles.description}>{meal.portion}</Text>
//         </View>
        
//         {/* Nutritional Information */}
//         <View style={styles.sectionContainer}>
//           <Text style={styles.sectionTitle}>Nutritional Values</Text>
//           <View style={styles.nutritionContainer}>
//             {Object.entries(meal.nutritional_values).map(([key, value]) => (
//               <View key={key} style={styles.nutritionItem}>
//                 <Text style={styles.nutritionValue}>{value}</Text>
//                 <Text style={styles.nutritionLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
//               </View>
//             ))}
//           </View>
//         </View>
        
//         {/* Detailed Nutrition Information */}
//         {meal.nutrition_details && Object.keys(meal.nutrition_details).length > 0 && (
//           <View style={styles.sectionContainer}>
//             <Text style={styles.sectionTitle}>Detailed Nutrition</Text>
//             <View style={styles.detailedNutritionContainer}>
//               {Object.entries(meal.nutrition_details).map(([key, value]) => (
//                 <View key={key} style={styles.detailedNutritionItem}>
//                   <Text style={styles.detailedNutritionLabel}>{key}</Text>
//                   <Text style={styles.detailedNutritionValue}>{value}</Text>
//                 </View>
//               ))}
//             </View>
//           </View>
//         )}
        
//         {/* Ingredients */}
//         {meal.ingredients && meal.ingredients.length > 0 && (
//           <View style={styles.sectionContainer}>
//             <Text style={styles.sectionTitle}>Ingredients</Text>
//             {meal.ingredients.map((ingredient, index) => (
//               <View key={index} style={styles.listItem}>
//                 <View style={styles.bullet}></View>
//                 <Text style={styles.listItemText}>{ingredient}</Text>
//               </View>
//             ))}
//           </View>
//         )}
        
//         {/* Preparation Steps */}
//         {meal.instructions && meal.instructions.length > 0 && (
//           <View style={styles.sectionContainer}>
//             <Text style={styles.sectionTitle}>Preparation Steps</Text>
//             {meal.instructions.map((step, index) => (
//               <View key={index} style={styles.listItemNumbered}>
//                 <Text style={styles.stepNumber}>{index + 1}</Text>
//                 <Text style={styles.listItemText}>{step}</Text>
//               </View>
//             ))}
//           </View>
//         )}
        
//         {/* Action buttons */}
//         <View style={styles.actionContainer}>
//           {!meal.is_completed && (
//             <TouchableOpacity 
//               style={styles.primaryButton}
//               onPress={markMealCompleted}
//             >
//               <Text style={styles.buttonText}>Mark as Completed</Text>
//             </TouchableOpacity>
//           )}
          
//           <TouchableOpacity 
//             style={styles.secondaryButton}
//             onPress={() => {/* Add to shopping list functionality */}}
//           >
//             <Text style={styles.secondaryButtonText}>Add Ingredients to Shopping List</Text>
//           </TouchableOpacity>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     color: '#666',
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//     backgroundColor: '#fff',
//   },
//   errorText: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#FF6B81',
//     marginBottom: 10,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//   },
//   backButton: {
//     padding: 5,
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     flex: 1,
//     textAlign: 'center',
//     marginHorizontal: 10,
//   },
//   placeholder: {
//     width: 34,
//   },
//   mealImage: {
//     width: '100%',
//     height: 250,
//     resizeMode: 'cover',
//   },
//   completedBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#E8F5E9',
//     paddingHorizontal: 15,
//     paddingVertical: 8,
//     borderRadius: 20,
//     position: 'absolute',
//     top: 20,
//     right: 20,
//   },
//   completedText: {
//     marginLeft: 5,
//     color: '#4CAF50',
//     fontWeight: 'bold',
//     fontSize: 14,
//   },
//   timeContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginHorizontal: 20,
//     marginTop: 15,
//   },
//   timeText: {
//     marginLeft: 8,
//     fontSize: 14,
//     color: '#666',
//   },
//   description: {
//     fontSize: 16,
//     lineHeight: 24,
//     color: '#333',
//     padding: 20,
//     textAlign: 'center',
//   },
//   sectionContainer: {
//     padding: 20,
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 15,
//     color: '#333',
//   },
//   nutritionContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },
//   nutritionItem: {
//     backgroundColor: '#f8f8f8',
//     padding: 15,
//     borderRadius: 10,
//     alignItems: 'center',
//     width: '30%',
//     marginBottom: 10,
//   },
//   nutritionValue: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#FF6B81',
//   },
//   nutritionLabel: {
//     fontSize: 12,
//     color: '#666',
//     marginTop: 5,
//   },
//   detailedNutritionContainer: {
//     backgroundColor: '#f8f8f8',
//     borderRadius: 10,
//     padding: 15,
//   },
//   detailedNutritionItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//   },
//   detailedNutritionItem__last: {
//     borderBottomWidth: 0,
//   },
//   detailedNutritionLabel: {
//     fontSize: 14,
//     color: '#555',
//     flex: 1,
//   },
//   detailedNutritionValue: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//     textAlign: 'right',
//   },
//   listItem: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     marginBottom: 12,
//   },
//   bullet: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#FF6B81',
//     marginTop: 6,
//     marginRight: 10,
//   },
//   listItemNumbered: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     marginBottom: 12,
//   },
//   stepNumber: {
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: '#FF6B81',
//     color: '#fff',
//     textAlign: 'center',
//     lineHeight: 24,
//     marginRight: 10,
//     fontSize: 14,
//     fontWeight: 'bold',
//   },
//   listItemText: {
//     flex: 1,
//     fontSize: 14,
//     lineHeight: 20,
//     color: '#555',
//   },
//   actionContainer: {
//     padding: 20,
//     paddingBottom: 30,
//   },
//   primaryButton: {
//     backgroundColor: '#FF6B81',
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginBottom: 10,
//   },
//   secondaryButton: {
//     backgroundColor: '#fff',
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#FF6B81',
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   secondaryButtonText: {
//     color: '#FF6B81',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   buttonPrimary: {
//     backgroundColor: '#FF6B81',
//     paddingVertical: 12,
//     paddingHorizontal: 24,
//     borderRadius: 8,
//     marginTop: 20,
//   },
// });




import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../constants';

const API_BASE_URL = API_URL;

export default function MealDetail() {
  const { mealId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();        // ← safe‑area insets

  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ------------------------------------------------------------------ */
  /*                             API CALLS                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    fetchMealDetails();
  }, [mealId]);

  const fetchMealDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwt_token');

      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/diet/meal/${mealId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      const data = await res.json();
      setMeal(data.meal);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching meal details:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const markMealCompleted = async () => {
    try {
      const token = await AsyncStorage.getItem('jwt_token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }
  
      const res = await fetch(`${API_BASE_URL}/diet/meal/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mealId }),
      });
  
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  
      // ✅ locally reflect the change
      setMeal((prev) => ({ ...prev, is_completed: true }));
  
      // ✅ go back – DietPlanSection will auto‑refresh on focus
      router.back();
  
    } catch (err) {
      console.error('Error marking meal as completed:', err);
      setError('Failed to mark meal as completed');
    }
  };

  /* ------------------------------------------------------------------ */
  /*                              STATES                                */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B81" />
        <Text style={styles.loadingText}>Loading meal details…</Text>
      </SafeAreaView>
    );
  }

  if (error || !meal) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading meal details</Text>
        <Text>{error}</Text>
        <TouchableOpacity style={styles.buttonPrimary} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  /* ------------------------------------------------------------------ */
  /*                             RENDER UI                              */
  /* ------------------------------------------------------------------ */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {meal.name}
        </Text>
        {/* placeholder to balance flex space */}
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Meal Image */}
        <Image
          source={meal.image ? { uri: meal.image } : require('../../assets/images/meal.png')}
          style={styles.mealImage}
          defaultSource={require('../../assets/images/meal.png')}
        />

        {/* Completed badge */}
        {meal.is_completed && (
          <View style={styles.completedBadge}>
            <FontAwesome name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}

        {/* Time range */}
        <View style={styles.timeContainer}>
          <MaterialIcons name="access-time" size={22} color="#FF6B81" />
          <Text style={styles.timeText}>Recommended Time: {meal.time_range}</Text>
        </View>

        {/* Summary */}
        <Text style={styles.description}>{meal.summary || meal.description}</Text>

        {/* Portion size */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Portion Size</Text>
          <Text style={styles.description}>{meal.portion}</Text>
        </View>

        {/* Nutrition */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Nutritional Values</Text>
          <View style={styles.nutritionContainer}>
            {Object.entries(meal.nutritional_values).map(([k, v]) => (
              <View key={k} style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{v}</Text>
                <Text style={styles.nutritionLabel}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Detailed nutrition */}
        {meal.nutrition_details && Object.keys(meal.nutrition_details).length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Detailed Nutrition</Text>
            <View style={styles.detailedNutritionContainer}>
              {Object.entries(meal.nutrition_details).map(([k, v]) => (
                <View
                  key={k}
                  style={[
                    styles.detailedNutritionItem,
                    k === Object.keys(meal.nutrition_details).pop() && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <Text style={styles.detailedNutritionLabel}>{k}</Text>
                  <Text style={styles.detailedNutritionValue}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Ingredients */}
        {meal.ingredients?.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {meal.ingredients.map((ing, idx) => (
              <View key={idx} style={styles.listItem}>
                <View className="bullet" style={styles.bullet} />
                <Text style={styles.listItemText}>{ing}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        {meal.instructions?.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Preparation Steps</Text>
            {meal.instructions.map((step, idx) => (
              <View key={idx} style={styles.listItemNumbered}>
                <Text style={styles.stepNumber}>{idx + 1}</Text>
                <Text style={styles.listItemText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View style={[styles.actionContainer, { paddingBottom: insets.bottom + 10 }]}>
          {!meal.is_completed && (
            <TouchableOpacity style={styles.primaryButton} onPress={markMealCompleted}>
              <Text style={styles.buttonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              /* TODO: add shopping‑list handler */
            }}
          >
            <Text style={styles.secondaryButtonText}>Add Ingredients to Shopping List</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*                               STYLES                               */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  /* ---------- loading / error ---------- */
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, fontWeight: 'bold', color: '#FF6B81', marginBottom: 10 },

  /* ---------- header ---------- */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButton: { padding: 5 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  placeholder: { width: 34 },

  /* ---------- hero image ---------- */
  mealImage: { width: '100%', height: 260, resizeMode: 'cover' },

  /* ---------- completed badge ---------- */
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    position: 'absolute',
    top: 20,
    right: 20,
  },
  completedText: { marginLeft: 5, color: '#4CAF50', fontWeight: 'bold', fontSize: 14 },

  /* ---------- time ---------- */
  timeContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 15 },
  timeText: { marginLeft: 8, fontSize: 14, color: '#666' },

  /* ---------- description ---------- */
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    padding: 20,
    textAlign: 'center',
  },

  /* ---------- sections ---------- */
  sectionContainer: { padding: 20, borderTopWidth: 1, borderTopColor: '#eee' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },

  /* ---------- nutrition ---------- */
  nutritionContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  nutritionItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '30%',
    marginBottom: 10,
  },
  nutritionValue: { fontSize: 16, fontWeight: 'bold', color: '#FF6B81' },
  nutritionLabel: { fontSize: 12, color: '#666', marginTop: 5 },

  /* ---------- detailed nutrition ---------- */
  detailedNutritionContainer: { backgroundColor: '#f8f8f8', borderRadius: 10, padding: 15 },
  detailedNutritionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailedNutritionLabel: { fontSize: 14, color: '#555', flex: 1 },
  detailedNutritionValue: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'right' },

  /* ---------- list bullets / numbers ---------- */
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B81', marginTop: 6, marginRight: 10 },
  listItemNumbered: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B81',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  listItemText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#555' },

  /* ---------- actions ---------- */
  actionContainer: { padding: 20 },
  primaryButton: {
    backgroundColor: '#FF6B81',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B81',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButtonText: { color: '#FF6B81', fontSize: 16, fontWeight: 'bold' },

  /* ---------- fallback button ---------- */
  buttonPrimary: {
    backgroundColor: '#FF6B81',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
});
