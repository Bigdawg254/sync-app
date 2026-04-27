import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function ChatScreen() {
  const router = useRouter();
  const { friendId, friendName } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    initChat();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const initChat = async () => {
    const id = await SecureStore.getItemAsync('userId');
    const token = await SecureStore.getItemAsync('userToken');
    setUserId(id);

    // Load previous messages
    const response = await fetch(`${API}/api/messages/${friendId}?senderId=${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setMessages(data.map(msg => ({
      id: msg.id.toString(),
      text: msg.content,
      sender: msg.sender_id.toString() === id ? 'me' : 'them'
    })));

    // Connect socket
    socketRef.current = io(API);
    const room = [id, friendId].sort().join('_');
    socketRef.current.emit('join_room', room);

    socketRef.current.on('receive_message', (data) => {
      if (data.sender_id !== id) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: data.text,
          sender: 'them'
        }]);
      }
    });
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    const token = await SecureStore.getItemAsync('userToken');
    const room = [userId, friendId].sort().join('_');

    // Save to database
    await fetch(`${API}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        sender_id: userId,
        receiver_id: friendId,
        content: message
      })
    });

    // Send via socket
    socketRef.current.emit('send_message', {
      room,
      text: message,
      sender_id: userId
    });

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: message,
      sender: 'me'
    }]);
    setMessage('');
    flatListRef.current?.scrollToEnd();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{friendName || 'Chat'}</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/call', params: { friendId, friendName } })}>
          <Text style={styles.callBtn}>📞</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender === 'me' ? styles.me : styles.them]}>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, backgroundColor: '#1a1a2e' },
  back: { color: '#6c63ff', fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  callBtn: { fontSize: 24 },
  bubble: { padding: 12, borderRadius: 10, marginBottom: 10, maxWidth: '75%', marginHorizontal: 16 },
  me: { backgroundColor: '#6c63ff', alignSelf: 'flex-end' },
  them: { backgroundColor: '#1e1e1e', alignSelf: 'flex-start' },
  msgText: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: 12, alignItems: 'center', backgroundColor: '#1a1a2e' },
  input: { flex: 1, backgroundColor: '#2d2d44', color: '#fff', padding: 12, borderRadius: 20 },
  sendBtn: { backgroundColor: '#6c63ff', padding: 12, borderRadius: 20, marginLeft: 8 },
  sendText: { color: '#fff', fontWeight: 'bold' },
});import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function ChatScreen() {
  const router = useRouter();
  const { friendId, friendName } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    initChat();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const initChat = async () => {
    const id = await SecureStore.getItemAsync('userId');
    const token = await SecureStore.getItemAsync('userToken');
    setUserId(id);

    // Load previous messages
    const response = await fetch(`${API}/api/messages/${friendId}?senderId=${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setMessages(data.map(msg => ({
      id: msg.id.toString(),
      text: msg.content,
      sender: msg.sender_id.toString() === id ? 'me' : 'them'
    })));

    // Connect socket
    socketRef.current = io(API);
    const room = [id, friendId].sort().join('_');
    socketRef.current.emit('join_room', room);

    socketRef.current.on('receive_message', (data) => {
      if (data.sender_id !== id) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: data.text,
          sender: 'them'
        }]);
      }
    });
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    const token = await SecureStore.getItemAsync('userToken');
    const room = [userId, friendId].sort().join('_');

    // Save to database
    await fetch(`${API}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        sender_id: userId,
        receiver_id: friendId,
        content: message
      })
    });

    // Send via socket
    socketRef.current.emit('send_message', {
      room,
      text: message,
      sender_id: userId
    });

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: message,
      sender: 'me'
    }]);
    setMessage('');
    flatListRef.current?.scrollToEnd();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{friendName || 'Chat'}</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/call', params: { friendId, friendName } })}>
          <Text style={styles.callBtn}>📞</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender === 'me' ? styles.me : styles.them]}>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, backgroundColor: '#1a1a2e' },
  back: { color: '#6c63ff', fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  callBtn: { fontSize: 24 },
  bubble: { padding: 12, borderRadius: 10, marginBottom: 10, maxWidth: '75%', marginHorizontal: 16 },
  me: { backgroundColor: '#6c63ff', alignSelf: 'flex-end' },
  them: { backgroundColor: '#1e1e1e', alignSelf: 'flex-start' },
  msgText: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: 12, alignItems: 'center', backgroundColor: '#1a1a2e' },
  input: { flex: 1, backgroundColor: '#2d2d44', color: '#fff', padding: 12, borderRadius: 20 },
  sendBtn: { backgroundColor: '#6c63ff', padding: 12, borderRadius: 20, marginLeft: 8 },
  sendText: { color: '#fff', fontWeight: 'bold' },
});