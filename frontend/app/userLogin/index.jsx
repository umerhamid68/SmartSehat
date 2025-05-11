import React, { useState, useCallback } from 'react';
import { View, Image, Text, TextInput, Pressable, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useOAuth } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';

export const useWarmUpBrowser = () => {
    React.useEffect(() => {
        // Warm up the android browser to improve UX
        void WebBrowser.warmUpAsync();
        return () => {
            void WebBrowser.coolDownAsync();
        };
    }, []);
};

WebBrowser.maybeCompleteAuthSession();

export default function UserLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
    const router = useRouter();
    useWarmUpBrowser();
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

    const onPress = useCallback(async () => {
        try {
            const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow({
                redirectUrl: Linking.createURL('/landing', { scheme: 'myapp' }),
            });

            if (createdSessionId) {
                console.log('Google OAuth Login Successful!');
            } else {
                console.log('Google OAuth flow completed, but no session created.');
            }
        } catch (err) {
            console.error('OAuth error', err);
        }
    }, []);

    const handleLogin = async () => {
      if (!email || !password) {
          Alert.alert('Error', 'Please enter both email and password.');
          return;
      }
  
      try {
          // Prepare form data in x-www-form-urlencoded format
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
              Alert.alert('Success', 'Login successful!', [
                  {
                      text: 'OK',
                      onPress: () => router.push('/landing'), // Redirect to medical history page
                  },
              ]);
          } else if (response.status === 204) {
              Alert.alert('Error', 'No such user found. Please check your credentials.');
          } else {
              Alert.alert('Error', 'Unexpected error occurred. Please try again.');
          }
      } catch (error) {
          console.error('Error:', error);
          Alert.alert('Error', 'Failed to connect to the server.');
      }
   };
  
  
  

    return (
        <View style={styles.container}>
            <Image source={require('./../../assets/images/logo.png')} style={styles.logo} />
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>Please put your information below to sign in to your account</Text>

            <TextInput
                placeholder="Email"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
            />

            <View style={styles.passwordContainer}>
                <TextInput
                    placeholder="Password"
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                />
                <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                >
                    <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
            </View>

            <Pressable>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>

            <Pressable style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Sign In</Text>
            </Pressable>

            <Text style={styles.orText}>Or</Text>

            <Pressable style={styles.googleButton} onPress={onPress}>
                <Image
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png' }}
                    style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
            </Pressable>

            <Text style={styles.signupText}>
                Don't have an account?{' '}
                <Text style={styles.signupLink} onPress={() => router.push('/SignUp')}>
                    Sign Up
                </Text>
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    logo: {
        width: 100,
        height: 100,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2D0052',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        marginBottom: 30,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        height: 50,
        borderColor: '#E3E3E3',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
    },
    passwordContainer: {
        width: '100%',
        position: 'relative',
        justifyContent: 'center',
    },
    eyeButton: {
        position: 'absolute',
        right: 15,
        top: 15,
    },
    eyeText: {
        fontSize: 20,
        color: '#8A8A8A',
    },
    forgotPasswordText: {
        color: '#8A8A8A',
    },
    button: {
        width: '100%',
        backgroundColor: '#F7577A',
        paddingVertical: 15,
        borderRadius: 10,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    signupText: {
        fontSize: 16,
        color: '#888888',
        marginTop: 20,
    },
    signupLink: {
        color: '#F7577A',
        fontWeight: 'bold',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 15,
        paddingHorizontal: 20,
        width: '100%',
        marginBottom: 20,
    },
    googleIcon: {
        width: 70,
        height: 24,
        marginRight: 25,
    },
    googleButtonText: {
        fontSize: 16,
        color: '#333',
    },
});
