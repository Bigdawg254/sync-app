import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Dimensions, Platform, Image, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { storage } from './storage';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const API = 'https://sync-app-production-2ff8.up.railway.app';

const THEMES = {
  midnight: { name: '🌌 Midnight', bg: '#02020a', surface: '#08080f', card: '#0d0d18', border: '#111125', accent: '#6c63ff', text: '#ffffff', sub: '#2a2a3a' },
  ocean: { name: '🌊 Ocean', bg: '#011520', surface: '#012030', card: '#012840', border: '#013050', accent: '#00b4d8', text: '#ffffff', sub: '#1a3a4a' },
  forest: { name: '🌿 Forest', bg: '#010f07', surface: '#021a0b', card: '#032510', border: '#043015', accent: '#2d6a4f', text: '#ffffff', sub: '#1a3025' },
  rose: { name: '🌹 Rose', bg: '#0f0208', surface: '#1a0510', card: '#220618', border: '#2e0820', accent: '#c9184a', text: '#ffffff', sub: '#3a1520' },
  gold: { name: '✨ Gold', bg: '#080600', surface: '#100e00', card: '#181400', border: '#221e00', accent: '#d4a017', text: '#ffffff', sub: '#2a2400' },
  aurora: { name: '🌈 Aurora', bg: '#020812', surface: '#04101e', card: '#06182a', border: '#082036', accent: '#7b2fff', text: '#ffffff', sub: '#1a1a3a' },
};

