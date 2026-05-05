import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { io } from 'socket.io-client';
import { storage } from './storage';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function ChatScreen() {
  const router = useRouter();
  const { friendId, friendName } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const roomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    initChat();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const initChat = async () => {
    const id = await storage.get('userId');
    const token = await storage.get('userToken');
    const uname = await storage.get('username');
    setUserId(id);

    try {
      const res = await fetch(`${API}/api/messages/${friendId}?senderId=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data.map(msg => ({
          id: msg.id.toString(),
          text: msg.content,
          sender: msg.sender_id.toString() === id ? 'me' : 'them',
          time: new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: msg.is_read
        })));
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 300);
      }
    } catch (err) { console.log(err); }

    const room = [id, friendId].sort().join('_');
    roomRef.current = room;

    socketRef.current = io(API, { transports: ['websocket'], reconnection: true });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('user_online', id);
      socketRef.current.emit('join_room', room);
      socketRef.current.emit('check_online_status', [friendId]);
    });

    socketRef.current.on('online_statuses', (statuses) => {
      setIsOnline(!!statuses[friendId]);
    });

    socketRef.current.on('user_status_change', ({ userId: uid, online }) => {
      if (uid.toString() === friendId.toString()) {
        setIsOnline(online);
      }
    });

    socketRef.current.on('user_typing', ({ userId: uid }) => {
      if (uid.toString() === friendId.toString()) {
        setIsTyping(true);
      }
    });

    socketRef.current.on('user_stopped_typing', ({ userId: uid }) => {
      if (uid.toString() === friendId.toString()) {
        setIsTyping(false);
      }
    });

    socketRef.current.on('receive_message', (data) => {
      if (data.sender_id && data.sender_id.toString() !== id) {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: data.text,
          sender: 'them',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        }]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
  };

  const handleTyping = (text) => {
    setMessage(text);
    if (socketRef.current && roomRef.current && userId) {
      socketRef.current.emit('typing_start', { room: roomRef.current, userId, username: '' });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('typing_stop', { room: roomRef.current, userId });
      }, 1500);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !userId) return;
    const token = await storage.get('userToken');
    const msgText = message.trim();
    setMessage('');

    if (socketRef.current) {
      socketRef.current.emit('typing_stop', { room: roomRef.current, userId });
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: msgText,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
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

  const startCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('call_user', {
        targetUserId: friendId,
        callerId: userId,
        callerName: 'You',
        callType: 'voice'
      });
    }
    router.push({ pathname: '/call', params: { friendId, friendName, isOutgoing: 'true' } });
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
          <Text style={styles.bubbleText}>{item.text}</Text>
          <View style={styles.bubbleMeta}>
            <Text style={styles.bubbleTime}>{item.time}</Text>
            {isMe && <Text style={styles.readTick}>{item.read ? '✓✓' : '✓'}</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a14" />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
              <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#00e676' : '#555' }]} />
            </View>
            <View>
              <Text style={styles.headerName}>{friendName || 'Chat'}</Text>
              {isTyping ? (
                <Text style={styles.typingText}>typing...</Text>
              ) : (
                <Text style={[styles.headerStatus, { color: isOnline ? '#00e676' : '#555' }]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionBtn} onPress={startCall} activeOpacity={0.7}>
              <Text style={styles.headerActionIcon}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionBtn} onPress={() => router.push({ pathname: '/call', params: { friendId, friendName, isVideo: 'true' } })} activeOpacity={0.7}>
              <Text style={styles.headerActionIcon}>📹</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👋</Text>
              <Text style={styles.emptyText}>Say hello to {friendName}!</Text>
            </View>
          }
        />

        {isTyping && (
          <View style={styles.typingBubble}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
          </View>
        )}

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor="#2a2a3a"
              value={message}
              onChangeText={handleTyping}
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
  outerContainer: { flex: 1, backgroundColor: '#02020a' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: Platform.OS === 'ios' ? 52 : 40, paddingBottom: 10, backgroundColor: '#0a0a14', borderBottomWidth: 1, borderBottomColor: '#0f0f1e' },
  backBtn: { width: 40, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: '#6c63ff', fontSize: 36, fontWeight: '200', marginTop: -4 },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#0a0a14' },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerStatus: { fontSize: 12, marginTop: 1 },
  typingText: { color: '#6c63ff', fontSize: 12, marginTop: 1, fontStyle: 'italic' },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0f0f1e', justifyContent: 'center', alignItems: 'center' },
  headerActionIcon: { fontSize: 18 },
  messagesList: { paddingHorizontal: 12, paddingVertical: 16, flexGrow: 1 },
  msgRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  msgAvatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  bubble: { maxWidth: '76%', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, borderRadius: 20 },
  bubbleMe: { backgroundColor: '#6c63ff', borderBottomRightRadius: 5, marginLeft: 40 },
  bubbleThem: { backgroundColor: '#0f0f1e', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#1a1a2e' },
  bubbleText: { color: '#fff', fontSize: 15.5, lineHeight: 22 },
  bubbleMeta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 3 },
  bubbleTime: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  readTick: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyText: { color: '#333', fontSize: 16 },
  typingBubble: { paddingHorizontal: 16, paddingVertical: 8 },
  typingDots: { flexDirection: 'row', backgroundColor: '#0f0f1e', padding: 12, borderRadius: 20, borderBottomLeftRadius: 5, alignSelf: 'flex-start', gap: 4, borderWidth: 1, borderColor: '#1a1a2e' },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6c63ff' },
  typingDot1: { opacity: 0.4 },
  typingDot2: { opacity: 0.7 },
  typingDot3: { opacity: 1 },
  inputBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 12, backgroundColor: '#0a0a14', borderTopWidth: 1, borderTopColor: '#0f0f1e', alignItems: 'flex-end', gap: 8 },
  inputWrap: { flex: 1, backgroundColor: '#0f0f1e', borderRadius: 24, borderWidth: 1, borderColor: '#1a1a2e', paddingHorizontal: 16, paddingVertical: 4, minHeight: 48, justifyContent: 'center' },
  input: { color: '#fff', fontSize: 15.5, maxHeight: 120, paddingVertical: 8 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  sendBtnActive: { backgroundColor: '#6c63ff', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  sendBtnInactive: { backgroundColor: '#0f0f1e', borderWidth: 1, borderColor: '#1a1a2e' },
  sendIcon: { fontSize: 20 },
});