import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Dimensions, Platform,
  Image, Modal, ScrollView
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { storage } from './storage';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const API = 'https://sync-app-production-2ff8.up.railway.app';

const THEMES = {
  midnight: { name: '🌌 Midnight', bg: '#02020a', surface: '#07070f', card: '#0d0d18', border: '#111125', accent: '#6c63ff', text: '#ffffff', sub: '#2a2a45', online: '#00e676' },
  ocean: { name: '🌊 Ocean', bg: '#010d1a', surface: '#011525', card: '#012035', border: '#013050', accent: '#00b4d8', text: '#ffffff', sub: '#0a2535', online: '#00e676' },
  forest: { name: '🌿 Forest', bg: '#010d05', surface: '#021508', card: '#03200c', border: '#042e10', accent: '#52b788', text: '#ffffff', sub: '#0d2010', online: '#b7e4c7' },
  rose: { name: '🌹 Rose', bg: '#0d0106', surface: '#160208', card: '#1e030c', border: '#280412', accent: '#e63946', text: '#ffffff', sub: '#2e0810', online: '#00e676' },
  gold: { name: '✨ Gold', bg: '#060500', surface: '#0e0c00', card: '#161200', border: '#201a00', accent: '#f4a261', text: '#ffffff', sub: '#201800', online: '#00e676' },
  aurora: { name: '🌈 Aurora', bg: '#020610', surface: '#040e1c', card: '#061628', border: '#082030', accent: '#7b2fff', text: '#ffffff', sub: '#10183a', online: '#00ffcc' },
};

const LOGO_COLORS = ['#6c63ff', '#00b4d8', '#52b788', '#e63946', '#f4a261', '#7b2fff'];

