// import React from 'react';
// import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
// import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
// import * as ImagePicker from 'expo-image-picker';
// import { useRouter } from 'expo-router';



// export default function Home() {

//   const router = useRouter();  
//   const navigateChatbot = () => {
//     router.push('/chatBot');  
//   };

//   const navigateToFoodScanner = () => {
//     router.push('/foodScanner');
//   };

//   const getCurrentDate = () => {
//     const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
//     const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

//     const date = new Date();
//     const day = daysOfWeek[date.getDay()];
//     const month = months[date.getMonth()];
//     const dateOfMonth = date.getDate();
//     const year = date.getFullYear();

//     return `${day} ${month} ${dateOfMonth}, ${year}`;
//   }

//   const getCurrentTime = () => {
//     const date = new Date();
//     let hours = date.getHours();
//     let minutes = date.getMinutes();
//     const ampm = hours >= 12 ? 'pm' : 'am';

//     hours = hours % 12 || 12;
//     minutes = minutes < 10 ? '0' + minutes : minutes;

//     return `${hours}:${minutes} ${ampm}`;
//   }

//   // const openCamera = async () => {
//   //   const { status } = await ImagePicker.requestCameraPermissionsAsync();
//   //   if (status !== 'granted') {
//   //     Alert.alert('Camera access denied', 'Please grant camera access to take pictures.');
//   //     return;
//   //   }
  
//   //   const result = await ImagePicker.launchCameraAsync({
//   //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
//   //     allowsEditing: false,
//   //     quality: 1,
//   //   });
  
//   //   if (!result.canceled && result.assets && result.assets.length > 0) {
//   //     const imageUri = result.assets[0].uri;
//   //     if (imageUri) {
//   //       console.log('Image URI:', imageUri);
//   //     } else {
//   //       console.log('Error: Image URI is undefined.');
//   //     }
//   //   } else if (result.canceled) {
//   //     console.log('Camera operation was cancelled.');
//   //   } else {
//   //     console.log('Error: No image assets found.');
//   //   }
//   // };
  

//   return (
//     <View style={styles.container}>
//       <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
//         {/* Header Section */}
//         <View style={styles.header}>
//           <Text style={styles.greeting}>Hey, Umer!</Text>
//           <TouchableOpacity style={styles.scanButton} onPress={navigateToFoodScanner}>
//             <Text style={styles.scanButtonText}>Scan Now</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Date and Time Section */}
//         <View style={styles.dateTimeContainer}>
//           <View style={styles.dateContainer}>
//             <FontAwesome name="calendar" size={24} color="#FF6B81" />
//             <Text style={styles.dateText}>{getCurrentDate()}</Text>
//           </View>
//           <View style={styles.timeContainer}>
//             <MaterialIcons name="access-time" size={24} color="#FF6B81" />
//             <Text style={styles.timeText}>{getCurrentTime()}</Text>
//           </View>
//         </View>

//         {/* Daily Report Section */}
//         <View style={styles.reportContainer}>
//           <Text style={styles.sectionTitle}>Daily Report</Text>
//           <Text style={styles.viewAll}>View All</Text>
//         </View>
//         <View style={styles.reportCards}>
//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>Blood Pressure</Text>
//             <Text style={styles.cardValue}>130 / 80</Text>
//             <Text style={styles.cardSubtitle}>Normal</Text>
//             <Text style={styles.cardTime}>08:00am - 10:00am</Text>
//           </View>
//           <View style={styles.card}>
//             <Text style={styles.cardTitle}>Sugar</Text>
//             <Text style={styles.cardValue}>100</Text>
//             <Text style={styles.cardSubtitle}>Normal</Text>
//             <Text style={styles.cardTime}>08:00am - 10:30am</Text>
//           </View>
//         </View>

