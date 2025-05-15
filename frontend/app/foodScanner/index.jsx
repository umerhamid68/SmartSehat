
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RecipeSelector from '../RecipeSelector';
import { API_URL } from '../../constants';

const API_BASE_URL = API_URL;

export default function FoodScanner() {
  const router = useRouter();

  const [scanChoiceModalVisible, setScanChoiceModalVisible] = useState(false);
  const [scanType, setScanType] = useState(null); // 'meal' or 'product'
  const [uri, setUri] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [serverResponse, setServerResponse] = useState(null);
  const [formModalVisible, setFormModalVisible] = useState(false);

  const [mealName, setMealName] = useState('');
  const [productName, setProductName] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [nutritionText, setNutritionText] = useState(''); // Editable nutritional info
  const [caloriesOrEnergy, setCaloriesOrEnergy] = useState(''); // Separate field for Calories/Energy
  const [details, setDetails] = useState('');
  const [scanId, setScanId] = useState(null);

  const [formErrors, setFormErrors] = useState({});

  // Add this new state variable in your component
  const [similarRecipes, setSimilarRecipes] = useState([]);
  const [recipeSelectionModalVisible, setRecipeSelectionModalVisible] = useState(false);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(-1);

  // Validate form based on scan type
  const validateForm = () => {
    const errors = {};
    
    if (scanType === 'meal') {
      if (!mealName.trim()) {
        errors.mealName = 'Meal name is required';
      }
    } else {
      if (!productName.trim()) {
        errors.productName = 'Product name is required';
      }
      if (!ingredientsText.trim()) {
        errors.ingredients = 'Ingredients are required';
      }
      if (!nutritionText.trim()) {
        errors.nutrition = 'Nutritional information is required';
      }
      if (!caloriesOrEnergy.trim()) {
        errors.calories = 'Calories/Energy is required';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const copyImageToPermanentLocation = async (uri) => {
    try {
      const fileName = uri.split('/').pop();
      const newPath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.copyAsync({
        from: uri,
        to: newPath
      });
      
      return newPath;
    } catch (error) {
      console.error('Error copying image:', error);
      return uri; // Return original URI if copy fails
    }
  };

  // Handle Scan Now button
  const handleScanNowPress = () => {
    setScanChoiceModalVisible(true);
  };





//both gallery and camera

const handleImagePick = async (type, mode) => {
  try {
    setScanChoiceModalVisible(false);
    setScanType(type);

    // Show action sheet for image source selection
    Alert.alert(
      "Select Image Source",
      "Choose where you want to get the image from",
      [
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Camera access denied', 'Please grant camera access to take pictures.');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
              base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
              const pickedUri = result.assets[0].uri;
              const permanentUri = await copyImageToPermanentLocation(pickedUri);
              setUri(permanentUri);
              await sendImageToServer(permanentUri, type, mode);
            }
          }
        },
        {
          text: "Photo Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Gallery access denied', 'Please grant access to pick images from the gallery.');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
              base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
              const pickedUri = result.assets[0].uri;
              const permanentUri = await copyImageToPermanentLocation(pickedUri);
              setUri(permanentUri);
              await sendImageToServer(permanentUri, type, mode);
            }
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );

  } catch (err) {
    console.log('Error in handleImagePick:', err);
    Alert.alert('Error', 'Failed to pick image. Please try again.');
  }
};


    const sendImageToServer = async (uri, type, mode) => {
      try {
        setIsLoading(true);
    
        const token = await AsyncStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('No authentication token found');
        }
    
        // Create form data
        const formData = new FormData();
        
        // Add the image file
        formData.append('image', {
          uri: uri,
          type: 'image/jpeg',
          name: 'image.jpg'
        });
    
        // Determine endpoint based on scan type and mode
        let endpoint = '';
        if (type === 'meal') {
          endpoint = `${API_BASE_URL}/scan/meal`;
        } else if (mode === 'initial') {
          endpoint = `${API_BASE_URL}/scan/product`;
        } else if (mode === 'nutritionOnly') {
          endpoint = `${API_BASE_URL}/scan/nutrition`;
        }
    
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
        });
    
        if (response.status === 401) {
          throw new Error('INVALID_TOKEN');
        }
    
        const data = await response.json();
    
        if (!response.ok) {
          throw new Error(data.error || 'Failed to analyze image');
        }
    
        // Check for the specific error case of invalid food image
        if (data.gptResult.error === "No relevant data found in the image.") {
          Alert.alert(
            'Invalid Image',
            'The provided image could not identify any relevant information. Please input data manually or retake the image.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setFormModalVisible(true);
                }
              }
            ]
          );
          
          if (type === 'meal') {
            setMealName('');
          } else {
            if (mode === 'initial') {
              setIngredientsText('');
            }
            if (mode === 'nutritionOnly') {
              setNutritionText('');
              setCaloriesOrEnergy('');
            }
          }
          setServerResponse(null);
          setFormModalVisible(true);
          return;
        }
    
        const { scanId: returnedScanId, gptResult } = data;
        setScanId(returnedScanId || null);
    
        // Store similar recipes if available (for meal type)
        if (type === 'meal' && gptResult.similarRecipes && gptResult.similarRecipes.length > 0) {
          setSimilarRecipes(gptResult.similarRecipes);
          setMealName(gptResult.meal.name || '');
          setServerResponse(gptResult);
          
          // Show recipe selection modal
          setRecipeSelectionModalVisible(true);
        } else {
          // For non-meal types, continue with the normal flow
          if (type === 'meal') {
            setMealName(gptResult.meal.name || '');
          } else {
            if (mode === 'initial') {
              setIngredientsText(gptResult.ingredients?.join('\n') || '');
            }
            if (mode === 'nutritionOnly') {
              const nutritionText = Object.entries(gptResult.nutrition || {})
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
              setNutritionText(nutritionText);
              const energy = gptResult.nutrition?.["Total Energy"] || gptResult.nutrition?.["Total Calories"]
              || gptResult.nutrition?.["Energy"] || gptResult.nutrition?.["Calories"] ||
              gptResult.nutrition?.calories || 
              gptResult.nutrition?.energy || 
              '';
              setCaloriesOrEnergy(gptResult.nutrition?.calories || gptResult.nutrition?.energy || '');
            }
          }
          
          setServerResponse(gptResult);
          setFormModalVisible(true);
        }
      } catch (error) {
        if (error.message === 'INVALID_TOKEN' || error.message === 'No authentication token found') {
          Alert.alert('Authentication Error', 'Please log in or signup to continue');
          router.replace('/userLogin');
        } else {
          Alert.alert('Error', error.message);
          console.error('Error sending image to server:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };



//nboth gallery and camera
const scanNutritionLabel = async () => {
  try {
    // Show action sheet for image source selection
    Alert.alert(
      "Select Image Source",
      "Choose where you want to get the nutrition label image from",
      [
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Camera access denied', 'Please grant camera access to take pictures.');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
              base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
              const pickedUri = result.assets[0].uri;
              await sendImageToServer(pickedUri, 'product', 'nutritionOnly');
            }
          }
        },
        {
          text: "Photo Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Gallery access denied', 'Please grant access to pick images from the gallery.');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
              base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
              const pickedUri = result.assets[0].uri;
              await sendImageToServer(pickedUri, 'product', 'nutritionOnly');
            }
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  } catch (error) {
    console.log('Error scanning nutrition label:', error);
    Alert.alert('Error', 'Failed to scan nutrition label. Please try again.');
  }
};








  const resetScanner = () => {
    setServerResponse(null);
    setMealName('');
    setDetails('');
    setProductName('');
    setIngredientsText('');
    setNutritionText('');
    setCaloriesOrEnergy('');
    setFormModalVisible(false);
    setScanChoiceModalVisible(false);
    setScanType(null);
    setIsLoading(false);
  };

  const handleSaveAndClose = () => {
    setFormModalVisible(false);
    router.replace('/landing');
  };


  const predictMealSafety = async () => {
    try {
      setIsLoading(true);
  
      const token = await AsyncStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
  
      // Navigate to safety page first (empty state)
      router.replace({
        pathname: '/foodSafety',
        params: {
          imageUri: uri || '',
          loading: true
        }
      });
  
      // Create form data
      const formData = new FormData();
      formData.append('mealName', mealName);
      formData.append('scanId', scanId.toString());
      
      // Add selected recipe index if available
      if (selectedRecipeIndex >= 0) {
        formData.append('recipeIndex', selectedRecipeIndex.toString());
      }
  
      // Make API call
      const response = await fetch(`${API_BASE_URL}/predict/meal`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (response.status === 401) {
        throw new Error('INVALID_TOKEN');
      }
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to predict meal safety');
      }
  
      // Update safety page with received data
      router.replace({
        pathname: '/foodSafety',
        params: {
          imageUri: uri || '',
          loading: false,
          calories: data.nutrition?.Calories || 'N/A',
          totalFat: data.nutrition?.Fat || 'N/A',
          servingSize: data.nutrition?.Serving || 'N/A',
          safetyScore: data.safetyScore,
          safetyRating: data.safetyRating
        }
      });
    } catch (error) {
      if (error.message === 'INVALID_TOKEN' || error.message === 'No authentication token found') {
        Alert.alert('Authentication Error', 'Please log in or signup to continue');
        router.replace('/userLogin');
      } else {
        Alert.alert('Error', error.message);
        router.back();
      }
    } finally {
      setIsLoading(false);
    }
  };


  // Handler for selecting a recipe
  const handleRecipeSelection = (index) => {
    setSelectedRecipeIndex(index);
    // If recipes exist and the selected index is valid, update the meal name
    if (similarRecipes && similarRecipes[index] && similarRecipes[index].recipe) {
      setMealName(similarRecipes[index].recipe.name);
    }
    
    setRecipeSelectionModalVisible(false);
    setFormModalVisible(true);
  };






  // const predictProductSafety = async () => {
  //   try {
  //     setIsLoading(true);
  //     const token = await AsyncStorage.getItem('jwt_token');
  //       if (!token) {
  //           throw new Error('No authentication token found');
  //       }
  
  //     // Navigate to safety page first
  //     router.replace({
  //       pathname: '/foodSafety',
  //       params: {
  //         imageUri: uri || '',
  //         loading: true
  //       }
  //     });
  
  //     // Extract nutrition values from nutritionText
  //     const nutritionLines = nutritionText.split('\n');
  //     const nutritionData = {};
  //     nutritionLines.forEach(line => {
  //       const [key, value] = line.split(':').map(item => item.trim());
  //       nutritionData[key] = value;
  //     });
  //     console.log("nutritionData: ", nutritionData);
  
  //     // Prepare request data
  //     const requestData = {
  //       productName,
  //       ingredients: ingredientsText.split('\n'),
  //       nutrition: nutritionData,
  //       calories: caloriesOrEnergy,
  //       scanId: scanId.toString(),
  //     };
  
  //     // Make API call
  //     const response = await fetch(`${API_BASE_URL}/predict/product`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token}`  // Add JWT token to headers
  //       },
  //       body: JSON.stringify(requestData)
  //     });

  //     if (response.status === 401) {
  //       // Handle invalid or expired token
  //       throw new Error('INVALID_TOKEN');
  //     }
  
  //     const data = await response.json();
      
  //     if (!response.ok) {
  //       throw new Error(data.error || 'Failed to predict product safety');
  //     }
  
  //     // Update safety page with received data
  //     console.log("caloriesOrEnergy: ", caloriesOrEnergy);
  //     console.log("data.nutrition.totalFat: ", nutritionData.totalFat);
  //     console.log("data.nutrition.servingSize: ", nutritionData.servingSize);
  //     router.replace({
  //       pathname: '/foodSafety',
  //       params: {
  //         imageUri: uri || '',
  //         loading: false,
  //         calories: caloriesOrEnergy || 'N/A',
  //         totalFat: nutritionData.totalFat || 'N/A',
  //         servingSize: nutritionData.servingSize || 'N/A',
  //         safetyScore: data.safetyScore,
  //         safetyRating: data.safetyRating
  //       }
  //     });
  
  //   } catch (error) {
  //     if (error.message === 'INVALID_TOKEN') {
  //       // Handle missing token - redirect to login or show appropriate message
  //       Alert.alert('Authentication Error', 'Please log in or signup to continue');
  //       // You might want to add navigation logic here
  //       router.replace('/userLogin');
  //   } else if (error.message === 'No authentication token found') {
  //     Alert.alert('Authentication Error', 'Please log in or signup to continue');
  //     // You might want to add navigation logic here
  //     router.replace('/userLogin');
      
  //   }
    
  //     else {
  //       Alert.alert('Error', error.message);
  //       // console.error('Error sending image to server:', error);
  //       router.back();
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const predictProductSafety = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
  
      // Navigate to safety page first
      router.replace({
        pathname: '/foodSafety',
        params: {
          imageUri: uri || '',
          loading: true
        }
      });
  
      // Extract nutrition values from nutritionText
      const nutritionLines = nutritionText.split('\n');
      const nutritionData = {};
      nutritionLines.forEach(line => {
        const [key, value] = line.split(':').map(item => item.trim());
        nutritionData[key] = value;
      });
      console.log("nutritionData: ", nutritionData);
  
      // Prepare request data
      const requestData = {
        productName,
        ingredients: ingredientsText.split('\n'),
        nutrition: nutritionData,
        calories: caloriesOrEnergy,
        scanId: scanId.toString(),
      };
  
      // Make API call
      const response = await fetch(`${API_BASE_URL}/predict/product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });
  
      if (response.status === 401) {
        throw new Error('INVALID_TOKEN');
      }
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to predict product safety');
      }
  
      // Update safety page with received data
      console.log("caloriesOrEnergy: ", caloriesOrEnergy);
      console.log("data.nutrition.Total Fat: ", nutritionData["Total Fat"]);
      console.log("data.nutrition.Serving Size: ", nutritionData["Serving Size"]);
      
      // Extract the correct values from nutritionData
      const totalFat = nutritionData["Total Fat"] || nutritionData["Fat"]|| nutritionData.totalFat || 'N/A';
      const servingSize = nutritionData["Serving Size"] || nutritionData["Serving"] || nutritionData.servingSize || 'N/A';
      
      router.replace({
        pathname: '/foodSafety',
        params: {
          imageUri: uri || '',
          loading: false,
          calories: caloriesOrEnergy || nutritionData["Total Energy"] || nutritionData["Energy"] || nutritionData["Total Calories"] || nutritionData["Calories"]|| nutritionData.calories || 'N/A',
          totalFat: totalFat,
          servingSize: servingSize,
          safetyScore: data.safetyScore,
          safetyRating: data.safetyRating
        }
      });
  
    } catch (error) {
      if (error.message === 'INVALID_TOKEN') {
        Alert.alert('Authentication Error', 'Please log in or signup to continue');
        router.replace('/userLogin');
      } else if (error.message === 'No authentication token found') {
        Alert.alert('Authentication Error', 'Please log in or signup to continue');
        router.replace('/userLogin');
      } else {
        Alert.alert('Error', error.message);
        router.back();
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Modified handlePredictionPress
  const handlePredictionPress = async () => {
    if (!validateForm()) {
      Alert.alert('Required Fields', 'Please fill out all required fields');
      return;
    }

    if (scanType === 'meal') {
      await predictMealSafety();
    } else {
      await predictProductSafety();
    }
    
    resetScanner();
  };

  // Modify your render method to show validation errors
  const renderError = (fieldName) => {
    if (formErrors[fieldName]) {
      return <Text style={styles.errorText}>{formErrors[fieldName]}</Text>;
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Food Safety Scanner</Text>

      <TouchableOpacity style={styles.bigButton} onPress={handleScanNowPress}>
        <Text style={styles.bigButtonText}>Scan Now</Text>
      </TouchableOpacity>

      <Modal
        visible={scanChoiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScanChoiceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.choiceContainer}>
            <Text style={styles.choiceTitle}>What do you want to scan?</Text>

            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => handleImagePick('meal', 'initial')}
            >
              <Text style={styles.choiceButtonText}>Scan a Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => handleImagePick('product', 'initial')}
            >
              <Text style={styles.choiceButtonText}>Scan a Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setScanChoiceModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      

      <Modal
        visible={formModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formContainer}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {serverResponse?.meal && (
                <>
                  <Text style={styles.formTitle}>Meal Scanned</Text>
                  <Text style={styles.label}>Meal Name (required):</Text>
                  <TextInput
                    style={[styles.input, formErrors.mealName && styles.inputError]}
                    value={mealName}
                    onChangeText={setMealName}
                  />
                  {renderError('mealName')}
                  <Text style={styles.label}>Details (optional):</Text>
                    <TextInput
                    style={styles.input}
                    value={details}
                    onChangeText={setDetails}
                    placeholder="Enter additional details about the item..."
                    multiline
                    />
                </>
              )}

              {!serverResponse?.meal && (
                <>
                  <Text style={styles.formTitle}>Food Product Scanned</Text>

                  <Text style={styles.label}>Product Name (required):</Text>
                  <TextInput
                    style={[styles.input, formErrors.productName && styles.inputError]}
                    value={productName}
                    onChangeText={setProductName}
                  />
                  {renderError('productName')}
                  <Text style={styles.label}>Details (optional):</Text>
                    <TextInput
                    style={styles.input}
                    value={details}
                    onChangeText={setDetails}
                    placeholder="Enter additional details about the item..."
                    multiline
                    />

                  <Text style={styles.label}>Ingredients:</Text>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }, formErrors.ingredients && styles.inputError]}
                    multiline
                    value={ingredientsText}
                    onChangeText={setIngredientsText}
                  />
                  {renderError('ingredients')}

                  <Text style={styles.label}>Calories/Energy:</Text>
                  <TextInput
                    style={[styles.input, formErrors.calories && styles.inputError]}
                    value={caloriesOrEnergy}
                    onChangeText={setCaloriesOrEnergy}
                  />
                  {renderError('calories')}

                  <Text style={styles.label}>
                    Nutritional Info:
                    {/* <TouchableOpacity
                      onPress={() => handleImagePick('product', 'nutritionOnly')}
                    > */}
                    <TouchableOpacity
                      onPress={() => scanNutritionLabel()}
                    >
                      <Text style={styles.iconButton}> [📷]</Text>
                    </TouchableOpacity>
                  </Text>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }, formErrors.nutrition && styles.inputError]}
                    multiline
                    value={nutritionText}
                    onChangeText={setNutritionText}
                    placeholder='Fat: 10g\nCarbs: 20g\nProtein: 5g\n...'
                  />
                  {renderError('nutrition')}

                  {/* {isLoading && (
                        <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>Analyzing...</Text>
                        </View>
                    )} */}
                </>
              )}

              <TouchableOpacity style={[styles.saveButton, { backgroundColor: 'orange' }]} onPress={handlePredictionPress}>
                <Text style={styles.saveButtonText}>Check Safety</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.retakeButton} onPress={resetScanner}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveAndClose}>
                <Text style={styles.saveButtonText}>Close</Text>
              </TouchableOpacity>
              
            </ScrollView>
          </View>
          {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Analyzing...</Text>
        </View>
      )}
        </View>
      </Modal>

      {/* Add this modal for recipe selection */}
      <Modal
        visible={recipeSelectionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setRecipeSelectionModalVisible(false);
          setFormModalVisible(true);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.formContainer, { maxHeight: '80%' }]}>
            <RecipeSelector 
              recipes={similarRecipes} 
              onSelect={handleRecipeSelection}
              onCancel={() => {
                setRecipeSelectionModalVisible(false);
                setFormModalVisible(true);
              }} 
            />
          </View>
        </View>
      </Modal>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Analyzing...</Text>
        </View>
      )}
    </View>
  );
}









// ======= STYLES =======
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  inputError: {
    borderColor: 'red',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5B3566',
    marginBottom: 10,
    textAlign: 'center',
  },
  bigButton: {
    backgroundColor: '#FF6B81',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  bigButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Choice modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '80%',
    padding: 20,
    alignItems: 'center',
  },
  choiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5B3566',
    marginBottom: 15,
  },
  choiceButton: {
    backgroundColor: '#F7577A',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginVertical: 5,
  },
  choiceButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#999',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Higher z-index to appear above modals
    elevation: 10, // Higher elevation for Android
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 18,
  },

  // Form modal
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
    maxHeight: '90%',
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5B3566',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: '#5B3566',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F6F6F6',
    marginBottom: 15,
    fontSize: 16,
  },
  iconButton: {
    color: '#FF6B81',
    fontWeight: 'bold',
    fontSize: 16,
  },
  nutritionContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  nutritionText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
  },

  saveButton: {
    backgroundColor: '#FF6B81',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  retakeButton: {
    backgroundColor: '#999',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  retakeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
