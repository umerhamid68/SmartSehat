import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native';

export default function Home() {
  return (
    <View style={styles.container}>
    <Image
        source={require('./../assets/images/loading.png')} 
        style={styles.logo}
    />
      <Text style={styles.header}>Smart Sehat</Text>
      <View style={styles.content}>
        <Text style={styles.message}>Great!</Text>
        <Text style={styles.description}>You have successfully created your Smart Sehat account. Now just wait a minute to redirect on the home page.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    //marginTop:200
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  content: {
    alignItems: 'center',
  },
  message: {
    fontSize: 20,
    color: '#FF5733',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
  },
});