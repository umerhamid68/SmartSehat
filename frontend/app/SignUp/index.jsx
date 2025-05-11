import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import DateTimePicker from 'react-native-modal-datetime-picker';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
export default function SignUp({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const router = useRouter();

  const handleConfirm = (date) => {
    setDob(date.toISOString().split('T')[0]);
    setDatePickerVisibility(false);
  };

//   const submitForm = async () => {
//     if (!firstName || !lastName || !email || !password || !dob) {
//         Alert.alert('Error', 'Please fill in all fields.');
//         return;
//     }

//     try {
//         // Convert form data into URL-encoded format
//         const formData = new URLSearchParams();
//         formData.append('firstName', firstName);
//         formData.append('lastName', lastName);
//         formData.append('email', email);
//         formData.append('password', password);
//         formData.append('dateOfBirth', dob);

//         // Make POST request
//         const response = await fetch('http://192.168.1.104:5000/user/add', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/x-www-form-urlencoded',
//             },
//             body: formData.toString(),
//         });

//         // Handle JSON response
//         const result = await response.json();
//         if (response.status === 201) {
//             Alert.alert('Success', 'Account created successfully.', [
//                 {
//                     text: 'OK',
//                     onPress: () => router.push('/medicalHistory'), // Redirect to login page
//                 },
//             ]);
//         } else if (response.status === 409) {
//             Alert.alert('Error', result.message || 'User already exists.');
//         } else {
//             Alert.alert('Error', result.message || 'Something went wrong.');
//         }
//     } catch (error) {
//         console.error('Error:', error);
//         Alert.alert('Error', 'Failed to connect to the server.');
//     }
// };



const submitForm = async () => {
  if (!firstName || !lastName || !email || !password || !dob) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
  }

  try {
      const formData = new URLSearchParams();
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('dateOfBirth', dob);

      const response = await fetch('http://192.168.1.106:5000/user/add', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
      });

      const result = await response.json();
      
      if (response.status === 201) {
          // Store the JWT token immediately after signup
          const formData = new URLSearchParams();
          formData.append('username', email); // Flask expects "username"
          formData.append('password', password); // Flask expects "password"
  
          // Send POST request to the backend
          const response = await fetch('http://192.168.1.106:5000/user/login', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded', // Ensure form data format
              },
              body: formData.toString(), // Encode form data as a string
          });
  
          if (response.status === 200) {
              const result = await response.json();
              const token = result.token; // Extract JWT token from the response
  
              // Save the JWT token globally
              await AsyncStorage.setItem('jwt_token', token);
              console.log(token);
              Alert.alert('Success', 'Account created successfully. Please fill in your medical history.', [
                  {
                      text: 'OK',
                      onPress: () => router.push('/medicalHistory'), // Redirect to medical history page
                  },
              ]);
          } else if (response.status === 204) {
              Alert.alert('Error', 'No such user found. Please check your credentials.');
          } else {
              Alert.alert('Error', 'Unexpected error occurred. Please try again.');
          }
          // if (result.token) {
          //   console.log("here")
          //   console.log(result.token);
          //     await AsyncStorage.setItem('jwt_token', result.token);
          //     Alert.alert('Success', 'Account created successfully. Please fill in your medical history.', [
          //         {
          //             text: 'OK',
          //             onPress: () => router.push('/medicalHistory'),
          //         },
          //     ]);
          // }
      } else if (response.status === 409) {
          Alert.alert('Error', result.message || 'User already exists.');
      } else {
          Alert.alert('Error', result.message || 'Something went wrong.');
      }
  } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to connect to the server.');
  }
};


  return (
    <View style={styles.container}>
      <Image source={require('./../../assets/images/logo.png')} style={styles.logo} />
      <Text style={styles.header}>Create a new account</Text>
      <Text style={styles.subHeader}>Please put your information below to create a new account</Text>

      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#8A8A8A"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        placeholderTextColor="#8A8A8A"
        value={lastName}
        onChangeText={setLastName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#8A8A8A"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.inputPassword}
          placeholder="Password"
          placeholderTextColor="#8A8A8A"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.input} onPress={() => setDatePickerVisibility(true)}>
        <Text style={dob ? styles.dobText : styles.dobPlaceholder}>
          {dob || 'Date of Birth'}
        </Text>
      </TouchableOpacity>

      <DateTimePicker
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={() => setDatePickerVisibility(false)}
      />

      <TouchableOpacity style={styles.createAccountButton} onPress={submitForm}>
        <Text style={styles.createAccountText}>Create account</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/userLogin')}>
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.link}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D0052',
    marginBottom: 10,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    fontSize: 16,
  },
  dobText: {
    fontSize: 16,
    color: '#000',
  },
  dobPlaceholder: {
    fontSize: 16,
    color: '#8A8A8A',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    marginBottom: 10,
  },
  inputPassword: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeButton: {
    padding: 10,
  },
  eyeText: {
    fontSize: 18,
  },
  createAccountButton: {
    width: '100%',
    backgroundColor: '#F7577A',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAccountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginText: {
    textAlign: 'center',
    color: '#8A8A8A',
    fontSize: 14,
  },
  link: {
    color: '#FF4D6D',
    fontWeight: 'bold',
  },
});
