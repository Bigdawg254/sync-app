import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
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
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    initSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const initSocket = async () => {
    const id = await SecureStore.getItemAsync('userId');
    setUserId(id);
    socketRef.current = io(API, { transports: ['websocket'] });
    socketRef.current.on('matched', (data) => {
      setMatchedUser(data.partner);
      setStatus('chatting');
    });
    socketRef.current.on('receive_message', (data) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: data.text, sender: 'them' }]);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    });
    socketRef.current.on('partner_left', () => {
      Alert.alert('Disconnected', 'Your match has left the chat.');
      setStatus('idle');
      setMatchedUser(null);
      setMessages([]);
    });
    socketRef.current.on('waiting', () => setStatus('waiting'));
  };

  const findMatch = () => {
    if (!userId) return;
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId, connected_user_id: matchedUser.id })
      });
      if (response.ok) {
        Alert.alert('✅ Friend Request Sent!', 'They will see it in their notifications.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not send request');
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    socketRef.current.emit('send_random_message', { userId, text: message });
    setMessages(prev => [...prev, { id: Date.now().toString(), text: message, sender: 'me' }]);
    setMessage('');
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
  };

  if (status === 'idle') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Random Match</Text>
        </View>
        <View style={styles.idleContent}>
          <Text style={styles.idleEmoji}>🎲</Text>
          <Text style={styles.idleTitle}>Meet Someone New</Text>
          <Text style={styles.idleDesc}>You'll be anonymously paired with a random person. Chat freely. If you vibe, add them as a friend. If not, skip!</Text>
          <View style={styles.howItWorks}>
            <Text style={styles.howTitle}>How it works:</Text>
            <Text style={styles.howStep}>1️⃣  Tap "Find Match"</Text>
            <Text style={styles.howStep}>2️⃣  Wait to be paired anonymously</Text>
            <Text style={styles.howStep}>3️⃣  Chat freely — they don't know who you are</Text>
            <Text style={styles.howStep}>4️⃣  Like them? Add as friend ➕</Text>
            <Text style={styles.howStep}>5️⃣  Don't vibe? Skip ⏭ for someone new</Text>
          </View>
          <TouchableOpacity style={styles.findBtn} onPress={findMatch} activeOpacity={0.8}>
            <Text style={styles.findBtnText}>🎲  Find Match</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (status === 'waiting') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStatus('idle'); socketRef.current.emit('skip_match', { userId }); }} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Finding Match...</Text>
        </View>
        <View style={styles.waitingContent}>
          <ActivityIndicator size="large" color="#6c63ff" />
          <Text style={styles.waitingText}>Looking for someone to chat with...</Text>
          <Text style={styles.waitingSubText}>This may take a moment</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setStatus('idle'); socketRef.current.emit('skip_match', { userId }); }}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={skipMatch} style={styles.backBtn}>
          <Text style={styles.backText}>⏭ Skip</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎭 Anonymous Chat</Text>
        <TouchableOpacity onPress={addFriend} style={styles.addFriendBtn}>
          <Text style={styles.addFriendText}>➕ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => (
          <View style={[styles.bubbleWrap, item.sender === 'me' ? styles.meWrap : styles.themWrap]}>
            <View style={[styles.bubble, item.sender === 'me' ? styles.meBubble : styles.themBubble]}>
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>You're connected! Say hello 👋</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message anonymously..."
          placeholderTextColor="#444"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!message.trim()}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: '#0d0d14', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  backBtn: { padding: 8 },
  backText: { color: '#6c63ff', fontSize: 16, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  addFriendBtn: { backgroundColor: '#00c853', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  addFriendText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  idleContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  idleEmoji: { fontSize: 64, marginBottom: 16 },
  idleTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  idleDesc: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  howItWorks: { backgroundColor: '#0d0d14', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32, borderWidth: 1, borderColor: '#1a1a2e' },
  howTitle: { color: '#6c63ff', fontWeight: 'bold', fontSize: 14, marginBottom: 12, letterSpacing: 1 },
  howStep: { color: '#888', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  findBtn: { backgroundColor: '#6c63ff', paddingHorizontal: 48, paddingVertical: 18, borderRadius: 50 },
  findBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  waitingContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  waitingText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  waitingSubText: { color: '#555', fontSize: 14 },
  cancelBtn: { marginTop: 16, padding: 12 },
  cancelBtnText: { color: '#ff4d4d', fontSize: 16 },
  messagesList: { padding: 16 },
  bubbleWrap: { marginBottom: 8 },
  meWrap: { alignItems: 'flex-end' },
  themWrap: { alignItems: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  meBubble: { backgroundColor: '#6c63ff', borderBottomRightRadius: 4 },
  themBubble: { backgroundColor: '#111120', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#1a1a2e' },
  msgText: { color: '#fff', fontSize: 15 },
  emptyChat: { alignItems: 'center', paddingTop: 60 },
  emptyChatText: { color: '#444', fontSize: 16 },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: '#0d0d14', borderTopWidth: 1, borderTopColor: '#1a1a2e', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, backgroundColor: '#111120', color: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, maxHeight: 120, fontSize: 15, borderWidth: 1, borderColor: '#1e1e3a' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#1a1a2e' },
  sendBtnText: { color: '#fff', fontSize: 20 },
});