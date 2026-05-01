import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
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
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
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
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 300);
      }
    } catch (err) { console.log(err); }

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
    const newMsg = { id: Date.now().toString(), text: msgText, sender: 'me', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, newMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await fetch(`${API}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sender_id: userId, receiver_id: friendId, content: msgText })
      });
    } catch (err) { console.log(err); }

    if (socketRef.current && roomRef.current) {
      socketRef.current.emit('send_message', { room: roomRef.current, text: msgText, sender_id: userId });
    }
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d14" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerInfo}
            onPress={() => router.push({ pathname: '/user-profile', params: { userId: friendId } })}
            activeOpacity={0.7}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{friendName ? friendName[0].toUpperCase() : '?'}</Text>
            </View>
            <View>
              <Text style={styles.headerName}>{friendName || 'Chat'}</Text>
              <Text style={styles.headerStatus}>{connected ? '🟢 Online' : '⚫ Connecting...'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.callBtn} onPress={() => router.push({ pathname: '/call', params: { friendId, friendName } })}>
            <Text style={styles.callBtnText}>📞</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#050508' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 48, paddingBottom: 12, backgroundColor: '#0d0d14', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  backBtn: { padding: 8 },
  backText: { color: '#6c63ff', fontSize: 24 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  headerName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerStatus: { color: '#555', fontSize: 12, marginTop: 1 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111120', justifyContent: 'center', alignItems: 'center' },
  callBtnText: { fontSize: 20 },
  messagesList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  bubbleWrap: { marginBottom: 6 },
  meWrap: { alignItems: 'flex-end' },
  themWrap: { alignItems: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  meBubble: { backgroundColor: '#6c63ff', borderBottomRightRadius: 4 },
  themBubble: { backgroundColor: '#111120', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#1a1a2e' },
  msgText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  msgTime: { color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3, textAlign: 'right' },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyChatEmoji: { fontSize: 48, marginBottom: 12 },
  emptyChatText: { color: '#444', fontSize: 16 },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 12, backgroundColor: '#0d0d14', borderTopWidth: 1, borderTopColor: '#1a1a2e', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, backgroundColor: '#111120', color: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 24, maxHeight: 120, fontSize: 15, borderWidth: 1, borderColor: '#1e1e3a' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  sendBtnDisabled: { backgroundColor: '#1a1a2e' },
  sendBtnText: { color: '#fff', fontSize: 20 },
});