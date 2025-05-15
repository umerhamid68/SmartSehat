import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { API_URL } from '../../constants';

const API_BASE_URL = API_URL;

export default function UserProfile() {
    const [medicalHistory, setMedicalHistory] = useState([]);
    const [userDetails, setUserDetails] = useState({});
    const router = useRouter();

    useEffect(() => {
        fetchUserDetails();
        fetchMedicalHistory();
    }, []);

    // Fetch user details
    const fetchUserDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('jwt_token');
            if (!token) {
                Alert.alert('Error', 'No authentication token found.');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/user/userDetails`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.payload) {
                    setUserDetails(data.payload);
                } else {
                    Alert.alert('Error', 'Failed to fetch user details.');
                }
            } else if (response.status === 401) {
                Alert.alert('Error', 'Invalid token. Please log in again.');
            } else {
                Alert.alert('Error', 'Failed to fetch user details.');
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
            Alert.alert('Error', 'An error occurred while fetching user details.');
        }
    };

    // Fetch medical history
    const fetchMedicalHistory = async () => {
        try {
            const token = await AsyncStorage.getItem('jwt_token');
            if (!token) {
                Alert.alert('Error', 'No authentication token found.');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/medicalHistory`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.payload && data.payload.length > 0) {
                    console.log("payload" , data.payload);
                    setMedicalHistory(data.payload);
                } else {
                    Alert.alert('Info', 'No medical history found.');
                }
            } else if (response.status === 401) {
                Alert.alert('Error', 'Invalid token. Please log in again.');
            } else {
                Alert.alert('Error', 'Failed to fetch medical history.');
            }
        } catch (error) {
            console.error('Error fetching medical history:', error);
            Alert.alert('Error', 'An error occurred while fetching medical history.');
        }
    };

    const deleteMedicalHistory = async () => {
        try {
            const token = await AsyncStorage.getItem('jwt_token');
            if (!token) {
                Alert.alert('Error', 'No authentication token found.');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/medicalHistory/delete`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                router.replace('/medicalHistory');
                // Alert.alert('Success', 'Medical history deleted successfully!', [
                //     {
                //         text: 'OK',
                //         onPress: () => {
                //             router.replace('/medicalHistory');
                //         },
                //     },
                // ]);
            } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.message || 'Failed to delete medical history.');
            }
        } catch (error) {
            console.error('Error deleting medical history:', error);
            Alert.alert('Error', 'An error occurred while deleting medical history.');
        }
    };

    const signOut = async () => {
        try {
            await AsyncStorage.removeItem('jwt_token');
            router.dismissAll();
            router.replace('/userLogin');
        } catch (error) {
            console.error('Error during sign out:', error);
            Alert.alert('Error', 'An error occurred while signing out.');
        }
    };

    const handleEditt = () => {
        // Navigate to medical history page with existing data
        if (medicalHistory.length > 0) {
            router.push({
                pathname: '/medicalHistory',
                params: {
                    isEdit: true,
                    existingData: JSON.stringify(medicalHistory[0])
                }
            });
        }
    };

    const handleEdit = () => {
        Alert.alert(
            'Confirm Edit',
            'Are you sure you want to Edit this medical history?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'OK', onPress: handleEditt },
            ]
        );
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const renderFields = (data) => {
        return Object.keys(data)
            .filter(
                (key) =>
                    key !== 'userId' &&
                    key !== 'historyid' &&
                    key !== 'diseaseData' // Exclude unnecessary fields
            )
            .map((key) => (
                <View key={key} style={styles.field}>
                    <Text style={styles.historyLabel}>{key}:</Text>
                    <Text style={styles.staticValue}>
                    {key === 'startDate' || key === 'endDate' 
                        ? formatDate(data[key]) 
                        : typeof data[key] === 'number' 
                        ? (key === 'age' || key === 'height' || key === 'weight' || key === 'physicalActivity')
                            ? data[key]?.toString() || 'N/A'
                            : data[key] === 1 
                            ? 'Positive' 
                            : data[key] === 0 
                                ? 'Negative' 
                                : data[key]?.toString() || 'N/A' 
                        : data[key]?.toString() || 'N/A'}
                    </Text>
                </View>
            ));
    };

    return (
        <View style={styles.container}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.userDetailsContainer}>
                        <Text style={styles.title}>User Profile</Text>
                        {userDetails && (
                            <>
                                <Text style={styles.userDetail}>
                                    <Text style={styles.boldText}>Name: </Text>
                                    {userDetails.firstName} {userDetails.lastName}
                                </Text>
                                <Text style={styles.userDetail}>
                                    <Text style={styles.boldText}>Email: </Text>
                                    {userDetails.email}
                                </Text>
                                <Text style={styles.userDetail}>
                                    <Text style={styles.boldText}>Date of Birth: </Text>
                                    {formatDate(userDetails.dateOfBirth)}
                                </Text>
                            </>
                        )}
                    </View>

                    {medicalHistory.length > 0 ? (
                        medicalHistory.map((item, index) => (
                            <View key={index} style={styles.historyItem}>
                                <Text style={styles.title}>Medical History</Text>
                                {renderFields({
                                    gender: item.gender,
                                    diseaseType: item.diseaseType,
                                    diagnosedSince: item.diagnosedSince,
                                    startDate: item.startDate,
                                    endDate: item.endDate,
                                    medications: item.medications,
                                    height: item.height,               // New field
                                    weight: item.weight,               // New field
                                    age: item.age,                     // New field
                                    physicalActivity: item.physicalActivity, // New field
                                })}
                                {item.diseaseData && (
                                    <>
                                        <Text style={styles.subTitle}>Disease Data:</Text>
                                        {renderFields(item.diseaseData)}
                                    </>
                                )}
                                <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                                    <Text style={styles.editText}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noHistoryText}>No medical history available.</Text>
                    )}

                    <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                </ScrollView>
            </GestureHandlerRootView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: 'white',
        paddingTop: 45,
    },
    scrollViewContent: {
        paddingBottom: 70,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#5B3566',
        marginBottom: 20,
        textAlign: 'center',
    },
    titleSub: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#5B3566',
        marginBottom: 20,
        textAlign: 'center',
    },
    userDetailsContainer: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#F6F6F6',
        borderRadius: 8,
    },
    userDetail: {
        fontSize: 16,
        color: '#333',
        marginBottom: 10,
    },
    boldText: {
        fontWeight: 'bold',
    },
    subTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
        marginBottom: 10,
    },
    historyItem: {
        padding: 15,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: '#F6F6F6',
    },
    historyLabel: {
        fontSize: 16,
        marginBottom: 5,
        color: '#333',
    },
    staticValue: {
        fontSize: 16,
        color: '#555',
        marginBottom: 10,
    },
    field: {
        marginBottom: 15,
    },
    noHistoryText: {
        fontSize: 16,
        color: '#777',
        textAlign: 'center',
        marginTop: 20,
    },
    editButton: {
        backgroundColor: '#db9aa8',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    editText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    signOutButton: {
        backgroundColor: '#F7577A',
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
        alignItems: 'center',
    },
    signOutText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