// Network graph component
function NetworkGraph({ friends, onlineUsers, theme, onPress }) {
  const nodes = [{ id: 'me', x: width / 2, y: 120, isMe: true }, ...friends.slice(0, 8).map((f, i) => {
    const angle = (i / Math.min(friends.length, 8)) * Math.PI * 2;
    return { id: f.id.toString(), username: f.username, x: width/2 + Math.cos(angle)*100, y: 120 + Math.sin(angle)*80, isOnline: !!onlineUsers[f.id?.toString()], friend: f };
  })];

  return (
    <View style={[ng.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[ng.title, { color: theme.accent }]}>Your Network</Text>
      <View style={{ height: 220, position: 'relative' }}>
        {/* Connection lines */}
        {nodes.filter(n => !n.isMe).map(node => (
          <View key={`line_${node.id}`} style={[ng.line, {
            left: Math.min(width/2, node.x),
            top: Math.min(120, node.y),
            width: Math.sqrt(Math.pow(width/2 - node.x, 2) + Math.pow(120 - node.y, 2)),
            transform: [{ rotate: `${Math.atan2(node.y - 120, node.x - width/2) * 180 / Math.PI}deg` }],
            backgroundColor: node.isOnline ? theme.accent + '60' : theme.border,
          }]} />
        ))}
        {/* Nodes */}
        {nodes.map(node => (
          <TouchableOpacity
            key={node.id}
            style={[ng.node, {
              left: node.x - (node.isMe ? 28 : 22),
              top: node.y - (node.isMe ? 28 : 22),
              width: node.isMe ? 56 : 44,
              height: node.isMe ? 56 : 44,
              borderRadius: node.isMe ? 28 : 22,
              backgroundColor: node.isMe ? theme.accent : theme.card,
              borderColor: node.isOnline ? theme.online : theme.border,
              borderWidth: node.isOnline ? 2 : 1,
            }]}
            onPress={() => !node.isMe && node.friend && onPress(node.friend)}
            activeOpacity={0.8}>
            <Text style={[ng.nodeText, { fontSize: node.isMe ? 16 : 13 }]}>
              {node.isMe ? 'Me' : node.username?.[0]?.toUpperCase()}
            </Text>
            {node.isOnline && !node.isMe && <View style={[ng.onlinePip, { backgroundColor: theme.online }]} />}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[ng.hint, { color: theme.sub }]}>{friends.filter(f => !!onlineUsers[f.id?.toString()]).length} friends online now</Text>
    </View>
  );
}

const ng = StyleSheet.create({
  container: { marginHorizontal: 14, marginVertical: 10, borderRadius: 20, padding: 16, borderWidth: 1 },
  title: { fontSize: 13, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  line: { position: 'absolute', height: 1, transformOrigin: 'left center' },
  node: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  nodeText: { color: '#fff', fontWeight: 'bold' },
  onlinePip: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#02020a' },
  hint: { fontSize: 11, textAlign: 'center', marginTop: 8 },
});

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [callLogs, setCallLogs] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [activeFriends, setActiveFriends] = useState([]);
  const [colorIdx, setColorIdx] = useState(0);
  const [showThemes, setShowThemes] = useState(false);
  const [theme, setTheme] = useState(THEMES.midnight);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showNetwork, setShowNetwork] = useState(false);
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
        Animated.timing(logoAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
        Animated.timing(logoAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setColorIdx(p => (p+1) % LOGO_COLORS.length), 300);
    }, 60000);
    return () => { clearInterval(interval); socketRef.current?.disconnect(); };
  }, []);

  const loadTheme = async () => {
    try { const s = await AsyncStorage.getItem('sync_theme'); if (s && THEMES[s]) setTheme(THEMES[s]); } catch {}
  };

  const saveTheme = async (key) => {
    try { await AsyncStorage.setItem('sync_theme', key); setTheme(THEMES[key]); setShowThemes(false); } catch {}
  };

  const initSocket = async () => {
    const userId = await storage.get('userId');
    const username = await storage.get('username');
    socketRef.current = io(API, { transports: ['websocket'] });
    socketRef.current.on('connect', () => {
      socketRef.current.emit('user_online', { userId, username });
      socketRef.current.emit('get_active_friends');
    });
    socketRef.current.on('user_status_change', ({ userId: uid, online }) => {
      setOnlineUsers(prev => ({ ...prev, [uid?.toString()]: online }));
    });
    socketRef.current.on('active_friends', (list) => setActiveFriends(list));
    socketRef.current.on('presence_update', (list) => {
      const map = {};
      list.forEach(u => { map[u.id?.toString()] = true; });
      setOnlineUsers(prev => ({ ...prev, ...map }));
    });
    socketRef.current.on('incoming_call', ({ callerId, callerName, callType }) => {
      setIncomingCall({ callerId, callerName, callType });
    });
    socketRef.current.on('online_statuses', (s) => {
      setOnlineUsers(prev => ({ ...prev, ...s }));
    });
  };

  const loadFriends = async () => {
    try {
      const userId = await storage.get('userId');
      const token = await storage.get('userToken');
      const res = await fetch(`${API}/api/connections/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setFriends(list);
      if (socketRef.current && list.length > 0) {
        socketRef.current.emit('check_online_status', list.map(f => f.id));
      }
    } catch {}
    setLoading(false);
  };

  const loadNotifs = async () => {
    try {
      const userId = await storage.get('userId');
      const token = await storage.get('userToken');
      const res = await fetch(`${API}/api/connections/notifications/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
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
        style={[s.chatRow, { borderBottomColor: t.border }]}
        onPress={() => router.push({ pathname: '/chat', params: { friendId: item.id, friendName: item.username } })}
        onLongPress={() => router.push({ pathname: '/chat-options', params: { friendId: item.id, friendName: item.username } })}
        activeOpacity={0.75}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.id } })} activeOpacity={0.8}>
          <View style={{ position: 'relative' }}>
            {item.profile_picture
              ? <Image source={{ uri: item.profile_picture }} style={s.chatAvatar} />
              : <View style={[s.chatAvatarFb, { backgroundColor: t.accent }]}>
                  <Text style={s.chatAvatarLetter}>{item.username?.[0]?.toUpperCase()}</Text>
                </View>
            }
            <View style={[s.onlinePip, { backgroundColor: isOnline ? t.online : t.border, borderColor: t.bg }]} />
          </View>
        </TouchableOpacity>
        <View style={s.chatMeta}>
          <View style={s.chatMetaTop}>
            <Text style={[s.chatName, { color: t.text }]}>{item.username}</Text>
            <Text style={{ color: isOnline ? t.online : t.sub, fontSize: 11 }}>{isOnline ? '● online' : 'offline'}</Text>
          </View>
          <Text style={[s.chatPrev, { color: t.sub }]}>Tap to chat</Text>
        </View>
        <Text style={[s.chevron, { color: t.border }]}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderCallLog = ({ item }) => {
    const name = item.receiver_name || item.caller_name || 'Unknown';
    const color = item.status === 'completed' ? t.online : '#ff4d4d';
    const icon = item.status === 'completed' ? '📞' : '📵';
    return (
      <View style={[s.callRow, { borderBottomColor: t.border }]}>
        <View style={[s.callAvatar, { backgroundColor: t.accent }]}>
          <Text style={s.callAvatarText}>{name[0]?.toUpperCase()}</Text>
        </View>
        <View style={s.callInfo}>
          <Text style={[s.callName, { color: t.text }]}>{name}</Text>
          <Text style={[s.callStatus, { color }]}>{icon} {item.status} · {item.call_type}</Text>
        </View>
        <Text style={{ color: t.sub, fontSize: 11 }}>{new Date(item.started_at).toLocaleDateString()}</Text>
      </View>
    );
  };

  const tabs = [
    { key: 'chats', icon: '💬', label: 'Chats' },
    { key: 'groups', icon: '👥', label: 'Groups' },
    { key: 'status', icon: '⭕', label: 'Status' },
    { key: 'calls', icon: '📞', label: 'Calls' },
  ];

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <View style={[s.bgOrb1, { backgroundColor: t.accent + '10' }]} />
      <View style={[s.bgOrb2, { backgroundColor: t.accent + '08' }]} />

      {/* Incoming call banner */}
      {incomingCall && (
        <View style={[s.callBanner, { backgroundColor: t.card, borderColor: t.accent }]}>
          <View style={s.callBannerLeft}>
            <Text style={{ fontSize: 26 }}>📲</Text>
            <View>
              <Text style={[s.callBannerName, { color: t.text }]}>{incomingCall.callerName}</Text>
              <Text style={[s.callBannerLabel, { color: t.accent }]}>Incoming {incomingCall.callType} call</Text>
            </View>
          </View>
          <View style={s.callBannerBtns}>
            <TouchableOpacity style={s.rejectBtn} onPress={() => { socketRef.current?.emit('reject_call', { callerId: incomingCall.callerId }); setIncomingCall(null); }}>
              <Text style={{ fontSize: 20 }}>📵</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.acceptBtn} onPress={() => { setIncomingCall(null); router.push({ pathname: '/call', params: { friendId: incomingCall.callerId, friendName: incomingCall.callerName, isIncoming: 'true', callerId: incomingCall.callerId, callerName: incomingCall.callerName } }); }}>
              <Text style={{ fontSize: 20 }}>📞</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={[s.header, { borderBottomColor: t.border }]}>
        <Animated.Text style={[s.logo, { color: LOGO_COLORS[colorIdx], transform: [{ scale: logoAnim }], opacity: logoOpacity }]}>
          SYNC
        </Animated.Text>
        <View style={s.headerBtns}>
          <TouchableOpacity style={[s.hBtn, { backgroundColor: t.surface, borderColor: t.border }]} onPress={() => router.push('/requests')} activeOpacity={0.7}>
            <Text style={s.hBtnIcon}>🔔</Text>
            {notifCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{notifCount > 9 ? '9+' : notifCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.hBtn, { backgroundColor: t.surface, borderColor: t.border }]} onPress={() => setShowNetwork(!showNetwork)} activeOpacity={0.7}>
            <Text style={s.hBtnIcon}>🕸️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.hBtn, { backgroundColor: t.surface, borderColor: t.border }]} onPress={() => setShowThemes(true)} activeOpacity={0.7}>
            <Text style={s.hBtnIcon}>🎨</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.hBtn, { backgroundColor: t.surface, borderColor: t.border }]} onPress={() => router.push('/find-friends')} activeOpacity={0.7}>
            <Text style={s.hBtnIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.hBtn, { backgroundColor: t.surface, borderColor: t.border }]} onPress={() => router.push('/profile')} activeOpacity={0.7}>
            <Text style={s.hBtnIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active now bar */}
      {activeFriends.length > 0 && (
        <View style={[s.activeBar, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
          <Text style={[s.activeBarLabel, { color: t.sub }]}>ACTIVE NOW</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.activeScroll}>
            {activeFriends.slice(0, 10).map((u, i) => (
              <View key={i} style={s.activeUser}>
                <View style={[s.activeUserAvatar, { backgroundColor: t.accent }]}>
                  <Text style={s.activeUserLetter}>{u.username?.[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={[s.activeUserDot, { backgroundColor: t.online }]} />
                <Text style={[s.activeUserName, { color: t.sub }]} numberOfLines={1}>{u.username}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tabs */}
      <View style={[s.tabs, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && { borderBottomColor: t.accent, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}>
            <Text style={s.tabIcon}>{tab.icon}</Text>
            <Text style={[s.tabLabel, { color: activeTab === tab.key ? t.accent : t.sub }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CHATS */}
      {activeTab === 'chats' && (
        <View style={s.flex}>
          {showNetwork && friends.length > 0 && (
            <NetworkGraph friends={friends} onlineUsers={onlineUsers} theme={t}
              onPress={(f) => router.push({ pathname: '/chat', params: { friendId: f.id, friendName: f.username } })} />
          )}

          <TouchableOpacity style={[s.randomCard, { backgroundColor: t.card, borderColor: t.accent + '44' }]} onPress={() => router.push('/random-match')} activeOpacity={0.85}>
            <View style={s.randomLeft}>
              <View style={[s.randomIcon, { backgroundColor: t.accent + '20', borderColor: t.accent + '44' }]}>
                <Text style={{ fontSize: 22 }}>🎲</Text>
              </View>
              <View>
                <Text style={[s.randomTitle, { color: t.text }]}>Random Match</Text>
                <Text style={[s.randomSub, { color: t.sub }]}>Meet someone anonymously</Text>
              </View>
            </View>
            <Text style={[s.randomArrow, { color: t.accent }]}>›</Text>
          </TouchableOpacity>

          {loading
            ? <View style={s.center}><ActivityIndicator color={t.accent} size="large" /></View>
            : friends.length === 0
              ? <View style={s.center}>
                  <Text style={s.emptyEmoji}>💬</Text>
                  <Text style={[s.emptyTitle, { color: t.text }]}>No chats yet</Text>
                  <Text style={[s.emptySub, { color: t.sub }]}>Find friends to start talking!</Text>
                  <TouchableOpacity style={[s.emptyBtn, { backgroundColor: t.accent }]} onPress={() => router.push('/find-friends')}>
                    <Text style={s.emptyBtnText}>🔍  Find Friends</Text>
                  </TouchableOpacity>
                </View>
              : <FlatList data={friends} keyExtractor={i => i.id.toString()} renderItem={renderFriend} showsVerticalScrollIndicator={false} />
          }
        </View>
      )}

      {/* GROUPS */}
      {activeTab === 'groups' && (
        <View style={s.flex}>
          <TouchableOpacity style={[s.createGroupRow, { backgroundColor: t.card, borderColor: t.border }]} onPress={() => router.push('/group-chat')} activeOpacity={0.8}>
            <View style={[s.createGroupIcon, { backgroundColor: t.accent + '22' }]}><Text style={{ fontSize: 22 }}>➕</Text></View>
            <View>
              <Text style={[s.createGroupTitle, { color: t.text }]}>New Group</Text>
              <Text style={[s.createGroupSub, { color: t.sub }]}>Create or join a group</Text>
            </View>
          </TouchableOpacity>
          <View style={s.center}>
            <Text style={s.emptyEmoji}>👥</Text>
            <Text style={[s.emptyTitle, { color: t.text }]}>No Groups Yet</Text>
            <Text style={[s.emptySub, { color: t.sub }]}>Create a group and share the code</Text>
            <TouchableOpacity style={[s.emptyBtn, { backgroundColor: t.accent }]} onPress={() => router.push('/group-chat')}>
              <Text style={s.emptyBtnText}>➕  New Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STATUS */}
      {activeTab === 'status' && (
        <View style={s.flex}>
          <TouchableOpacity style={[s.myStatusRow, { borderBottomColor: t.border }]} onPress={() => router.push('/status')} activeOpacity={0.8}>
            <View style={[s.myStatusAvatar, { backgroundColor: t.accent, borderColor: t.accent }]}>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold' }}>+</Text>
            </View>
            <View>
              <Text style={[s.myStatusTitle, { color: t.text }]}>My Status</Text>
              <Text style={[s.myStatusSub, { color: t.sub }]}>Tap to add or view status</Text>
            </View>
          </TouchableOpacity>
          <View style={s.center}>
            <Text style={s.emptyEmoji}>⭕</Text>
            <Text style={[s.emptyTitle, { color: t.text }]}>No Status Updates</Text>
            <Text style={[s.emptySub, { color: t.sub }]}>Add friends to see their updates</Text>
          </View>
        </View>
      )}

      {/* CALLS */}
      {activeTab === 'calls' && (
        <View style={s.flex}>
          {callLogs.length === 0
            ? <View style={s.center}>
                <Text style={s.emptyEmoji}>📞</Text>
                <Text style={[s.emptyTitle, { color: t.text }]}>No Recent Calls</Text>
                <Text style={[s.emptySub, { color: t.sub }]}>Your call history appears here</Text>
              </View>
            : <FlatList data={callLogs} keyExtractor={i => i.id.toString()} renderItem={renderCallLog} showsVerticalScrollIndicator={false} />
          }
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity style={[s.fab, { backgroundColor: t.accent }]} onPress={() => router.push('/find-friends')} activeOpacity={0.85}>
        <Text style={{ fontSize: 24 }}>✉️</Text>
      </TouchableOpacity>

      {/* Theme picker */}
      <Modal visible={showThemes} transparent animationType="slide" onRequestClose={() => setShowThemes(false)}>
        <TouchableOpacity style={s.themeOverlay} onPress={() => setShowThemes(false)} activeOpacity={1}>
          <View style={[s.themeSheet, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={s.themeHandle} />
            <Text style={[s.themeTitle, { color: t.text }]}>Choose Your Theme</Text>
            <Text style={[s.themeSub, { color: t.sub }]}>Personalise your Sync experience</Text>
            <View style={s.themeGrid}>
              {Object.entries(THEMES).map(([key, thm]) => (
                <TouchableOpacity
                  key={key}
                  style={[s.themeItem, { backgroundColor: thm.bg, borderColor: theme.name === thm.name ? thm.accent : t.border }]}
                  onPress={() => saveTheme(key)}
                  activeOpacity={0.8}>
                  <View style={[s.themeItemDot, { backgroundColor: thm.accent }]} />
                  <Text style={[s.themeItemName, { color: thm.text }]}>{thm.name}</Text>
                  {theme.name === thm.name && <Text style={{ color: thm.accent, fontSize: 14 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  bgOrb1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -60, right: -80 },
  bgOrb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, bottom: 100, left: -60 },
  callBanner: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 44, left: 12, right: 12, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, zIndex: 100, elevation: 20 },
  callBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  callBannerName: { fontWeight: 'bold', fontSize: 15 },
  callBannerLabel: { fontSize: 12 },
  callBannerBtns: { flexDirection: 'row', gap: 10 },
  rejectBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ff3b3b', justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00c853', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 12, borderBottomWidth: 1 },
  logo: { fontSize: 22, fontWeight: 'bold', letterSpacing: 8 },
  headerBtns: { flexDirection: 'row', gap: 5 },
  hBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, position: 'relative' },
  hBtnIcon: { fontSize: 17 },
  badge: { position: 'absolute', top: 1, right: 1, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ff4d4d', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  activeBar: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1 },
  activeBarLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 3, marginBottom: 8 },
  activeScroll: { flexDirection: 'row' },
  activeUser: { alignItems: 'center', marginRight: 16, position: 'relative' },
  activeUserAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  activeUserLetter: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  activeUserDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#02020a' },
  activeUserName: { fontSize: 10, marginTop: 4, maxWidth: 40 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  tabIcon: { fontSize: 17, marginBottom: 2 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  randomCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 14, marginVertical: 12, padding: 15, borderRadius: 18, borderWidth: 1 },
  randomLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  randomIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  randomTitle: { fontWeight: 'bold', fontSize: 15 },
  randomSub: { fontSize: 12, marginTop: 2 },
  randomArrow: { fontSize: 22 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1 },
  chatAvatar: { width: 52, height: 52, borderRadius: 26 },
  chatAvatarFb: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  chatAvatarLetter: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  onlinePip: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, borderWidth: 2.5 },
  chatMeta: { flex: 1, marginLeft: 12 },
  chatMetaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  chatName: { fontSize: 16, fontWeight: '700' },
  chatPrev: { fontSize: 13 },
  chevron: { fontSize: 22 },
  callRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1 },
  callAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  callAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  callInfo: { flex: 1, marginLeft: 12 },
  callName: { fontSize: 15, fontWeight: '600' },
  callStatus: { fontSize: 12, marginTop: 3 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji: { fontSize: 54, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 22 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  createGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 14, marginVertical: 12, padding: 15, borderRadius: 16, borderWidth: 1 },
  createGroupIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  createGroupTitle: { fontWeight: 'bold', fontSize: 15 },
  createGroupSub: { fontSize: 12, marginTop: 2 },
  myStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1 },
  myStatusAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  myStatusTitle: { fontWeight: 'bold', fontSize: 16 },
  myStatusSub: { fontSize: 13, marginTop: 2 },
  fab: { position: 'absolute', bottom: 26, right: 22, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
  themeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  themeSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, borderWidth: 1 },
  themeHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 18 },
  themeTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  themeSub: { fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeItem: { width: (width - 68) / 2, height: 70, borderRadius: 16, padding: 14, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', borderWidth: 2 },
  themeItemDot: { width: 18, height: 18, borderRadius: 9 },
  themeItemName: { fontSize: 13, fontWeight: '600', flex: 1, marginLeft: 10 },
});