//         {/* Diet Plan Section */}
//         <Text style={styles.sectionTitle}>Today's Diet Plans</Text>
//         <View style={styles.dietPlanContainer}>
//           <View style={styles.dietPlanOptions}>
//             <TouchableOpacity style={[styles.dietPlanButton, styles.active]}>
//               <Text style={styles.dietPlanText}>Morning</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.dietPlanButton}>
//               <Text style={styles.dietPlanText}>Evening</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.dietPlanButton}>
//               <Text style={styles.dietPlanText}>Night</Text>
//             </TouchableOpacity>
//           </View>
//           <View style={styles.dietPlanCard}>
//             <Image source={require('./../assets/images/sandwich.png')} style={styles.foodImage} />
//             <Text style={styles.dietDescription}>One Sandwich with Half Boiled Egg</Text>
//             <Text style={styles.dietTime}>Around: 08:00am - 11:00am</Text>
//             <TouchableOpacity style={styles.doneButton}>
//               <Text style={styles.doneButtonText}>View Details</Text>
//             </TouchableOpacity>
//           </View>
//           <View style={styles.dietPlanCard}>
//             <Image source={require('./../assets/images/sandwich.png')} style={styles.foodImage} />
//             <Text style={styles.dietDescription}>One Sandwich with Half Boiled Egg</Text>
//             <Text style={styles.dietTime}>Around: 08:00am - 11:00am</Text>
//             <TouchableOpacity style={styles.doneButton}>
//               <Text style={styles.doneButtonText}>View Details</Text>
//             </TouchableOpacity>
//           </View>
//           <View style={styles.dietPlanCard}>
//             <Image source={require('./../assets/images/sandwich.png')} style={styles.foodImage} />
//             <Text style={styles.dietDescription}>One Sandwich with Half Boiled Egg</Text>
//             <Text style={styles.dietTime}>Around: 08:00am - 11:00am</Text>
//             <TouchableOpacity style={styles.doneButton}>
//               <Text style={styles.doneButtonText}>View Details</Text>
//             </TouchableOpacity>
//           </View>
//           <View style={styles.dietPlanCard}>
//             <Image source={require('./../assets/images/sandwich.png')} style={styles.foodImage} />
//             <Text style={styles.dietDescription}>One Sandwich with Half Boiled Egg</Text>
//             <Text style={styles.dietTime}>Around: 08:00am - 11:00am</Text>
//             <TouchableOpacity style={styles.doneButton}>
//               <Text style={styles.doneButtonText}>View Details</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </ScrollView>

//       {/* Bottom Navigation */}
//       {/* <View style={styles.bottomNav}>
//         <TouchableOpacity>
//           <FontAwesome name="home" size={30} color="#FF6B81" />
//         </TouchableOpacity>
//         <TouchableOpacity>
//           <FontAwesome name="search" size={30} color="#666" />
//         </TouchableOpacity>
//         <TouchableOpacity>
//           <FontAwesome name="comments" size={30} color="#666" />
//         </TouchableOpacity>
//         <TouchableOpacity onPress={navigateChatbot}>
//           <FontAwesome name="envelope" size={30} color="#666" />
//         </TouchableOpacity>
//         <TouchableOpacity>
//           <FontAwesome name="user" size={30} color="#666" />
//         </TouchableOpacity>
//       </View> */}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'white',
//     paddingHorizontal: 20,
//     paddingVertical: 40,
//   },
//   scrollViewContent: {
//     paddingBottom: 40,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginTop: 20,
//   },
//   greeting: {
//     fontSize: 24,
//     fontWeight: 'bold',
//   },
//   scanButton: {
//     backgroundColor: '#FF6B81',
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//   },
//   scanButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   dateTimeContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginVertical: 20,
//   },
//   dateContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   dateText: {
//     marginLeft: 10,
//     fontSize: 16,
//   },
//   timeContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   timeText: {
//     marginLeft: 10,
//     fontSize: 16,
//   },
//   reportContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   viewAll: {
//     color: '#FF6B81',
//     fontSize: 16,
//   },
//   reportCards: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginVertical: 20,
//   },
//   card: {
//     backgroundColor: '#F7CAC9',
//     padding: 20,
//     borderRadius: 10,
//     width: '48%',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 5,
//     elevation: 3,
//   },
//   cardTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   cardValue: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     marginVertical: 5,
//   },
//   cardSubtitle: {
//     color: '#999',
//   },
//   cardTime: {
//     color: '#999',
//     marginTop: 10,
//   },
//   dietPlanContainer: {
//     marginVertical: 20,
//   },
//   dietPlanOptions: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 10,
//   },
//   dietPlanButton: {
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 20,
//     backgroundColor: '#E5E5E5',
//   },
//   active: {
//     backgroundColor: '#FF6B81',
//   },
//   dietPlanText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   dietPlanCard: {
//     backgroundColor: '#fff',
//     borderRadius: 10,
//     padding: 20,
//     alignItems: 'center',
//   },
//   foodImage: {
//     width: 345,
//     height: 170,
//     marginBottom: 10,
//     borderRadius: 10,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.8,
//     shadowRadius: 2,
//     elevation: 5,
//   },
//   dietDescription: {
//     fontSize: 16,
//     textAlign: 'center',
//     fontWeight: 'bold',
//   },
//   dietTime: {
//     color: '#999',
//     marginTop: 5,
//   },
//   doneButton: {
//     marginTop: 10,
//     backgroundColor: '#FF6B81',
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 20,
//   },
//   doneButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   bottomNav: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     alignItems: 'center',
//     paddingVertical: 0,
//     backgroundColor: '#fff',
//     borderTopWidth: 1,
//     borderColor: '#E5E5E5',
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     width: '112%',
//     height: 70,
//   },
// });

































































































