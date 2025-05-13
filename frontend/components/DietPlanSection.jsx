import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { API_URL } from '../constants';
import { useFocusEffect } from '@react-navigation/native';

// API URL - update with your actual backend URL
const API_BASE_URL = API_URL;

const DietPlanSection = () => {
  const router = useRouter();
  const [dietPlans, setDietPlans] = useState({
    morning: [],
    evening: [],
    night: []
  });
  const [selectedMealTime, setSelectedMealTime] = useState('morning');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDietPlans();
    
    // Set initial meal time based on current time
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) {
      setSelectedMealTime('morning');
    } else if (currentHour >= 12 && currentHour < 18) {
      setSelectedMealTime('evening');
    } else {
      setSelectedMealTime('night');
    }
  }, []);
 
  useFocusEffect(
    useCallback(() => {
      fetchDietPlans();
    }, [])
  );
  

  const fetchDietPlans = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwt_token');
      
      if (!token) {
        console.log('No auth token found');
        setLoading(false);
        return;
      }
  
      console.log('Fetching diet plans...');
      
      const response = await fetch(`${API_BASE_URL}/diet/plans`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No diet plans found. Generating new plan...');
          await generateNewDietPlan(token);
          return;
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      
      if (data.plans) {
        console.log('Diet plans loaded successfully');
        setDietPlans(data.plans);
      } else {
        console.log('No diet plans data found');
      }
    } catch (error) {
      console.error('Error fetching diet plans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateNewDietPlan = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/diet/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.plan) {
        console.log('New diet plan generated successfully');
        setDietPlans(data.plan);
      } else {
        console.log('Failed to generate diet plan');
      }
    } catch (error) {
      console.error('Error generating diet plan:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markMealCompleted = async (mealId) => {
    try {
      const token = await AsyncStorage.getItem('jwt_token');
      
      if (!token) {
        console.log('No auth token found');
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
      
      // Update local state to mark meal as completed
      const updatedPlans = { ...dietPlans };
      const timeCategory = ['morning', 'evening', 'night'].find(category => 
        updatedPlans[category].some(meal => meal.id === mealId)
      );
      
      if (timeCategory) {
        updatedPlans[timeCategory] = updatedPlans[timeCategory].map(meal => 
          meal.id === mealId ? { ...meal, is_completed: true } : meal
        );
        setDietPlans(updatedPlans);
      }
      
    } catch (error) {
      console.error('Error marking meal as completed:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDietPlans();
  };

  const viewMealDetails = (meal) => {
    router.push({
      pathname: '/mealDetail',
      params: { mealId: meal.id, mealName: meal.name }
    });
  };

  const renderDietPlans = () => {
    const plans = dietPlans[selectedMealTime] || [];

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B81" />
          <Text style={styles.loadingText}>Loading diet plans...</Text>
        </View>
      );
    }

    if (plans.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No diet plans for {selectedMealTime}</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchDietPlans}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return plans.map((meal, index) => (
      <View key={meal.id || index} style={styles.dietPlanCard}>
        <Image 
          source={meal.image ? { uri: meal.image } : require('./../assets/images/meal.png')}
          style={styles.foodImage}
          defaultSource={require('./../assets/images/meal.png')}
        />
        <Text style={styles.dietTitle}>{meal.name}</Text>
        <Text style={styles.dietDescription}>{meal.description}</Text>
        <Text style={styles.dietTime}>Around: {meal.time_range}</Text>
        
        {meal.is_completed && (
          <View style={styles.completedBadge}>
            <FontAwesome name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => viewMealDetails(meal)}
          >
            <Text style={styles.buttonText}>View Details</Text>
          </TouchableOpacity>
          
          {!meal.is_completed && (
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={() => markMealCompleted(meal.id)}
            >
              <Text style={styles.buttonText}>Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Today's Diet Plans</Text>
        <TouchableOpacity onPress={() => router.push('/allDietPlans')}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.dietPlanOptions}>
        <TouchableOpacity 
          style={[styles.dietPlanButton, selectedMealTime === 'morning' && styles.active]}
          onPress={() => setSelectedMealTime('morning')}
        >
          <Text style={selectedMealTime === 'morning' ? styles.activeText : styles.dietPlanText}>
            Morning
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.dietPlanButton, selectedMealTime === 'evening' && styles.active]}
          onPress={() => setSelectedMealTime('evening')}
        >
          <Text style={selectedMealTime === 'evening' ? styles.activeText : styles.dietPlanText}>
            Evening
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.dietPlanButton, selectedMealTime === 'night' && styles.active]}
          onPress={() => setSelectedMealTime('night')}
        >
          <Text style={selectedMealTime === 'night' ? styles.activeText : styles.dietPlanText}>
            Night
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B81']}
          />
        }
      >
        {renderDietPlans()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAll: {
    color: '#FF6B81',
    fontSize: 14,
  },
  dietPlanOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dietPlanButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    minWidth: '30%',
    alignItems: 'center',
  },
  active: {
    backgroundColor: '#FF6B81',
  },
  dietPlanText: {
    color: '#666',
    fontWeight: 'bold',
  },
  activeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dietPlanCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  foodImage: {
    width: '100%',
    height: 170,
    borderRadius: 10,
    marginBottom: 15,
  },
  dietTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  dietDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dietTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  completedText: {
    marginLeft: 5,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewButton: {
    backgroundColor: '#6200EE',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  doneButton: {
    backgroundColor: '#FF6B81',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  emptyText: {
    marginBottom: 15,
    color: '#666',
  },
  refreshButton: {
    backgroundColor: '#FF6B81',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default DietPlanSection;