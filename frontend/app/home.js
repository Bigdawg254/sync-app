import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Dimensions, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');
const API = 'https://sync-app-production-2ff8.up.railway.app';
const COLORS = ['#6c63ff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9a3c'];

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);
  const logoAnim = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

  useFocusEffect(useCallback(() => {
    loadFriends();
    loadNotifs();
  }, []));

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(logoOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(logoAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
        Animated.timing(logoAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setColorIdx(p => (p + 1) % COLORS.length), 400);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadFriends = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch(`${API}/api/connections/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFriends(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  const loadNotifs = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch(`${API}/api/connections/notifications/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setNotifCount(data.filter(n => !n.is_read).length);
    } catch {}
  };

  const renderFriend = ({ item }) => (
    <TouchableOpacity
      style={styles.chatRow}
      onPress={() => router.push({ pathname: '/chat', params: { friendId: item.id, friendName: item.username } })}
      onLongPress={() => router.push({ pathname: '/chat-options', params: { friendId: item.id, friendName: item.username } })}
      activeOpacity={0.75}>
      <TouchableOpacity onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.id } })} activeOpacity={0.8}>
        {item.profile_picture ? (
          <Image source={{ uri: item.profile_picture }} style={styles.chatAvatar} />
        ) : (
          <View style={[styles.chatAvatarFallback, { backgroundColor: COLORS[item.id % COLORS.length] }]}>
            <Text style={styles.chatAvatarLetter}>{item.username[0].toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.onlinePip} />
      </TouchableOpacity>
      <View style={styles.chatMeta}>
        <View style={styles.chatMetaTop}>
          <Text style={styles.chatName}>{item.username}</Text>
          <Text style={styles.chatTime}>now</Text>
        </View>
        <Text style={styles.chatPreview}>Tap to start chatting ✨</Text>
      </View>
      <Text style={styles.chatChevron}>›</Text>
    </TouchableOpacity>
  );

  const tabs = [
    { key: 'chats', icon: '💬', label: 'Chats' },
    { key: 'groups', icon: '👥', label: 'Groups' },
    { key: 'status', icon: '⭕', label: 'Status' },
    { key: 'calls', icon: '📞', label: 'Calls' },
  ];

  return (
    <View style={styles.container}>
      {/* Background orbs */}
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      {/* Header */}
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

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}>
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* CHATS */}
      {activeTab === 'chats' && (
        <View style={styles.flex}>
          {/* Random Match Card */}
          <TouchableOpacity style={styles.randomCard} onPress={() => router.push('/random-match')} activeOpacity={0.85}>
            <View style={styles.randomCardLeft}>
              <View style={styles.randomCardIcon}>
                <Text style={styles.randomCardIconText}>🎲</Text>
              </View>
              <View>
                <Text style={styles.randomCardTitle}>Random Match</Text>
                <Text style={styles.randomCardSub}>Meet someone anonymously</Text>
              </View>
            </View>
            <View style={styles.randomCardArrow}>
              <Text style={styles.randomCardArrowText}>›</Text>
            </View>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#6c63ff" />
            </View>
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
            <FlatList
              data={friends}
              keyExtractor={item => item.id.toString()}
              renderItem={renderFriend}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* GROUPS */}
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

      {/* STATUS */}
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

      {/* CALLS */}
      {activeTab === 'calls' && (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📞</Text>
          <Text style={styles.emptyTitle}>No Recent Calls</Text>
          <Text style={styles.emptySub}>Start a call from any chat conversation</Text>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/find-friends')} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>✉️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02020a' },
  flex: { flex: 1 },
  bgOrb1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(108,99,255,0.08)', top: -60, right: -80, zIndex: 0 },
  bgOrb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(108,99,255,0.05)', bottom: 100, left: -60, zIndex: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 14, zIndex: 1 },
  logo: { fontSize: 28, fontWeight: 'bold', letterSpacing: 10 },
  headerBtns: { flexDirection: 'row', gap: 6 },
  hBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#080814', justifyContent: 'center', alignItems: 'center', position: 'relative', borderWidth: 1, borderColor: '#111125' },
  hBtnIcon: { fontSize: 20 },
  badge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ff4d4d', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', backgroundColor: '#06060f', borderBottomWidth: 1, borderBottomColor: '#0d0d1a', zIndex: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabActive: {},
  tabIcon: { fontSize: 18, marginBottom: 3 },
  tabLabel: { color: '#333', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  tabLabelActive: { color: '#6c63ff' },
  tabIndicator: { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, backgroundColor: '#6c63ff', borderRadius: 1 },
  randomCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginVertical: 14, padding: 18, backgroundColor: '#080814', borderRadius: 20, borderWidth: 1, borderColor: '#6c63ff33' },
  randomCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  randomCardIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#6c63ff22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#6c63ff44' },
  randomCardIconText: { fontSize: 26 },
  randomCardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  randomCardSub: { color: '#444', fontSize: 12, marginTop: 2 },
  randomCardArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6c63ff22', justifyContent: 'center', alignItems: 'center' },
  randomCardArrowText: { color: '#6c63ff', fontSize: 22 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#06060f' },
  chatAvatar: { width: 56, height: 56, borderRadius: 28 },
  chatAvatarFallback: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  chatAvatarLetter: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  onlinePip: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#00e676', borderWidth: 2.5, borderColor: '#02020a' },
  chatMeta: { flex: 1, marginLeft: 14 },
  chatMetaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chatTime: { color: '#333', fontSize: 11 },
  chatPreview: { color: '#333', fontSize: 13 },
  chatChevron: { color: '#222', fontSize: 24, marginLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  emptySub: { color: '#333', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { backgroundColor: '#6c63ff', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 14, marginTop: 28, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  createGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginVertical: 14, padding: 18, backgroundColor: '#080814', borderRadius: 20, borderWidth: 1, borderColor: '#111125' },
  createGroupIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#6c63ff22', justifyContent: 'center', alignItems: 'center' },
  createGroupIconText: { fontSize: 24 },
  createGroupTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  createGroupSub: { color: '#444', fontSize: 12, marginTop: 2 },
  myStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#06060f' },
  myStatusIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#8a83ff' },
  myStatusIconText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  myStatusTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  myStatusSub: { color: '#444', fontSize: 13, marginTop: 2 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 62, height: 62, borderRadius: 31, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12, zIndex: 10 },
  fabIcon: { fontSize: 28 },
});