import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.106:5000/api';

export default function Home() {
  const router = useRouter();
  
  const [userName, setUserName] = useState('Umer');
  const [dietPlans, setDietPlans] = useState({
    morning: [],
    evening: [],
    night: []
  });
  const [selectedMealTime, setSelectedMealTime] = useState('morning');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user info and fetch diet plans when component mounts
    getUserInfo();
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

  const getUserInfo = async () => {
    try {
      const userInfo = await AsyncStorage.getItem('user_info');
      if (userInfo) {
        const parsedInfo = JSON.parse(userInfo);
        if (parsedInfo.name) {
          setUserName(parsedInfo.name.split(' ')[0]);
        }
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
  };

  const fetchDietPlans = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwt_token');
      
      if (!token) {
        console.log('No auth token found');
        setDietPlans(getSampleDietPlans());
        setLoading(false);
        return;
      }
  
      console.log('Fetching diet plans...');
      
      // Updated URL to match backend route structure
      const response = await fetch(`${API_BASE_URL}/diet/plans`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.status === 404) {
        console.log('Diet plans endpoint not found. Using sample data.');
        setDietPlans(getSampleDietPlans());
        return;
      }
      
      const responseText = await response.text();
      console.log('Response preview:', responseText.substring(0, 100));
      
      try {
        const data = JSON.parse(responseText);
        if (data.plans) {
          console.log('Diet plans loaded successfully');
          setDietPlans(data.plans);
        } else {
          console.log('Unexpected response format:', data);
          setDietPlans(getSampleDietPlans());
        }
      } catch (jsonError) {
        console.error('JSON parsing failed:', jsonError);
        setDietPlans(getSampleDietPlans());
      }
    } catch (error) {
      console.error('Error fetching diet plans:', error);
      setDietPlans(getSampleDietPlans());
    } finally {
      setLoading(false);
    }
  };

  
  // Provide sample data for fallback
  const getSampleDietPlans = () => {
    return {
      morning: [
        {
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
          is_completed: false
        },
        {
          id: 2,
          name: "Vegetable Oatmeal Bowl",
          description: "Oatmeal with Mixed Vegetables and Herbs",
          image: null,
          time_range: "07:00am - 09:00am",
          is_completed: false
        }
      ],
      evening: [
        {
          id: 3,
          name: "Grilled Chicken Salad",
          description: "Grilled Chicken with Fresh Vegetables",
          image: null,
          time_range: "01:00pm - 03:00pm",
          is_completed: false
        }
      ],
      night: [
        {
          id: 4,
          name: "Steamed Fish with Vegetables",
          description: "Lightly Seasoned Steamed Fish with Seasonal Vegetables",
          image: null,
          time_range: "07:00pm - 09:00pm",
          is_completed: false
        }
      ]
    };
  };

  const navigateChatbot = () => {
    router.push('/chatBot');  
  };

  const navigateToFoodScanner = () => {
    router.push('/foodScanner');
  };
  
  const navigateToDietDetails = (planId) => {
    router.push(`/dietPlanDetail?planId=${planId}`);
  };

  const getCurrentDate = () => {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const date = new Date();
    const day = daysOfWeek[date.getDay()];
    const month = months[date.getMonth()];
    const dateOfMonth = date.getDate();
    const year = date.getFullYear();

    return `${day} ${month} ${dateOfMonth}, ${year}`;
  }

  const getCurrentTime = () => {
    const date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12 || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    return `${hours}:${minutes} ${ampm}`;
  }

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

    return plans.map((plan, index) => (
      <View key={plan.id || index} style={styles.dietPlanCard}>
        <Image 
          source={
            plan.image 
              ? { uri: `${API_BASE_URL}/images/${plan.image}` } 
              : require('./../assets/images/sandwich.png')
          }
          style={styles.foodImage}
          defaultSource={require('./../assets/images/sandwich.png')}
        />
        <Text style={styles.dietTitle}>{plan.name}</Text>
        <Text style={styles.dietDescription}>{plan.description}</Text>
        <Text style={styles.dietTime}>Around: {plan.time_range}</Text>
        
        {plan.is_completed && (
          <View style={styles.completedBadge}>
            <FontAwesome name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={() => navigateToDietDetails(plan.id)}
        >
          <Text style={styles.doneButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hey, {userName}!</Text>
          <TouchableOpacity style={styles.scanButton} onPress={navigateToFoodScanner}>
            <Text style={styles.scanButtonText}>Scan Now</Text>
          </TouchableOpacity>
        </View>

        {/* Date and Time Section */}
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateContainer}>
            <FontAwesome name="calendar" size={24} color="#FF6B81" />
            <Text style={styles.dateText}>{getCurrentDate()}</Text>
          </View>
          <View style={styles.timeContainer}>
            <MaterialIcons name="access-time" size={24} color="#FF6B81" />
            <Text style={styles.timeText}>{getCurrentTime()}</Text>
          </View>
        </View>

        {/* Daily Report Section */}
        <View style={styles.reportContainer}>
          <Text style={styles.sectionTitle}>Daily Report</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reportCards}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Blood Pressure</Text>
            <Text style={styles.cardValue}>130 / 80</Text>
            <Text style={styles.cardSubtitle}>Normal</Text>
            <Text style={styles.cardTime}>08:00am - 10:00am</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sugar</Text>
            <Text style={styles.cardValue}>100</Text>
            <Text style={styles.cardSubtitle}>Normal</Text>
            <Text style={styles.cardTime}>08:00am - 10:30am</Text>
          </View>
        </View>

        {/* Diet Plan Section */}
        <View style={styles.dietHeader}>
          <Text style={styles.sectionTitle}>Today's Diet Plans</Text>
          <TouchableOpacity onPress={() => router.push('/allDietPlans')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.dietPlanContainer}>
          {/* Diet Plan Options/Tabs */}
          <View style={styles.dietPlanOptions}>
            <TouchableOpacity 
              style={[styles.dietPlanButton, selectedMealTime === 'morning' && styles.active]}
              onPress={() => setSelectedMealTime('morning')}
            >
              <Text style={[styles.dietPlanText, selectedMealTime === 'morning' ? styles.activeText : {}]}>
                Morning
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.dietPlanButton, selectedMealTime === 'evening' && styles.active]}
              onPress={() => setSelectedMealTime('evening')}
            >
              <Text style={[styles.dietPlanText, selectedMealTime === 'evening' ? styles.activeText : {}]}>
                Evening
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.dietPlanButton, selectedMealTime === 'night' && styles.active]}
              onPress={() => setSelectedMealTime('night')}
            >
              <Text style={[styles.dietPlanText, selectedMealTime === 'night' ? styles.activeText : {}]}>
                Night
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Dynamic Diet Plan Cards */}
          {renderDietPlans()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scanButton: {
    backgroundColor: '#FF6B81',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 10,
    fontSize: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 10,
    fontSize: 16,
  },
  reportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dietHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAll: {
    color: '#FF6B81',
    fontSize: 16,
  },
  reportCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  card: {
    backgroundColor: '#F7CAC9',
    padding: 20,
    borderRadius: 10,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  cardSubtitle: {
    color: '#999',
  },
  cardTime: {
    color: '#999',
    marginTop: 10,
  },
  dietPlanContainer: {
    marginVertical: 15,
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
  },
  dietPlanCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  foodImage: {
    width: '100%',
    height: 170,
    marginBottom: 15,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  dietTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  dietDescription: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    color: '#555',
  },
  dietTime: {
    color: '#999',
    marginTop: 8,
    marginBottom: 10,
  },
  doneButton: {
    marginTop: 12,
    backgroundColor: '#FF6B81',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginVertical: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
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
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginVertical: 8,
  },
  completedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
});