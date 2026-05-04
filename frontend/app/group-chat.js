import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { io } from 'socket.io-client';
import { storage } from './login';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function GroupChatScreen() {
  const router = useRouter();
  const [screen, setScreen] = useState('list'); // list | create | join | chat
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadData();
    initSocket();
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  const loadData = async () => {
    const id = await storage.get('userId');
    const uname = await storage.get('username');
    setUserId(id);
    setUsername(uname);
    await loadGroups(id);
  };

  const loadGroups = async (id) => {
    try {
      const token = await storage.get('userToken');
      const res = await fetch(`${API}/api/groups/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  const initSocket = async () => {
    socketRef.current = io(API, { transports: ['websocket'] });
  };

  const createGroup = async () => {
    if (!groupName.trim()) { Alert.alert('Error', 'Enter a group name'); return; }
    try {
      const token = await storage.get('userToken');
      const res = await fetch(`${API}/api/groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: groupName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setGroupName('');
        await loadGroups(userId);
        Alert.alert('✅ Group Created!', `Share code: ${data.code}`, [
          { text: 'Open Group', onPress: () => openGroup(data) }
        ]);
        setScreen('list');
      } else {
        Alert.alert('Error', data.error);
      }
    } catch { Alert.alert('Error', 'Cannot connect'); }
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) { Alert.alert('Error', 'Enter a group code'); return; }
    try {
      const token = await storage.get('userToken');
      const res = await fetch(`${API}/api/groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() })
      });
      const data = await res.json();
      if (res.ok) {
        setJoinCode('');
        await loadGroups(userId);
        Alert.alert('✅ Joined!', `Welcome to ${data.name}`);
        setScreen('list');
      } else {
        Alert.alert('Error', data.error);
      }
    } catch { Alert.alert('Error', 'Cannot connect'); }
  };

  const openGroup = async (group) => {
    setActiveGroup(group);
    setMessages([]);
    setScreen('chat');

    // Load messages
    try {
      const token = await storage.get('userToken');
      const res = await fetch(`${API}/api/groups/${group.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data.map(m => ({
          id: m.id.toString(),
          text: m.content,
          sender: m.sender_id.toString() === userId ? 'me' : 'them',
          username: m.username,
          time: new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
        setTimeout(() => flatListRef.current?.scrollToEnd(), 300);
      }
    } catch {}

    // Join socket room
    socketRef.current.emit('join_room', `group_${group.id}`);
    socketRef.current.off('receive_message');
    socketRef.current.on('receive_message', (data) => {
      if (data.sender_id !== userId) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: data.text,
          sender: 'them',
          username: data.username || 'Member',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      }
    });
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    const token = await storage.get('userToken');
    const msgText = message.trim();
    setMessage('');

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: msgText,
      sender: 'me',
      username: 'Me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

    socketRef.current.emit('send_message', {
      room: `group_${activeGroup.id}`,
      text: msgText,
      sender_id: userId,
      username
    });

    try {
      await fetch(`${API}/api/groups/${activeGroup.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: msgText })
      });
    } catch {}
  };

  const leaveGroup = async (groupId) => {
    Alert.alert('Leave Group', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        const token = await storage.get('userToken');
        await fetch(`${API}/api/groups/${groupId}/leave`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        await loadGroups(userId);
        if (screen === 'chat') setScreen('list');
      }}
    ]);
  };

  // LIST SCREEN
  if (screen === 'list') return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity onPress={() => setScreen('create')} style={styles.addBtn}>
          <Text style={styles.addBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionCard} onPress={() => setScreen('create')} activeOpacity={0.8}>
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionTitle}>New Group</Text>
          <Text style={styles.actionSub}>Create a group</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => setScreen('join')} activeOpacity={0.8}>
          <Text style={styles.actionIcon}>🔗</Text>
          <Text style={styles.actionTitle}>Join Group</Text>
          <Text style={styles.actionSub}>Enter a code</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#6c63ff" size="large" /></View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No Groups Yet</Text>
          <Text style={styles.emptySub}>Create a group or join one with a code</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.groupRow} onPress={() => openGroup(item)} activeOpacity={0.75}>
              <View style={styles.groupAvatar}>
                <Text style={styles.groupAvatarText}>{item.name[0].toUpperCase()}</Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupCode}>Code: {item.code} · {item.member_count} members</Text>
              </View>
              <TouchableOpacity onPress={() => leaveGroup(item.id)} style={styles.leaveBtn}>
                <Text style={styles.leaveBtnText}>Leave</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  // CREATE SCREEN
  if (screen === 'create') return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('list')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.formWrap}>
        <Text style={styles.formLabel}>GROUP NAME</Text>
        <TextInput
          style={styles.formInput}
          placeholder="Enter group name..."
          placeholderTextColor="#333"
          value={groupName}
          onChangeText={setGroupName}
          autoFocus
        />
        <Text style={styles.formHint}>A unique code will be generated for friends to join</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={createGroup} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>Create Group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // JOIN SCREEN
  if (screen === 'join') return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('list')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Group</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.formWrap}>
        <Text style={styles.formLabel}>GROUP CODE</Text>
        <TextInput
          style={[styles.formInput, styles.codeInput]}
          placeholder="Enter 6-character code"
          placeholderTextColor="#333"
          value={joinCode}
          onChangeText={setJoinCode}
          autoCapitalize="characters"
          maxLength={6}
          autoFocus
        />
        <Text style={styles.formHint}>Ask the group creator for the code</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={joinGroup} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>Join Group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // CHAT SCREEN
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('list')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.groupAvatarSmall}>
            <Text style={styles.groupAvatarSmallText}>{activeGroup?.name[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.headerTitle2}>{activeGroup?.name}</Text>
            <TouchableOpacity onPress={() => Alert.alert('Group Code', `Share: ${activeGroup?.code}`)}>
              <Text style={styles.groupCodeSmall}>Code: {activeGroup?.code} · tap to share</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={() => leaveGroup(activeGroup?.id)} style={styles.leaveBtnHeader}>
          <Text style={styles.leaveBtnHeaderText}>Leave</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.msgList}
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.sender === 'me' ? styles.msgMe : styles.msgThem]}>
            {item.sender !== 'me' && (
              <View style={styles.msgAvatar}>
                <Text style={styles.msgAvatarText}>{item.username[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={[styles.msgBubble, item.sender === 'me' ? styles.bubbleMe : styles.bubbleThem]}>
              {item.sender !== 'me' && <Text style={styles.msgSender}>{item.username}</Text>}
              <Text style={styles.msgText}>{item.text}</Text>
              <Text style={styles.msgTime}>{item.time}</Text>
            </View>
          </View>
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyChatText}>Say hello to the group! 👋</Text></View>}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          placeholder="Message group..."
          placeholderTextColor="#333"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, !message.trim() && styles.sendBtnOff]} onPress={sendMessage} disabled={!message.trim()}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02020a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 12, backgroundColor: '#0d0d18', borderBottomWidth: 1, borderBottomColor: '#111125' },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#6c63ff', fontSize: 24 },
  headerTitle: { flex: 1, color: '#fff', fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
  addBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#6c63ff', fontSize: 24 },
  actionRow: { flexDirection: 'row', gap: 12, padding: 16 },
  actionCard: { flex: 1, backgroundColor: '#0d0d18', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#111125' },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  actionSub: { color: '#444', fontSize: 12 },
  groupRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#06060f' },
  groupAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  groupAvatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  groupInfo: { flex: 1, marginLeft: 14 },
  groupName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  groupCode: { color: '#444', fontSize: 12, marginTop: 3 },
  leaveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#ff4d4d' },
  leaveBtnText: { color: '#ff4d4d', fontSize: 12, fontWeight: '600' },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { color: '#444', fontSize: 14, textAlign: 'center' },
  formWrap: { padding: 24 },
  formLabel: { color: '#6c63ff', fontSize: 11, fontWeight: 'bold', letterSpacing: 3, marginBottom: 12 },
  formInput: { backgroundColor: '#0d0d18', color: '#fff', padding: 18, borderRadius: 16, fontSize: 16, borderWidth: 1, borderColor: '#111125', marginBottom: 12 },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: 'bold' },
  formHint: { color: '#333', fontSize: 13, marginBottom: 28 },
  submitBtn: { backgroundColor: '#6c63ff', padding: 18, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  groupAvatarSmall: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  groupAvatarSmallText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerTitle2: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  groupCodeSmall: { color: '#6c63ff', fontSize: 11, marginTop: 1 },
  leaveBtnHeader: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#ff4d4d' },
  leaveBtnHeaderText: { color: '#ff4d4d', fontSize: 12 },
  msgList: { padding: 16, flexGrow: 1 },
  msgRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  msgMe: { justifyContent: 'flex-end' },
  msgThem: { justifyContent: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  msgAvatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  msgBubble: { maxWidth: '75%', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, borderRadius: 18 },
  bubbleMe: { backgroundColor: '#6c63ff', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#111120', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#1a1a2e' },
  msgSender: { color: '#6c63ff', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  msgText: { color: '#fff', fontSize: 15 },
  msgTime: { color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  emptyChatText: { color: '#333', fontSize: 16 },
  inputBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 12, backgroundColor: '#0d0d18', borderTopWidth: 1, borderTopColor: '#111125', gap: 8, alignItems: 'flex-end' },
  inputField: { flex: 1, backgroundColor: '#111120', color: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, maxHeight: 120, fontSize: 15, borderWidth: 1, borderColor: '#1e1e3a' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  sendBtnOff: { backgroundColor: '#111120', borderWidth: 1, borderColor: '#1e1e3a' },
  sendBtnText: { color: '#fff', fontSize: 20 },
});