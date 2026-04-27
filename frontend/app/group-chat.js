import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function GroupChatScreen() {
  const router = useRouter();
  const { groupId, groupName } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    initGroupChat();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const initGroupChat = async () => {
    const id = await SecureStore.getItemAsync('userId');
    setUserId(id);

    socketRef.current = io(API);
    socketRef.current.emit('join_room', `group_${groupId}`);

    socketRef.current.on('receive_message', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: data.text,
        sender: data.sender_id === id ? 'me' : 'them',
        username: data.username
      }]);
    });
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    const username = await SecureStore.getItemAsync('username');

    socketRef.current.emit('send_message', {
      room: `group_${groupId}`,
      text: message,
      sender_id: userId,
      username: username || 'User'
    });

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: message,
      sender: 'me',
      username: 'Me'
    }]);
    setMessage('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{groupName || 'Group Chat'}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bubbleContainer, item.sender === 'me' ? styles.meContainer : styles.themContainer]}>
            {item.sender !== 'me' && <Text style={styles.senderName}>{item.username}</Text>}
            <View style={[styles.bubble, item.sender === 'me' ? styles.me : styles.them]}>
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#1a1a2e', gap: 16 },
  back: { color: '#6c63ff', fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  bubbleContainer: { marginHorizontal: 16, marginBottom: 10 },
  meContainer: { alignItems: 'flex-end' },
  themContainer: { alignItems: 'flex-start' },
  senderName: { color: '#6c63ff', fontSize: 12, marginBottom: 4 },
  bubble: { padding: 12, borderRadius: 10, maxWidth: '75%' },
  me: { backgroundColor: '#6c63ff' },
  them: { backgroundColor: '#1e1e1e' },
  msgText: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: 12, alignItems: 'center', backgroundColor: '#1a1a2e' },
  input: { flex: 1, backgroundColor: '#2d2d44', color: '#fff', padding: 12, borderRadius: 20 },
  sendBtn: { backgroundColor: '#6c63ff', padding: 12, borderRadius: 20, marginLeft: 8 },
  sendText: { color: '#fff', fontWeight: 'bold' },
});
