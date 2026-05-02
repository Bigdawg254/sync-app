import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, StatusBar, Animated } from 'react-native';
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
  const inputRef = useRef(null);

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

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: msgText,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
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

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender === 'me';
    const prevMsg = messages[index - 1];
    const showAvatar = !isMe && (!prevMsg || prevMsg.sender !== 'them');

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
        {!isMe && (
          <View style={[styles.msgAvatar, { opacity: showAvatar ? 1 : 0 }]}>
            <Text style={styles.msgAvatarText}>{friendName ? friendName[0].toUpperCase() : '?'}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
            {item.text}
          </Text>
          <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
            {item.time} {isMe && '✓✓'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d18" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>

        {/* Premium Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerProfile}
            onPress={() => router.push({ pathname: '/user-profile', params: { userId: friendId } })}
            activeOpacity={0.8}>
            <View style={styles.headerAvatarWrap}>
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>{friendName ? friendName[0].toUpperCase() : '?'}</Text>
              </View>
              {connected && <View style={styles.onlineDot} />}
            </View>
            <View>
              <Text style={styles.headerName}>{friendName || 'Chat'}</Text>
              <Text style={styles.headerStatus}>{connected ? 'Online' : 'Connecting...'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => router.push({ pathname: '/call', params: { friendId, friendName } })}
            activeOpacity={0.7}>
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👋</Text>
              <Text style={styles.emptyTitle}>Say hello!</Text>
              <Text style={styles.emptySub}>Start your conversation with {friendName}</Text>
            </View>
          }
        />

        {/* Premium Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor="#333"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, message.trim() ? styles.sendBtnActive : styles.sendBtnInactive]}
            onPress={sendMessage}
            disabled={!message.trim()}
            activeOpacity={0.8}>
            <Text style={styles.sendIcon}>{message.trim() ? '➤' : '🎤'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#08080f' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 52 : 44, paddingBottom: 12, backgroundColor: '#0d0d18', borderBottomWidth: 1, borderBottomColor: '#111125' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: '#6c63ff', fontSize: 34, fontWeight: '300', marginTop: -4 },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#00e676', borderWidth: 2, borderColor: '#0d0d18' },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerStatus: { color: '#00e676', fontSize: 11, marginTop: 1 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111125', justifyContent: 'center', alignItems: 'center' },
  callIcon: { fontSize: 18 },
  messagesList: { paddingHorizontal: 12, paddingVertical: 16, paddingBottom: 8, flexGrow: 1 },
  msgRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginRight: 6, marginBottom: 2 },
  msgAvatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, borderRadius: 20 },
  bubbleMe: { backgroundColor: '#6c63ff', borderBottomRightRadius: 5, marginLeft: 40 },
  bubbleThem: { backgroundColor: '#141428', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#1e1e3a' },
  bubbleText: { fontSize: 15.5, lineHeight: 22 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: '#e8e8f0' },
  bubbleTime: { fontSize: 10, marginTop: 3, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.45)' },
  bubbleTimeThem: { color: 'rgba(200,200,220,0.4)' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { color: '#333', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 12, backgroundColor: '#0d0d18', borderTopWidth: 1, borderTopColor: '#111125', gap: 8 },
  inputWrap: { flex: 1, backgroundColor: '#111125', borderRadius: 24, borderWidth: 1, borderColor: '#1e1e3a', paddingHorizontal: 16, paddingVertical: 4, minHeight: 48, justifyContent: 'center' },
  input: { color: '#fff', fontSize: 15.5, maxHeight: 120, paddingVertical: 8 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  sendBtnActive: { backgroundColor: '#6c63ff', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  sendBtnInactive: { backgroundColor: '#111125', borderWidth: 1, borderColor: '#1e1e3a' },
  sendIcon: { fontSize: 20 },
});