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
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const roomRef = useRef(null);

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

    // Load message history
    try {
      const response = await fetch(`${API}/api/messages/${friendId}?senderId=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setMessages(data.map(msg => ({
          id: msg.id.toString(),
          text: msg.content,
          sender: msg.sender_id.toString() === id ? 'me' : 'them',
          time: new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
      }
    } catch (err) {
      console.log('Message load error:', err);
    }

    // Setup socket
    const room = [id, friendId].sort().join('_');
    roomRef.current = room;

    socketRef.current = io(API, {
      transports: ['websocket'],
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      socketRef.current.emit('join_room', room);
    });

    socketRef.current.on('receive_message', (data) => {
      if (data.sender_id && data.sender_id.toString() !== id) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: data.text,
          sender: 'them',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      }
    });

    socketRef.current.on('disconnect', () => setConnected(false));
  };

  const sendMessage = async () => {
    if (!message.trim() || !userId) return;
    const token = await SecureStore.getItemAsync('userToken');
    const msgText = message.trim();
    setMessage('');

    const newMsg = {
      id: Date.now().toString(),
      text: msgText,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

    // Save to DB
    try {
      await fetch(`${API}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sender_id: userId,
          receiver_id: friendId,
          content: msgText
        })
      });
    } catch (err) {
      console.log('Save message error:', err);
    }

    // Send via socket
    if (socketRef.current && roomRef.current) {
      socketRef.current.emit('send_message', {
        room: roomRef.current,
        text: msgText,
        sender_id: userId
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {friendName ? friendName[0].toUpperCase() : '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{friendName || 'Chat'}</Text>
            <Text style={styles.headerStatus}>{connected ? '🟢 Online' : '⚫ Connecting...'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push({ pathname: '/call', params: { friendId, friendName } })}>
          <Text style={styles.callBtn}>📞</Text>
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
              <Text style={styles.msgTime}>{item.time}</Text>
            </View>
          </View>
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>Say hello to {friendName}! 👋</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor="#555"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!message.trim()}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingTop: 50, backgroundColor: '#1a1a2e' },
  back: { color: '#6c63ff', fontSize: 22, paddingRight: 8 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerStatus: { color: '#888', fontSize: 12 },
  callBtn: { fontSize: 22 },
  messagesList: { padding: 16, paddingBottom: 8 },
  bubbleWrap: { marginBottom: 8 },
  meWrap: { alignItems: 'flex-end' },
  themWrap: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  meBubble: { backgroundColor: '#6c63ff', borderBottomRightRadius: 4 },
  themBubble: { backgroundColor: '#1e1e1e', borderBottomLeftRadius: 4 },
  msgText: { color: '#fff', fontSize: 15 },
  msgTime: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyChatText: { color: '#555', fontSize: 16 },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#1a1a2e', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, backgroundColor: '#2d2d44', color: '#fff', padding: 12, borderRadius: 20, maxHeight: 100, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#2d2d44' },
  sendText: { color: '#fff', fontSize: 18 },
});