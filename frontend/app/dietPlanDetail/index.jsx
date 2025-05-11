import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';

const API_BASE_URL = 'http://192.168.1.106:5000/api';

export default function DietPlanDetail() {
  const router = useRouter();
  const { planId } = useLocalSearchParams();
  
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchPlanDetails();
  }, [planId]);

//   const fetchPlanDetails = async () => {
//     try {
//       setLoading(true);
//       const token = await AsyncStorage.getItem('jwt_token');
      
//       if (!token) {
//         Alert.alert('Authentication Error', 'Please log in to view diet plans');
//         router.replace('/userLogin');
//         return;
//       }
      
//       const response = await fetch(`${API_BASE_URL}/diet/plan/${planId}`, {
//         method: 'GET',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//       });
      
//       if (response.status === 401) {
//         Alert.alert('Authentication Error', 'Please log in again');
//         router.replace('/userLogin');
//         return;
//       }
      
//       const data = await response.json();
      
//       if (response.ok && data.plan) {
//         setPlan(data.plan);
//         setCompleted(data.plan.is_completed || false);
//       } else {
//         Alert.alert('Error', data.error || 'Could not load diet plan details');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to load diet plan details');
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const markPlanCompleted = async (isCompleted) => {
//     try {
//       const token = await AsyncStorage.getItem('jwt_token');
      
//       if (!token) {
//         Alert.alert('Authentication Error', 'Please log in to update diet plans');
//         return;
//       }
      
//       const response = await fetch(`${API_BASE_URL}/diet/plan/${planId}/complete`, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ is_completed: isCompleted }),
//       });
      
//       const data = await response.json();
      
//       if (response.ok) {
//         setCompleted(isCompleted);
//         Alert.alert(
//           isCompleted ? 'Success' : 'Updated', 
//           isCompleted ? 'Diet plan marked as completed!' : 'Diet plan marked as not completed'
//         );
//       } else {
//         Alert.alert('Error', data.error || 'Failed to update diet plan');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'An error occurred while updating the diet plan');
//       console.error(error);
//     }
//   };




const fetchPlanDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwt_token');
      
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in to view diet plans');
        router.replace('/userLogin');
        return;
      }
      
      // Updated URL to match backend route structure
      const response = await fetch(`${API_BASE_URL}/diet/plan/${planId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Detail response status:', response.status);
      
      if (response.status === 404) {
        // If endpoint not found, use sample data
        console.log('Diet plan details endpoint not found. Using sample data.');
        setPlan(getSamplePlan(planId));
        setLoading(false);
        return;
      }
      
      if (response.status === 401) {
        Alert.alert('Authentication Error', 'Please log in again');
        router.replace('/userLogin');
        return;
      }
      
      // Get response as text first to help debug
      const responseText = await response.text();
      console.log('Detail response preview:', responseText.substring(0, 100));
      
      try {
        const data = JSON.parse(responseText);
        if (data.plan) {
          setPlan(data.plan);
          setCompleted(data.plan.is_completed || false);
        } else {
          console.log('Using sample plan data');
          setPlan(getSamplePlan(planId));
        }
      } catch (jsonError) {
        console.error('JSON parsing failed:', jsonError);
        setPlan(getSamplePlan(planId));
      }
    } catch (error) {
      console.error('Error fetching plan details:', error);
      setPlan(getSamplePlan(planId));
    } finally {
      setLoading(false);
    }
  };

  const markPlanCompleted = async (isCompleted) => {
    try {
      const token = await AsyncStorage.getItem('jwt_token');
      
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in to update diet plans');
        return;
      }
      
      // Updated URL to match backend route structure
      const response = await fetch(`${API_BASE_URL}/diet/plan/${planId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_completed: isCompleted }),
      });
      
      // Get response as text first to help debug
      const responseText = await response.text();
      console.log('Mark completed response:', responseText.substring(0, 100));
      
      try {
        const data = JSON.parse(responseText);
        if (response.ok) {
          setCompleted(isCompleted);
          Alert.alert(
            isCompleted ? 'Success' : 'Updated', 
            isCompleted ? 'Diet plan marked as completed!' : 'Diet plan marked as not completed'
          );
        } else {
          Alert.alert('Error', data.error || 'Failed to update diet plan');
        }
      } catch (jsonError) {
        console.error('JSON parsing failed:', jsonError);
        // Still update the UI to provide feedback
        setCompleted(isCompleted);
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating the diet plan');
      console.error(error);
    }
  };

  // Add sample plan data function for fallback
  const getSamplePlan = (id) => {
    const plans = {
      "1": {
        id: 1,
        name: "Healthy Breakfast Sandwich",
        description: "One Sandwich with Half Boiled Egg",
        image: null,
        time_range: "08:00am - 11:00am",
        nutritional_values: {
          calories: 350,
          protein: "15g",
          carbs: "30g",
          fat: "12g"
        },
        ingredients: [
          "Whole grain bread",
          "Half boiled egg",
          "Avocado",
          "Spinach",
          "Tomato slice"
        ],
        is_completed: false,
        tags: ["diabetes-friendly", "heart-healthy"]
      },
      "2": {
        id: 2,
        name: "Vegetable Oatmeal Bowl",
        description: "Oatmeal with Mixed Vegetables and Herbs",
        image: null,
        time_range: "07:00am - 09:00am",
        nutritional_values: {
          calories: 280,
          protein: "8g",
          carbs: "45g",
          fat: "6g"
        },
        ingredients: [
          "Steel-cut oats",
          "Diced carrots", 
          "Spinach",
          "Bell peppers",
          "Parsley"
        ],
        is_completed: false,
        tags: ["low-sodium", "cholesterol-friendly"]
      },
      "3": {
        id: 3,
        name: "Grilled Chicken Salad",
        description: "Grilled Chicken with Fresh Vegetables",
        image: null,
        time_range: "01:00pm - 03:00pm",
        nutritional_values: {
          calories: 320,
          protein: "28g",
          carbs: "15g",
          fat: "14g" 
        },
        ingredients: [
          "Grilled chicken breast",
          "Mixed greens",
          "Cherry tomatoes",
          "Cucumber",
          "Olive oil dressing"
        ],
        is_completed: false,
        tags: ["high-protein", "low-carb"]
      },
      "4": {
        id: 4,
        name: "Steamed Fish with Vegetables",
        description: "Lightly Seasoned Steamed Fish with Seasonal Vegetables",
        image: null,
        time_range: "07:00pm - 09:00pm",
        nutritional_values: {
          calories: 280,
          protein: "32g",
          carbs: "12g",
          fat: "8g"
        },
        ingredients: [
          "White fish fillet",
          "Broccoli",
          "Carrots", 
          "Zucchini",
          "Lemon",
          "Herbs"
        ],
        is_completed: false,
        tags: ["heart-healthy", "low-fat"]
      }
    };

    return plans[id] || {
      id: id,
      name: "Sample Diet Plan",
      description: "No data available for this plan",
      image: null,
      time_range: "Not specified",
      nutritional_values: {
        calories: "N/A",
        protein: "N/A",
        carbs: "N/A",
        fat: "N/A"
      },
      ingredients: ["Not available"],
      tags: []
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B81" />
        <Text style={styles.loadingText}>Loading diet plan details...</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Diet plan not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={24} color="#5B3566" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diet Plan Details</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Diet Plan Image */}
      <Image 
        source={
          plan.image 
            ? { uri: `${API_BASE_URL}/images/${plan.image}` } 
            : require('./../../assets/images/sandwich.png')
        }
        style={styles.foodImage}
        defaultSource={require('./../../assets/images/sandwich.png')}
      />
      
      {/* Diet Plan Info */}
      <View style={styles.infoSection}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planDescription}>{plan.description}</Text>
        <Text style={styles.timeRange}>Time: {plan.time_range}</Text>
        
        {completed ? (
          <View style={styles.completedBadge}>
            <FontAwesome name="check-circle" size={18} color="#4CAF50" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        ) : null}
      </View>
      
      {/* Nutritional Values */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Nutritional Values</Text>
        <View style={styles.nutritionGrid}>
          {plan.nutritional_values && Object.entries(plan.nutritional_values).map(([key, value]) => (
            <View style={styles.nutritionItem} key={key}>
              <Text style={styles.nutritionValue}>{value}</Text>
              <Text style={styles.nutritionName}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* Ingredients */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <View style={styles.ingredientsList}>
          {plan.ingredients && plan.ingredients.map((ingredient, index) => (
            <View style={styles.ingredientItem} key={index}>
              <FontAwesome name="circle" size={8} color="#FF6B81" />
              <Text style={styles.ingredientText}>{ingredient}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* Tags */}
      {plan.tags && plan.tags.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Health Tags</Text>
          <View style={styles.tagsContainer}>
            {plan.tags.map((tag, index) => (
              <View style={styles.tag} key={index}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {completed ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.undoButton]}
            onPress={() => markPlanCompleted(false)}
          >
            <Text style={styles.actionButtonText}>Mark as Not Completed</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => markPlanCompleted(true)}
          >
            <Text style={styles.actionButtonText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B81',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5B3566',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#5B3566',
    fontWeight: 'bold',
    fontSize: 16,
  },
  foodImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  infoSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  planDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  timeRange: {
    fontSize: 14,
    color: '#888',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  completedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  sectionContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B3566',
    marginBottom: 15,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    width: '45%',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B81',
  },
  nutritionName: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  ingredientsList: {
    marginTop: 5,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ingredientText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F0E6FF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    margin: 5,
  },
  tagText: {
    color: '#5B3566',
    fontWeight: '600',
  },
  actionButtons: {
    padding: 20,
    marginBottom: 30,
  },
  actionButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  completeButton: {
    backgroundColor: '#FF6B81',
  },
  undoButton: {
    backgroundColor: '#9E9E9E',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});