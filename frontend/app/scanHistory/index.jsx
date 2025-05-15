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
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { API_URL } from '../../constants';

const API_BASE_URL = API_URL;

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchScanHistory();
  }, []);

  const fetchScanHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('jwt_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/scan/history`, {
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
      setScans(data.scans);
    } catch (error) {
      console.error('Error fetching scan history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchScanHistory();
  };

  const getScanIcon = (type) => {
    const icons = {
      'meal': 'cutlery',
      'ingredients': 'list',
      'nutrition': 'info-circle',
      'product': 'barcode',
      'error': 'exclamation-triangle',
      'unknown': 'question-circle'
    };
    return icons[type] || 'question-circle';
  };

  const getScanColor = (type) => {
    const colors = {
      'meal': '#4CAF50',
      'ingredients': '#2196F3',
      'nutrition': '#FF9800',
      'product': '#9C27B0',
      'error': '#F44336',
      'unknown': '#666'
    };
    return colors[type] || '#666';
  };

  const getSafetyColor = (rating) => {
    return rating === 'safe' ? '#4CAF50' : '#F44336';
  };

  const renderScanDetails = (scan) => {
    switch (scan.type) {
      case 'meal':
        return (
          <View>
            <Text style={styles.detailText}>
              Meal: {scan.details.mealName}
            </Text>
            {scan.details.safetyRating && (
              <View style={styles.safetyBadge}>
                <Text style={[
                  styles.safetyText,
                  { color: getSafetyColor(scan.details.safetyRating) }
                ]}>
                  {scan.details.safetyRating.toUpperCase()}
                </Text>
                {scan.details.safetyScore && (
                  <Text style={styles.safetyScore}>
                    Score: {scan.details.safetyScore}/10
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      
      case 'ingredients':
        return (
          <View>
            <Text style={styles.detailText}>
              Total Ingredients: {scan.details.count}
            </Text>
            {scan.details.sample.length > 0 && (
              <Text style={styles.sampleText}>
                Sample: {scan.details.sample.join(', ')}
                {scan.details.count > 3 && '...'}
              </Text>
            )}
          </View>
        );
      
      case 'nutrition':
        return (
          <View>
            <Text style={styles.detailText}>
              Calories: {scan.details.calories}
            </Text>
            <Text style={styles.detailText}>
              Serving: {scan.details.servingSize}
            </Text>
            {scan.details.totalFat && (
              <Text style={styles.detailText}>
                Total Fat: {scan.details.totalFat}
              </Text>
            )}
          </View>
        );
      
      case 'product':
        return (
          <View>
            <Text style={styles.detailText}>
              Product: {scan.details.productName}
            </Text>
            {scan.details.ingredientCount > 0 && (
              <Text style={styles.detailText}>
                Ingredients: {scan.details.ingredientCount}
              </Text>
            )}
            {scan.details.calories !== 'N/A' && (
              <Text style={styles.detailText}>
                Calories: {scan.details.calories}
              </Text>
            )}
            {scan.details.safetyRating && (
              <View style={styles.safetyBadge}>
                <Text style={[
                  styles.safetyText,
                  { color: getSafetyColor(scan.details.safetyRating) }
                ]}>
                  {scan.details.safetyRating.toUpperCase()}
                </Text>
                {scan.details.safetyScore && (
                  <Text style={styles.safetyScore}>
                    Score: {scan.details.safetyScore}/10
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      
      case 'error':
        return (
          <Text style={styles.errorText}>
            {scan.details.errorMessage}
          </Text>
        );
      
      case 'unknown':
        return (
          <Text style={styles.detailText}>
            Unknown scan type
          </Text>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B81" />
        <Text style={styles.loadingText}>Loading scan history...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan History</Text>
        <Text style={styles.scanCount}>{scans.length} scans</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {scans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="camera" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No scans yet</Text>
            <Text style={styles.emptySubtext}>
              Start scanning food items to see them here
            </Text>
          </View>
        ) : (
          scans.map((scan) => (
            <TouchableOpacity
              key={scan.scanId}
              style={[
                styles.scanCard,
                scan.hasError && styles.errorCard
              ]}
              activeOpacity={0.8}
            >
              <View style={[
                styles.iconContainer,
                { backgroundColor: getScanColor(scan.type) }
              ]}>
                <FontAwesome name={getScanIcon(scan.type)} size={24} color="#fff" />
              </View>

              <View style={styles.scanInfo}>
                <View style={styles.scanHeader}>
                  <Text style={[
                    styles.scanTitle,
                    scan.hasError && styles.errorTitle
                  ]}>
                    {scan.title}
                  </Text>
                  <Text style={styles.scanDate}>{scan.scanDate}</Text>
                </View>

                <Text style={[
                  styles.scanType,
                  { color: getScanColor(scan.type) }
                ]}>
                  {scan.type.toUpperCase()}
                </Text>

                {renderScanDetails(scan)}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    scrollContent: {
        paddingBottom: 70, // Add extra space for the bottom navigation
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
  scanCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scanCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: '#ffebee',
    backgroundColor: '#fff5f5',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  scanInfo: {
    flex: 1,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  errorTitle: {
    color: '#d32f2f',
  },
  scanDate: {
    fontSize: 12,
    color: '#999',
  },
  scanType: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    fontStyle: 'italic',
  },
  sampleText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  safetyText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
  },
  safetyScore: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
});