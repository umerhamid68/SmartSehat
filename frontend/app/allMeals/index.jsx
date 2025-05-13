import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { API_URL } from '../../constants';

const API_BASE_URL = API_URL;

export default function AllMeals() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekInfo, setWeekInfo] = useState(null);

  useEffect(() => {
    fetchAllMeals();
  }, []);

  const fetchAllMeals = async () => {
    try {
      const token = await AsyncStorage.getItem('jwt_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/diet/all-meals`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDays(data.days);
      setWeekInfo({
        weekStartDate: data.weekStartDate,
        weekEndDate: data.weekEndDate,
        targetCalories: data.targetCalories,
      });
    } catch (error) {
      console.error('Error fetching all meals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllMeals();
  };

  const getMealTypeIcon = (mealType) => {
    const icons = {
      'breakfast': 'coffee',
      'morning_snack': 'apple',
      'lunch': 'cutlery',
      'afternoon_snack': 'lemon-o',
      'dinner': 'glass',
      'supper': 'moon-o'
    };
    return icons[mealType] || 'circle';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B81" />
        <Text style={styles.loadingText}>Loading meal plan...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Weekly Meal Plan</Text>
        {weekInfo && (
          <Text style={styles.weekInfo}>
            {weekInfo.weekStartDate} to {weekInfo.weekEndDate}
          </Text>
        )}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day) => (
          <View key={day.dayNumber} style={styles.dayContainer}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>Day {day.dayNumber}</Text>
              <Text style={styles.dayName}>{day.dayName}</Text>
            </View>

            {day.meals.map((meal) => (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <FontAwesome
                    name={getMealTypeIcon(meal.mealType)}
                    size={20}
                    color="#FF6B81"
                  />
                  <Text style={styles.mealType}>{meal.mealType}</Text>
                  {meal.isCompleted && (
                    <FontAwesome
                      name="check-circle"
                      size={16}
                      color="#4CAF50"
                      style={styles.completedIcon}
                    />
                  )}
                </View>

                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealSummary}>{meal.summary}</Text>
                
                <View style={styles.mealDetails}>
                  <Text style={styles.portion}>Portion: {meal.portion.toFixed(2)}</Text>
                  <Text style={styles.calories}>{meal.calories} kcal</Text>
                </View>

                <View style={styles.macros}>
                  <Text style={styles.macro}>P: {meal.protein}g</Text>
                  <Text style={styles.macro}>C: {meal.carbs}g</Text>
                  <Text style={styles.macro}>F: {meal.fat}g</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  weekInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  scrollContent: {
    paddingBottom: 50, // Add extra space for the bottom navigation
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  dayContainer: {
    backgroundColor: '#fff',
    marginVertical: 5,
    padding: 15,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B81',
  },
  dayName: {
    fontSize: 16,
    color: '#666',
  },
  mealCard: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mealType: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  completedIcon: {
    marginLeft: 'auto',
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  mealSummary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  mealDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  portion: {
    fontSize: 14,
    color: '#555',
  },
  calories: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B81',
  },
  macros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  macro: {
    fontSize: 12,
    color: '#555',
  },
});