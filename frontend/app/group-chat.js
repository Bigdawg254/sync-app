import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function GroupChatScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [showCreate, setShowCreate] = useState(true);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const [groupId, setGroupId] = useState(null);

  useEffect(() => {
    initSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const initSocket = async () => {
    const id = await SecureStore.getItemAsync('userId');
    const token = await SecureStore.getItemAsync('userToken');
    setUserId(id);

    const userResponse = await fetch(`${API}/api/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const userData = await userResponse.json();
    setUsername(userData.username);

    socketRef.current = io(API);

    socketRef.current.on('receive_message', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: data.text,
        sender: data.sender_id === id ? 'me' : 'them',
        username: data.username
      }]);
      flatListRef.current?.scrollToEnd();
    });
  };

  const createGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    const id = `group_${Date.now()}`;
    setGroupId(id);
    socketRef.current.emit('join_room', id);
    setShowCreate(false);
  };

  const sendMessage = () => {
    if (!message.trim() || !groupId) return;

    socketRef.current.emit('send_message', {
      room: groupId,
      text: message,
      sender_id: userId,
      username: username
    });

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: message,
      sender: 'me',
      username: 'Me'
    }]);
    setMessage('');
    flatListRef.current?.scrollToEnd();
  };

  if (showCreate) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/home')}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Group</Text>
        </View>

        <View style={styles.createForm}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter group name..."
            placeholderTextColor="#888"
            value={groupName}
            onChangeText={setGroupName}
          />
          <Text style={styles.hint}>Share the group code with friends to join!</Text>
          <TouchableOpacity style={styles.createBtn} onPress={createGroup}>
            <Text style={styles.createBtnText}>Create Group</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>— OR —</Text>

          <Text style={styles.label}>Join with Group Code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter group code..."
            placeholderTextColor="#888"
            value={groupId || ''}
            onChangeText={setGroupId}
          />
          <TouchableOpacity style={styles.joinBtn} onPress={() => {
            if (!groupId) return;
            socketRef.current.emit('join_room', groupId);
            setGroupName('Group Chat');
            setShowCreate(false);
          }}>
            <Text style={styles.joinBtnText}>Join Group</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowCreate(true)}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{groupName}</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert('Group Code', `Share this code: ${groupId}`);
        }}>
          <Text style={styles.shareBtn}>Share 🔗</Text>
        </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, backgroundColor: '#1a1a2e' },
  back: { color: '#6c63ff', fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  shareBtn: { color: '#6c63ff', fontSize: 14 },
  createForm: { padding: 24 },
  label: { color: '#888', marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 14, borderRadius: 10, marginBottom: 16 },
  hint: { color: '#555', fontSize: 13, marginBottom: 16 },
  createBtn: { backgroundColor: '#6c63ff', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 24 },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  orText: { color: '#555', textAlign: 'center', marginBottom: 24 },
  joinBtn: { backgroundColor: '#1a1a2e', padding: 16, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#6c63ff' },
  joinBtnText: { color: '#6c63ff', fontWeight: 'bold', fontSize: 16 },
  bubbleContainer: { marginHorizontal: 16, marginBottom: 10 },
  meContainer: { alignItems: 'flex-end' },
  themContainer: { alignItems: 'flex-start' },
  senderName: { color: '#6c63ff', fontSize: 12, marginBottom: 4 },
  bubble: { padding: 12, borderRadius: 10, maxWidth: '75%' },
  me: { backgroundColor: '#6c63ff' },
  them: { backgroundColor: '#1e1e1e' },
  msgText: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: 12, alignItems: 'center', backgroundColor: '#1a1a2e' },
  sendBtn: { backgroundColor: '#6c63ff', padding: 12, borderRadius: 20, marginLeft: 8 },
  sendText: { color: '#fff', fontWeight: 'bold' },
});