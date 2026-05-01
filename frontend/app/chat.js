import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
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

    const room = [id, friendId].sort().join('_');
    roomRef.current = room;

    socketRef.current = io(API, { transports: ['websocket'], reconnection: true });

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
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await fetch(`${API}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sender_id: userId, receiver_id: friendId, content: msgText })
      });
    } catch (err) {
      console.log('Save error:', err);
    }

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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{friendName ? friendName[0].toUpperCase() : '?'}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{friendName || 'Chat'}</Text>
            <Text style={styles.headerStatus}>{connected ? '🟢 Online' : '⚫ Connecting...'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => router.push({ pathname: '/call', params: { friendId, friendName } })}>
          <Text style={styles.callBtnText}>📞</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={[styles.bubbleWrap, item.sender === 'me' ? styles.meWrap : styles.themWrap]}>
            <View style={[styles.bubble, item.sender === 'me' ? styles.meBubble : styles.themBubble]}>
              <Text style={styles.msgText}>{item.text}</Text>
              <Text style={styles.msgTime}>{item.time}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatEmoji}>👋</Text>
            <Text style={styles.emptyChatText}>Say hello to {friendName}!</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor="#444"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!message.trim()}
          activeOpacity={0.8}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: '#0d0d14', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  backBtn: { padding: 8, marginRight: 4 },
  backText: { color: '#6c63ff', fontSize: 24 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  headerName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerStatus: { color: '#555', fontSize: 12, marginTop: 2 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111120', justifyContent: 'center', alignItems: 'center' },
  callBtnText: { fontSize: 20 },
  messagesList: { padding: 16, paddingBottom: 8 },
  bubbleWrap: { marginBottom: 8 },
  meWrap: { alignItems: 'flex-end' },
  themWrap: { alignItems: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  meBubble: { backgroundColor: '#6c63ff', borderBottomRightRadius: 4 },
  themBubble: { backgroundColor: '#111120', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#1a1a2e' },
  msgText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  msgTime: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  emptyChat: { alignItems: 'center', paddingTop: 80 },
  emptyChatEmoji: { fontSize: 48, marginBottom: 12 },
  emptyChatText: { color: '#444', fontSize: 16 },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: '#0d0d14', borderTopWidth: 1, borderTopColor: '#1a1a2e', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, backgroundColor: '#111120', color: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, maxHeight: 120, fontSize: 15, borderWidth: 1, borderColor: '#1e1e3a' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#1a1a2e' },
  sendBtnText: { color: '#fff', fontSize: 20 },
});