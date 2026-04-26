import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function RandomMatchScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('idle');
  const [matchedUser, setMatchedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const socketRef = useRef(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    initSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const initSocket = async () => {
    const id = await SecureStore.getItemAsync('userId');
    setUserId(id);
    socketRef.current = io(API);

    socketRef.current.on('matched', (data) => {
      setMatchedUser(data.partner);
      setStatus('chatting');
    });

    socketRef.current.on('receive_message', (data) => {
      setMessages(prev => [...prev, { text: data.text, sender: 'them' }]);
    });

    socketRef.current.on('partner_left', () => {
      Alert.alert('Partner left', 'Your match has disconnected.');
      setStatus('idle');
      setMatchedUser(null);
      setMessages([]);
    });

    socketRef.current.on('waiting', () => {
      setStatus('waiting');
    });
  };

  const findMatch = () => {
    setStatus('waiting');
    socketRef.current.emit('find_match', { userId });
  };

  const skipMatch = () => {
    socketRef.current.emit('skip_match', { userId });
    setStatus('waiting');
    setMatchedUser(null);
    setMessages([]);
    socketRef.current.emit('find_match', { userId });
  };

  const addFriend = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/connections/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId, connected_user_id: matchedUser.id })
      });
      if (response.ok) {
        Alert.alert('Success', 'Friend request sent!');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not send request');
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      socketRef.current.emit('send_random_message', {
        userId,
        text: message,
        partnerId: matchedUser?.id
      });
      setMessages(prev => [...prev, { text: message, sender: 'me' }]);
      setMessage('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Random Match</Text>
      </View>

      {status === 'idle' && (
        <View style={styles.center}>
          <Text style={styles.title}>Find a Random Match</Text>
          <Text style={styles.subtitle}>Get paired anonymously with someone new</Text>
          <TouchableOpacity style={styles.findBtn} onPress={findMatch}>
            <Text style={styles.findBtnText}>🎲 Find Match</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'waiting' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6c63ff" />
          <Text style={styles.waitingText}>Finding someone for you...</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatus('idle')}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'chatting' && (
        <View style={styles.chatContainer}>
          <View style={styles.matchInfo}>
            <Text style={styles.matchText}>🎭 Chatting anonymously</Text>
            <View style={styles.matchActions}>
              <TouchableOpacity style={styles.skipBtn} onPress={skipMatch}>
                <Text style={styles.skipBtnText}>Skip ⏭</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={addFriend}>
                <Text style={styles.addBtnText}>Add Friend ➕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.messages}>
            {messages.map((msg, index) => (
              <View key={index} style={[styles.bubble, msg.sender === 'me' ? styles.me : styles.them]}>
                <Text style={styles.msgText}>{msg.text}</Text>
              </View>
            ))}
          </View>

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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#1a1a2e', gap: 16 },
  back: { color: '#6c63ff', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { color: '#888', textAlign: 'center', marginTop: 8, marginBottom: 40 },
  findBtn: { backgroundColor: '#6c63ff', padding: 18, borderRadius: 50, alignItems: 'center', width: 200 },
  findBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cancelBtn: { marginTop: 20 },
  cancelBtnText: { color: '#ff4d4d', fontSize: 16 },
  waitingText: { color: '#888', marginTop: 20, fontSize: 16 },
  chatContainer: { flex: 1 },
  matchInfo: { backgroundColor: '#1a1a2e', padding: 12, alignItems: 'center' },
  matchText: { color: '#888', fontSize: 14 },
  matchActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  skipBtn: { backgroundColor: '#ff4d4d', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  skipBtnText: { color: '#fff', fontWeight: 'bold' },
  addBtn: { backgroundColor: '#00c853', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  messages: { flex: 1, padding: 16 },
  bubble: { padding: 12, borderRadius: 10, marginBottom: 10, maxWidth: '75%' },
  me: { backgroundColor: '#6c63ff', alignSelf: 'flex-end' },
  them: { backgroundColor: '#1e1e1e', alignSelf: 'flex-start' },
  msgText: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#1e1e1e', color: '#fff', padding: 12, borderRadius: 10 },
  sendBtn: { backgroundColor: '#6c63ff', padding: 12, borderRadius: 10, marginLeft: 8 },
  sendText: { color: '#fff', fontWeight: 'bold' },
});