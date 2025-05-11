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
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../constants';

const API_BASE_URL = API_URL;

export default function MealDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { mealId, mealName } = params;
  
  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      // Endpoint to fetch meal details - you'll need to implement this in your backend
      const response = await fetch(`${API_BASE_URL}/diet/meal/${mealId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // If API endpoint not available, use mock data for now
          mockMealDetail();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMeal(data.meal);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching meal details:', error);
      setError(error.message);
      setLoading(false);
      // Fallback to mock data if API fails
      mockMealDetail();
    }
  };

  // Mock data for testing before backend is fully implemented
  const mockMealDetail = () => {
    setTimeout(() => {
      const mockData = {
        id: mealId || '1',
        name: mealName || 'Healthy Pakistani Breakfast',
        description: 'A nutritious Pakistani breakfast to start your day',
        image: null, // Will use default image
        time_range: '07:00am - 09:00am',
        nutritional_values: {
          calories: 350,
          protein: '15g',
          carbs: '40g',
          fat: '12g',
          fiber: '5g',
          sodium: '400mg'
        },
        ingredients: [
          'Whole wheat paratha - 1 medium',
          'Desi ghee - 1 tsp',
          'Boiled egg - 1',
          'Yogurt - 1/2 cup',
          'Mint chutney - 1 tbsp'
        ],
        preparation_steps: [
          'Prepare the paratha with whole wheat flour',
          'Cook the paratha with a small amount of ghee',
          'Serve with a boiled egg',
          'Add a side of yogurt with mint chutney'
        ],
        health_benefits: [
          'Whole wheat provides complex carbohydrates and sustained energy',
          'Eggs offer high-quality protein and essential vitamins',
          'Yogurt provides probiotics for gut health',
          'Low in processed ingredients for heart health'
        ],
        suitable_for: ['Heart patients', 'Diabetes with portion control'],
        alternatives: [
          {
            name: 'Vegetarian option',
            description: 'Replace egg with paneer bhurji'
          },
          {
            name: 'Lower carb option',
            description: 'Use almond flour paratha instead of wheat'
          }
        ]
      };
      
      setMeal(mockData);
      setLoading(false);
    }, 800); // Simulate network delay
  };

  const markMealCompleted = async () => {
    try {
      const token = await AsyncStorage.getItem('jwt_token');
      
      if (!token) {
        setError('Authentication token not found');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/diet/meal/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mealId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Update local state
      setMeal({
        ...meal,
        is_completed: true
      });
      
    } catch (error) {
      console.error('Error marking meal as completed:', error);
      setError('Failed to mark meal as completed');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B81" />
        <Text style={styles.loadingText}>Loading meal details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !meal) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading meal details</Text>
        <Text>{error}</Text>
        <TouchableOpacity 
          style={styles.buttonPrimary}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{meal.name}</Text>
        <View style={styles.placeholder}></View>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Meal Image */}
        <Image 
          source={meal.image ? { uri: meal.image } : require('../../assets/images/meal.png')} 
          style={styles.mealImage}
          defaultSource={require('../../assets/images/meal.png')}
        />
        
        {/* Meal Status */}
        {meal.is_completed && (
          <View style={styles.completedBadge}>
            <FontAwesome name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}
        
        {/* Meal Time */}
        <View style={styles.timeContainer}>
          <MaterialIcons name="access-time" size={22} color="#FF6B81" />
          <Text style={styles.timeText}>Recommended Time: {meal.time_range}</Text>
        </View>
        
        {/* Description */}
        <Text style={styles.description}>{meal.description}</Text>
        
        {/* Nutritional Information */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Nutritional Values</Text>
          <View style={styles.nutritionContainer}>
            {Object.entries(meal.nutritional_values).map(([key, value]) => (
              <View key={key} style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{value}</Text>
                <Text style={styles.nutritionLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Ingredients */}
        {meal.ingredients && meal.ingredients.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {meal.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.bullet}></View>
                <Text style={styles.listItemText}>{ingredient}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Preparation Steps */}
        {meal.preparation_steps && meal.preparation_steps.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Preparation Steps</Text>
            {meal.preparation_steps.map((step, index) => (
              <View key={index} style={styles.listItemNumbered}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <Text style={styles.listItemText}>{step}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Health Benefits */}
        {meal.health_benefits && meal.health_benefits.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Health Benefits</Text>
            {meal.health_benefits.map((benefit, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.bullet}></View>
                <Text style={styles.listItemText}>{benefit}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Alternative Options */}
        {meal.alternatives && meal.alternatives.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Alternative Options</Text>
            {meal.alternatives.map((alt, index) => (
              <View key={index} style={styles.alternativeItem}>
                <Text style={styles.alternativeName}>{alt.name}</Text>
                <Text style={styles.alternativeDescription}>{alt.description}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Action buttons */}
        <View style={styles.actionContainer}>
          {!meal.is_completed && (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={markMealCompleted}
            >
              <Text style={styles.buttonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => {/* Add to shopping list functionality */}}
          >
            <Text style={styles.secondaryButtonText}>Add Ingredients to Shopping List</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B81',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 24,
  },
  mealImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
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
  completedText: {
    marginLeft: 5,
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 14,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 15,
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    padding: 20,
    textAlign: 'center',
  },
  sectionContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  nutritionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '30%',
    marginBottom: 10,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B81',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B81',
    marginTop: 6,
    marginRight: 10,
  },
  listItemNumbered: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
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
  listItemText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#555',
  },
  alternativeItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  alternativeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  alternativeDescription: {
    fontSize: 14,
    color: '#555',
  },
  actionContainer: {
    padding: 20,
    paddingBottom: 30,
  },
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#FF6B81',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonPrimary: {
    backgroundColor: '#FF6B81',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
});