import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
  Alert,
  Image,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../constants';

const apiUrl = `${API_URL}/chat`;

export default function ChatBot() {
  const router = useRouter();
  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Assalamu alaikum! Welcome! I'm your professional assistant, here to help you with any health, medical, or nutrition-related questions you may have.",
      isBot: true,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const { isNavBarVisible } = useLocalSearchParams();

  /* ------------------------------ keyboard hooks ----------------------------- */
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      setIsKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setIsKeyboardOpen(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  /* ----------------------------- send message fn ---------------------------- */
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // 🔑 1. Clear the TextInput immediately for instant feedback
    setInputText('');

    // 🔑 2. Optimistically add the user's message
    const userMessage = {
      id: `${Date.now()}`,
      text: trimmed,
      isBot: false,
    };
    setMessages(prev => [...prev, userMessage]);
    flatListRef.current?.scrollToEnd({ animated: true });

    try {
      const token = await AsyncStorage.getItem('jwt_token');
      if (!token) throw new Error('NO_TOKEN');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed }),
      });

      if (response.status === 401) throw new Error('INVALID_TOKEN');
      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();

      // 🔑 3. Add bot reply (text or image)
      if (data.image) {
        setMessages(prev => [
          ...prev,
          { id: `${Date.now()}`, image: data.image, isBot: true },
        ]);
      } else if (data.message) {
        setMessages(prev => [
          ...prev,
          { id: `${Date.now()}`, text: formatResponse(data.message), isBot: true },
        ]);
      }
    } catch (err) {
      if (err.message === 'INVALID_TOKEN' || err.message === 'NO_TOKEN') {
        Alert.alert('Authentication Error', 'Please log in or sign up to continue');
        router.push('/userLogin');
      } else {
        console.error(err);
        setMessages(prev => [
          ...prev,
          {
            id: `${Date.now()}`,
            text: 'Sorry, I could not process your request.',
            isBot: true,
          },
        ]);
      }
    } finally {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  };

  /* ------------------------------ helpers ----------------------------------- */
  const formatResponse = str =>
    str
      .replace(/\n/g, '\n') // preserve line breaks
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold → plain
      .replace(/(\*|_)(.*?)\1/g, '$2'); // italic → plain

  const renderMessage = ({ item }) =>
    item.image ? (
      <View style={[styles.messageContainer, styles.botMessage]}>
        <Image
          source={{ uri: `data:image/png;base64,${item.image}` }}
          style={styles.imageMessage}
          resizeMode="contain"
        />
      </View>
    ) : (
      <View
        style={[
          styles.messageContainer,
          item.isBot ? styles.botMessage : styles.userMessage,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );

  /* --------------------------------- UI ------------------------------------- */
  return (
    <View style={[styles.chatContainer, { paddingBottom: isKeyboardOpen ? 0 : 70 }]}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message here..."
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <FontAwesome name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* -------------------------------- styles ----------------------------------- */
const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 40,
  },
  messagesContent: {
    paddingVertical: 10,
  },
  messageContainer: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 8,
    margin: 10,
  },
  botMessage: {
    backgroundColor: '#f77e90',
    alignSelf: 'flex-start',
  },
  userMessage: {
    backgroundColor: 'grey',
    alignSelf: 'flex-end',
  },
  messageText: {
    color: '#faf5f5',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#FF6B81',
    padding: 10,
    borderRadius: 20,
  },
  imageMessage: {
    width: 550,
    height: 150,
    borderRadius: 10,
    alignSelf: 'center',
  },
});
