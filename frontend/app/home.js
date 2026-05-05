import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Dimensions, Platform, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { storage } from './storage';
import { io } from 'socket.io-client';

const { width, height } = Dimensions.get('window');
const API = 'https://sync-app-production-2ff8.up.railway.app';
const COLORS = ['#6c63ff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9a3c'];

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [callLogs, setCallLogs] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [colorIdx, setColorIdx] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const logoAnim = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const socketRef = useRef(null);

  useFocusEffect(useCallback(() => {
    loadFriends();
    loadNotifs();
    loadCallLogs();
  }, []));

  useEffect(() => {
    initSocket();
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(logoOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(logoAnim, { toValue: 1.12, duration: 400, useNativeDriver: true }),
        Animated.timing(logoAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setColorIdx(p => (p + 1) % COLORS.length), 400);
    }, 60000);
    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const initSocket = async () => {
    const userId = await storage.get('userId');
    socketRef.current = io(API, { transports: ['websocket'] });
    socketRef.current.on('connect', () => {
      socketRef.current.emit('user_online', userId);
    });
    socketRef.current.on('user_status_change', ({ userId: uid, online }) => {
      setOnlineUsers(prev => ({ ...prev, [uid.toString()]: online }));
    });
    socketRef.current.on('incoming_call', ({ callerId, callerName, callType }) => {
      setIncomingCall({ callerId, callerName, callType });
    });
  };

  const loadFriends = async () => {
    try {
      const userId = await storage.get('userId');
      const token = await storage.get('userToken');
      const res = await fetch(`${API}/api/connections/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const friendList = Array.isArray(data) ? data : [];
      setFriends(friendList);
      if (socketRef.current && friendList.length > 0) {
        socketRef.current.emit('check_online_status', friendList.map(f => f.id));
        socketRef.current.on('online_statuses', (statuses) => {
          setOnlineUsers(prev => ({ ...prev, ...statuses }));
        });
      }
    } catch {}
    setLoading(false);
  };

  const loadNotifs = async () => {
    try {
      const userId = await storage.get('userId');
      const token = await storage.get('userToken');
      const res = await fetch(`${API}/api/connections/notifications/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setNotifCount(data.filter(n => !n.is_read).length);
    } catch {}
  };

  const loadCallLogs = async () => {
    try {
      const token = await storage.get('userToken');
      const res = await fetch(`${API}/api/calls/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCallLogs(Array.isArray(data) ? data : []);
    } catch {}
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    setIncomingCall(null);
    router.push({
      pathname: '/call',
      params: {
        friendId: incomingCall.callerId,
        friendName: incomingCall.callerName,
        isIncoming: 'true',
        callerId: incomingCall.callerId,
        callerName: incomingCall.callerName,
        isVideo: incomingCall.callType === 'video' ? 'true' : 'false'
      }
    });
  };

  const rejectIncomingCall = async () => {
    if (!incomingCall) return;
    if (socketRef.current) {
      socketRef.current.emit('reject_call', { callerId: incomingCall.callerId });
    }
    setIncomingCall(null);
  };

  const renderFriend = ({ item }) => {
    const isOnline = !!onlineUsers[item.id?.toString()];
    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => router.push({ pathname: '/chat', params: { friendId: item.id, friendName: item.username } })}
        onLongPress={() => router.push({ pathname: '/chat-options', params: { friendId: item.id, friendName: item.username } })}
        activeOpacity={0.75}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.id } })} activeOpacity={0.8}>
          <View style={{ position: 'relative' }}>
            {item.profile_picture ? (
              <Image source={{ uri: item.profile_picture }} style={styles.chatAvatar} />
            ) : (
              <View style={[styles.chatAvatarFallback, { backgroundColor: COLORS[item.id % COLORS.length] }]}>
                <Text style={styles.chatAvatarLetter}>{item.username[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={[styles.onlinePip, { backgroundColor: isOnline ? '#00e676' : '#333' }]} />
          </View>
        </TouchableOpacity>
        <View style={styles.chatMeta}>
          <View style={styles.chatMetaTop}>
            <Text style={styles.chatName}>{item.username}</Text>
            <Text style={styles.chatTime}>{isOnline ? '🟢' : '⚫'}</Text>
          </View>
          <Text style={styles.chatPreview}>{isOnline ? 'Online now' : 'Tap to chat'}</Text>
        </View>
        <Text style={styles.chatChevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderCallLog = ({ item }) => {
    const userId = item.caller_id?.toString();
    const isOutgoing = true;
    const otherName = item.caller_name || item.receiver_name || 'Unknown';
    const statusIcon = item.status === 'completed' ? '📞' : item.status === 'missed' ? '📵' : '❌';
    const statusColor = item.status === 'completed' ? '#00e676' : item.status === 'missed' ? '#ff4d4d' : '#888';
    const formatDur = (s) => s > 0 ? `${Math.floor(s/60)}m ${s%60}s` : '';

    return (
      <TouchableOpacity
        style={styles.callRow}
        onPress={() => router.push({ pathname: '/call', params: { friendId: item.receiver_id, friendName: otherName } })}
        activeOpacity={0.8}>
        <View style={styles.callAvatar}>
          <Text style={styles.callAvatarText}>{otherName[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.callInfo}>
          <Text style={styles.callName}>{otherName}</Text>
          <Text style={[styles.callStatus, { color: statusColor }]}>
            {statusIcon} {item.status} {item.call_type === 'video' ? '• Video' : '• Voice'}
            {item.duration > 0 ? ` • ${formatDur(item.duration)}` : ''}
          </Text>
        </View>
        <View style={styles.callRight}>
          <Text style={styles.callDate}>{new Date(item.started_at).toLocaleDateString()}</Text>
          <TouchableOpacity style={styles.callBackBtn} onPress={() => router.push({ pathname: '/call', params: { friendId: item.receiver_id, friendName: otherName } })}>
            <Text style={styles.callBackIcon}>📞</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const tabs = [
    { key: 'chats', icon: '💬', label: 'Chats' },
    { key: 'groups', icon: '👥', label: 'Groups' },
    { key: 'status', icon: '⭕', label: 'Status' },
    { key: 'calls', icon: '📞', label: 'Calls' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      {/* Incoming call banner */}
      {incomingCall && (
        <View style={styles.incomingCallBanner}>
          <View style={styles.incomingCallInfo}>
            <Text style={styles.incomingCallIcon}>📲</Text>
            <View>
              <Text style={styles.incomingCallName}>{incomingCall.callerName}</Text>
              <Text style={styles.incomingCallLabel}>Incoming {incomingCall.callType} call</Text>
            </View>
          </View>
          <View style={styles.incomingCallActions}>
            <TouchableOpacity style={styles.incomingReject} onPress={rejectIncomingCall}>
              <Text style={styles.incomingRejectText}>📵</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.incomingAccept} onPress={acceptIncomingCall}>
              <Text style={styles.incomingAcceptText}>📞</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <Animated.Text style={[styles.logo, { color: COLORS[colorIdx], transform: [{ scale: logoAnim }], opacity: logoOpacity }]}>
          SYNC
        </Animated.Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.hBtn} onPress={() => router.push('/requests')} activeOpacity={0.7}>
            <Text style={styles.hBtnIcon}>🔔</Text>
            {notifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.hBtn} onPress={() => router.push('/find-friends')} activeOpacity={0.7}>
            <Text style={styles.hBtnIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.hBtn} onPress={() => router.push('/profile')} activeOpacity={0.7}>
            <Text style={styles.hBtnIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)} activeOpacity={0.7}>
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'chats' && (
        <View style={styles.flex}>
          <TouchableOpacity style={styles.randomCard} onPress={() => router.push('/random-match')} activeOpacity={0.85}>
            <View style={styles.randomCardLeft}>
              <View style={styles.randomCardIcon}><Text style={styles.randomCardIconText}>🎲</Text></View>
              <View>
                <Text style={styles.randomCardTitle}>Random Match</Text>
                <Text style={styles.randomCardSub}>Meet someone anonymously</Text>
              </View>
            </View>
            <View style={styles.randomCardArrow}><Text style={styles.randomCardArrowText}>›</Text></View>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.center}><ActivityIndicator size="large" color="#6c63ff" /></View>
          ) : friends.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptySub}>Find friends and start talking!</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/find-friends')}>
                <Text style={styles.emptyBtnText}>🔍  Find Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList data={friends} keyExtractor={item => item.id.toString()} renderItem={renderFriend} showsVerticalScrollIndicator={false} />
          )}
        </View>
      )}

      {activeTab === 'groups' && (
        <View style={styles.flex}>
          <TouchableOpacity style={styles.createGroupRow} onPress={() => router.push('/group-chat')} activeOpacity={0.8}>
            <View style={styles.createGroupIcon}><Text style={styles.createGroupIconText}>➕</Text></View>
            <View>
              <Text style={styles.createGroupTitle}>New Group</Text>
              <Text style={styles.createGroupSub}>Create or join a group chat</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Groups Yet</Text>
            <Text style={styles.emptySub}>Create a group and share the code with friends</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/group-chat')}>
              <Text style={styles.emptyBtnText}>➕  Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTab === 'status' && (
        <View style={styles.flex}>
          <TouchableOpacity style={styles.myStatusRow} onPress={() => router.push('/status')} activeOpacity={0.8}>
            <View style={styles.myStatusIcon}><Text style={styles.myStatusIconText}>+</Text></View>
            <View>
              <Text style={styles.myStatusTitle}>My Status</Text>
              <Text style={styles.myStatusSub}>Tap to add or view status updates</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>⭕</Text>
            <Text style={styles.emptyTitle}>No Status Updates</Text>
            <Text style={styles.emptySub}>Add friends to see their status updates here</Text>
          </View>
        </View>
      )}

      {activeTab === 'calls' && (
        <View style={styles.flex}>
          {callLogs.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📞</Text>
              <Text style={styles.emptyTitle}>No Recent Calls</Text>
              <Text style={styles.emptySub}>Your call history will appear here</Text>
            </View>
          ) : (
            <FlatList data={callLogs} keyExtractor={item => item.id.toString()} renderItem={renderCallLog} showsVerticalScrollIndicator={false} />
          )}
        </View>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/find-friends')} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>✉️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02020a' },
  flex: { flex: 1 },
  bgOrb1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(108,99,255,0.08)', top: -60, right: -80 },
  bgOrb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(108,99,255,0.05)', bottom: 100, left: -60 },
  incomingCallBanner: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 44, left: 12, right: 12, backgroundColor: '#0d0d18', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#6c63ff', zIndex: 100, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 20 },
  incomingCallInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  incomingCallIcon: { fontSize: 28 },
  incomingCallName: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  incomingCallLabel: { color: '#6c63ff', fontSize: 12 },
  incomingCallActions: { flexDirection: 'row', gap: 10 },
  incomingReject: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#ff3b3b', justifyContent: 'center', alignItems: 'center' },
  incomingRejectText: { fontSize: 22 },
  incomingAccept: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#00c853', justifyContent: 'center', alignItems: 'center' },
  incomingAcceptText: { fontSize: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 14 },
  logo: { fontSize: 26, fontWeight: 'bold', letterSpacing: 10 },
  headerBtns: { flexDirection: 'row', gap: 6 },
  hBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#08080f', justifyContent: 'center', alignItems: 'center', position: 'relative', borderWidth: 1, borderColor: '#0f0f1e' },
  hBtnIcon: { fontSize: 20 },
  badge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ff4d4d', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', backgroundColor: '#060609', borderBottomWidth: 1, borderBottomColor: '#0d0d14' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabActive: {},
  tabIcon: { fontSize: 18, marginBottom: 3 },
  tabLabel: { color: '#2a2a3a', fontSize: 10, fontWeight: '600' },
  tabLabelActive: { color: '#6c63ff' },
  tabIndicator: { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, backgroundColor: '#6c63ff', borderRadius: 1 },
  randomCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginVertical: 12, padding: 16, backgroundColor: '#08080f', borderRadius: 18, borderWidth: 1, borderColor: '#6c63ff22' },
  randomCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  randomCardIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6c63ff15', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#6c63ff33' },
  randomCardIconText: { fontSize: 24 },
  randomCardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  randomCardSub: { color: '#333', fontSize: 12, marginTop: 2 },
  randomCardArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#6c63ff15', justifyContent: 'center', alignItems: 'center' },
  randomCardArrowText: { color: '#6c63ff', fontSize: 20 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#060609' },
  chatAvatar: { width: 56, height: 56, borderRadius: 28 },
  chatAvatarFallback: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  chatAvatarLetter: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  onlinePip: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: '#02020a' },
  chatMeta: { flex: 1, marginLeft: 14 },
  chatMetaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chatTime: { fontSize: 14 },
  chatPreview: { color: '#2a2a3a', fontSize: 13 },
  chatChevron: { color: '#1a1a2a', fontSize: 24, marginLeft: 8 },
  callRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#060609' },
  callAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  callAvatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  callInfo: { flex: 1, marginLeft: 14 },
  callName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  callStatus: { fontSize: 13, marginTop: 3 },
  callRight: { alignItems: 'flex-end', gap: 6 },
  callDate: { color: '#333', fontSize: 11 },
  callBackBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6c63ff15', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#6c63ff33' },
  callBackIcon: { fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  emptySub: { color: '#333', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { backgroundColor: '#6c63ff', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 14, marginTop: 28, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  createGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginVertical: 12, padding: 16, backgroundColor: '#08080f', borderRadius: 18, borderWidth: 1, borderColor: '#0f0f1e' },
  createGroupIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6c63ff15', justifyContent: 'center', alignItems: 'center' },
  createGroupIconText: { fontSize: 24 },
  createGroupTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  createGroupSub: { color: '#333', fontSize: 12, marginTop: 2 },
  myStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#060609' },
  myStatusIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#8a83ff' },
  myStatusIconText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  myStatusTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  myStatusSub: { color: '#333', fontSize: 13, marginTop: 2 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12 },
  fabIcon: { fontSize: 26 },
});