const LOGO_COLORS = ['#6c63ff', '#ff6b6b', '#00b4d8', '#2d6a4f', '#d4a017', '#c9184a'];

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [callLogs, setCallLogs] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [colorIdx, setColorIdx] = useState(0);
  const [showThemes, setShowThemes] = useState(false);
  const [theme, setTheme] = useState(THEMES.midnight);
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
    loadTheme();
    initSocket();
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(logoOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(logoAnim, { toValue: 1.1, duration: 300, useNativeDriver: true }),
        Animated.timing(logoAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setColorIdx(p => (p + 1) % LOGO_COLORS.length), 300);
    }, 60000);
    return () => { clearInterval(interval); if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('sync_theme');
      if (saved && THEMES[saved]) setTheme(THEMES[saved]);
    } catch {}
  };

  const saveTheme = async (key) => {
    try {
      await AsyncStorage.setItem('sync_theme', key);
      setTheme(THEMES[key]);
      setShowThemes(false);
    } catch {}
  };

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
      const list = Array.isArray(data) ? data : [];
      setFriends(list);
      if (socketRef.current && list.length > 0) {
        socketRef.current.emit('check_online_status', list.map(f => f.id));
        socketRef.current.once('online_statuses', (statuses) => {
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
      const res = await fetch(`${API}/api/calls/my`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCallLogs(Array.isArray(data) ? data : []);
    } catch {}
  };

  const t = theme;

  const renderFriend = ({ item }) => {
    const isOnline = !!onlineUsers[item.id?.toString()];
    return (
      <TouchableOpacity
        style={[styles.chatRow, { borderBottomColor: t.border }]}
        onPress={() => router.push({ pathname: '/chat', params: { friendId: item.id, friendName: item.username } })}
        onLongPress={() => router.push({ pathname: '/chat-options', params: { friendId: item.id, friendName: item.username } })}
        activeOpacity={0.75}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.id } })} activeOpacity={0.8}>
          <View style={{ position: 'relative' }}>
            {item.profile_picture ? (
              <Image source={{ uri: item.profile_picture }} style={styles.chatAvatar} />
            ) : (
              <View style={[styles.chatAvatarFallback, { backgroundColor: t.accent }]}>
                <Text style={styles.chatAvatarLetter}>{item.username[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={[styles.onlinePip, { backgroundColor: isOnline ? '#00e676' : t.border, borderColor: t.bg }]} />
          </View>
        </TouchableOpacity>
        <View style={styles.chatMeta}>
          <View style={styles.chatMetaTop}>
            <Text style={[styles.chatName, { color: t.text }]}>{item.username}</Text>
            <Text style={{ color: isOnline ? '#00e676' : t.sub, fontSize: 11 }}>{isOnline ? 'online' : 'offline'}</Text>
          </View>
          <Text style={[styles.chatPreview, { color: t.sub }]}>Tap to chat</Text>
        </View>
        <Text style={[styles.chatChevron, { color: t.border }]}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderCallLog = ({ item }) => {
    const otherName = item.receiver_name || item.caller_name || 'Unknown';
    const statusColor = item.status === 'completed' ? '#00e676' : '#ff4d4d';
    const statusIcon = item.status === 'completed' ? '📞' : '📵';
    return (
      <TouchableOpacity style={[styles.callRow, { borderBottomColor: t.border }]} activeOpacity={0.8}>
        <View style={[styles.callAvatar, { backgroundColor: t.accent }]}>
          <Text style={styles.callAvatarText}>{otherName[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.callInfo}>
          <Text style={[styles.callName, { color: t.text }]}>{otherName}</Text>
          <Text style={[styles.callStatus, { color: statusColor }]}>{statusIcon} {item.status} · {item.call_type}</Text>
        </View>
        <Text style={{ color: t.sub, fontSize: 11 }}>{new Date(item.started_at).toLocaleDateString()}</Text>
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
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Subtle background pattern */}
      <View style={[styles.bgOrb1, { backgroundColor: t.accent + '10' }]} />
      <View style={[styles.bgOrb2, { backgroundColor: t.accent + '08' }]} />

      {/* Incoming call */}
      {incomingCall && (
        <View style={[styles.incomingBanner, { backgroundColor: t.card, borderColor: t.accent }]}>
          <View style={styles.incomingLeft}>
            <Text style={styles.incomingIcon}>📲</Text>
            <View>
              <Text style={[styles.incomingName, { color: t.text }]}>{incomingCall.callerName}</Text>
              <Text style={[styles.incomingLabel, { color: t.accent }]}>Incoming {incomingCall.callType} call</Text>
            </View>
          </View>
          <View style={styles.incomingBtns}>
            <TouchableOpacity style={styles.incomingReject} onPress={() => { socketRef.current?.emit('reject_call', { callerId: incomingCall.callerId }); setIncomingCall(null); }}>
              <Text style={{ fontSize: 22 }}>📵</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.incomingAccept} onPress={() => { setIncomingCall(null); router.push({ pathname: '/call', params: { friendId: incomingCall.callerId, friendName: incomingCall.callerName, isIncoming: 'true', callerId: incomingCall.callerId, callerName: incomingCall.callerName } }); }}>
              <Text style={{ fontSize: 22 }}>📞</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Animated.Text style={[styles.logo, { color: LOGO_COLORS[colorIdx], transform: [{ scale: logoAnim }], opacity: logoOpacity }]}>
          SYNC
        </Animated.Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={[styles.hBtn, { backgroundColor: t.surface, borderColor: t.border }]} onPress={() => router.push('/requests')} activeOpacity={0.7}>
            <Text style={styles.hBtnIcon}>🔔</Text>
            {notifCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{notifCount > 9 ? '9+' : notifCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.hBtn, { backgroundColor: t.surface, borderColor: t.border }]} onPress={() => setShowThemes(true)} activeOpacity={0.7}>
            <Text style={styles.hBtnIcon}>🎨</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.hBtn, { backgroundColor: t.surface, borderColor: t.border }]} onPress={() => router.push('/find-friends')} activeOpacity={0.7}>
            <Text style={styles.hBtnIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.hBtn, { backgroundColor: t.surface, borderColor: t.border }]} onPress={() => router.push('/profile')} activeOpacity={0.7}>
            <Text style={styles.hBtnIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && { borderBottomColor: t.accent, borderBottomWidth: 2 }]} onPress={() => setActiveTab(tab.key)} activeOpacity={0.7}>
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? t.accent : t.sub }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CHATS */}
      {activeTab === 'chats' && (
        <View style={styles.flex}>
          <TouchableOpacity style={[styles.randomCard, { backgroundColor: t.card, borderColor: t.accent + '33' }]} onPress={() => router.push('/random-match')} activeOpacity={0.85}>
            <View style={styles.randomLeft}>
              <View style={[styles.randomIcon, { backgroundColor: t.accent + '20', borderColor: t.accent + '44' }]}>
                <Text style={{ fontSize: 24 }}>🎲</Text>
              </View>
              <View>
                <Text style={[styles.randomTitle, { color: t.text }]}>Random Match</Text>
                <Text style={[styles.randomSub, { color: t.sub }]}>Meet someone anonymously</Text>
              </View>
            </View>
            <Text style={[styles.randomArrow, { color: t.accent }]}>›</Text>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.center}><ActivityIndicator color={t.accent} size="large" /></View>
          ) : friends.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={[styles.emptyTitle, { color: t.text }]}>No chats yet</Text>
              <Text style={[styles.emptySub, { color: t.sub }]}>Find friends and start talking!</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: t.accent }]} onPress={() => router.push('/find-friends')}>
                <Text style={styles.emptyBtnText}>🔍  Find Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList data={friends} keyExtractor={item => item.id.toString()} renderItem={renderFriend} showsVerticalScrollIndicator={false} />
          )}
        </View>
      )}

      {/* GROUPS */}
      {activeTab === 'groups' && (
        <View style={styles.flex}>
          <TouchableOpacity style={[styles.createGroupRow, { backgroundColor: t.card, borderColor: t.border }]} onPress={() => router.push('/group-chat')} activeOpacity={0.8}>
            <View style={[styles.createGroupIcon, { backgroundColor: t.accent + '20' }]}><Text style={{ fontSize: 24 }}>➕</Text></View>
            <View>
              <Text style={[styles.createGroupTitle, { color: t.text }]}>New Group</Text>
              <Text style={[styles.createGroupSub, { color: t.sub }]}>Create or join a group chat</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No Groups Yet</Text>
            <Text style={[styles.emptySub, { color: t.sub }]}>Create a group and share the code</Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: t.accent }]} onPress={() => router.push('/group-chat')}>
              <Text style={styles.emptyBtnText}>➕  New Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STATUS */}
      {activeTab === 'status' && (
        <View style={styles.flex}>
          <TouchableOpacity style={[styles.myStatusRow, { borderBottomColor: t.border }]} onPress={() => router.push('/status')} activeOpacity={0.8}>
            <View style={[styles.myStatusAvatar, { backgroundColor: t.accent, borderColor: t.accent + 'aa' }]}>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>+</Text>
            </View>
            <View>
              <Text style={[styles.myStatusTitle, { color: t.text }]}>My Status</Text>
              <Text style={[styles.myStatusSub, { color: t.sub }]}>Tap to add a status update</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>⭕</Text>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No Status Updates</Text>
            <Text style={[styles.emptySub, { color: t.sub }]}>Add friends to see their updates</Text>
          </View>
        </View>
      )}

      {/* CALLS */}
      {activeTab === 'calls' && (
        <View style={styles.flex}>
          {callLogs.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>📞</Text>
              <Text style={[styles.emptyTitle, { color: t.text }]}>No Recent Calls</Text>
              <Text style={[styles.emptySub, { color: t.sub }]}>Your call history appears here</Text>
            </View>
          ) : (
            <FlatList data={callLogs} keyExtractor={item => item.id.toString()} renderItem={renderCallLog} showsVerticalScrollIndicator={false} />
          )}
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: t.accent }]} onPress={() => router.push('/find-friends')} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>✉️</Text>
      </TouchableOpacity>

      {/* Theme picker */}
      <Modal visible={showThemes} transparent animationType="slide" onRequestClose={() => setShowThemes(false)}>
        <TouchableOpacity style={styles.themeOverlay} onPress={() => setShowThemes(false)} activeOpacity={1}>
          <View style={[styles.themeSheet, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={styles.themeHandle} />
            <Text style={[styles.themeTitle, { color: t.text }]}>Choose Theme</Text>
            <View style={styles.themeGrid}>
              {Object.entries(THEMES).map(([key, thm]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.themeItem, { backgroundColor: thm.bg, borderColor: theme === thm ? thm.accent : t.border }]}
                  onPress={() => saveTheme(key)}
                  activeOpacity={0.8}>
                  <View style={[styles.themeItemDot, { backgroundColor: thm.accent }]} />
                  <Text style={[styles.themeItemName, { color: thm.text }]}>{thm.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  bgOrb1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -60, right: -80 },
  bgOrb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, bottom: 100, left: -60 },
  incomingBanner: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 44, left: 12, right: 12, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 20 },
  incomingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  incomingIcon: { fontSize: 28 },
  incomingName: { fontWeight: 'bold', fontSize: 15 },
  incomingLabel: { fontSize: 12 },
  incomingBtns: { flexDirection: 'row', gap: 10 },
  incomingReject: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#ff3b3b', justifyContent: 'center', alignItems: 'center' },
  incomingAccept: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#00c853', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 12, borderBottomWidth: 1 },
  logo: { fontSize: 24, fontWeight: 'bold', letterSpacing: 8 },
  headerBtns: { flexDirection: 'row', gap: 6 },
  hBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', borderWidth: 1, position: 'relative' },
  hBtnIcon: { fontSize: 18 },
  badge: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ff4d4d', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  tabIcon: { fontSize: 17, marginBottom: 2 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  randomCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 14, marginVertical: 12, padding: 16, borderRadius: 18, borderWidth: 1 },
  randomLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  randomIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  randomTitle: { fontWeight: 'bold', fontSize: 15 },
  randomSub: { fontSize: 12, marginTop: 2 },
  randomArrow: { fontSize: 22 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  chatAvatar: { width: 54, height: 54, borderRadius: 27 },
  chatAvatarFallback: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  chatAvatarLetter: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  onlinePip: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, borderWidth: 2.5 },
  chatMeta: { flex: 1, marginLeft: 13 },
  chatMetaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  chatName: { fontSize: 16, fontWeight: '700' },
  chatPreview: { fontSize: 13 },
  chatChevron: { fontSize: 22, marginLeft: 8 },
  callRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  callAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  callAvatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  callInfo: { flex: 1, marginLeft: 13 },
  callName: { fontSize: 15, fontWeight: '600' },
  callStatus: { fontSize: 12, marginTop: 3 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 24 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  createGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 14, marginVertical: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  createGroupIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  createGroupTitle: { fontWeight: 'bold', fontSize: 15 },
  createGroupSub: { fontSize: 12, marginTop: 2 },
  myStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1 },
  myStatusAvatar: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  myStatusTitle: { fontWeight: 'bold', fontSize: 16 },
  myStatusSub: { fontSize: 13, marginTop: 2 },
  fab: { position: 'absolute', bottom: 26, right: 22, width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
  fabIcon: { fontSize: 24 },
  themeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  themeSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48, borderWidth: 1 },
  themeHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 20 },
  themeTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeItem: { width: (width - 80) / 2, height: 72, borderRadius: 16, padding: 14, justifyContent: 'flex-end', borderWidth: 2 },
  themeItemDot: { width: 20, height: 20, borderRadius: 10, marginBottom: 6 },
  themeItemName: { fontSize: 13, fontWeight: '600' },
});