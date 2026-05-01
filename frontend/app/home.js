import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');
const API = 'https://sync-app-production-2ff8.up.railway.app';

const LOGO_COLORS = ['#6c63ff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];
const LOGO_FONTS = [28, 32, 26, 30, 28];

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [logoColorIndex, setLogoColorIndex] = useState(0);
  const [logoFontIndex, setLogoFontIndex] = useState(0);
  const logoAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      loadFriends();
      loadNotifCount();
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(logoAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(logoAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setTimeout(() => {
        setLogoColorIndex(prev => (prev + 1) % LOGO_COLORS.length);
        setLogoFontIndex(prev => (prev + 1) % LOGO_FONTS.length);
      }, 300);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadFriends = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/connections/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setFriends(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const loadNotifCount = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/connections/notifications/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setNotifCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {}
  };

  const renderFriend = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push({ pathname: '/chat', params: { friendId: item.id, friendName: item.username } })}
      onLongPress={() => router.push({ pathname: '/chat-options', params: { friendId: item.id, friendName: item.username } })}
      activeOpacity={0.7}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.id } })}
        activeOpacity={0.8}>
        {item.profile_picture ? (
          <Animated.Image
            source={{ uri: item.profile_picture }}
            style={[styles.chatAvatar, { opacity: logoAnim }]}
          />
        ) : (
          <View style={styles.chatAvatarPlaceholder}>
            <Text style={styles.chatAvatarText}>{item.username[0].toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.onlineDot} />
      </TouchableOpacity>
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.username}</Text>
        <Text style={styles.lastMessage}>Tap to start chatting</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.Text style={[styles.headerTitle, { opacity: logoAnim, color: LOGO_COLORS[logoColorIndex], fontSize: LOGO_FONTS[logoFontIndex] }]}>
          SYNC
        </Animated.Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/requests')} activeOpacity={0.7}>
            <Text style={styles.iconBtnText}>🔔</Text>
            {notifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/find-friends')} activeOpacity={0.7}>
            <Text style={styles.iconBtnText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/profile')} activeOpacity={0.7}>
            <Text style={styles.iconBtnText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs - WhatsApp style */}
      <View style={styles.tabs}>
        {[
          { key: 'chats', label: '💬 Chats' },
          { key: 'groups', label: '👥 Groups' },
          { key: 'status', label: '⭕ Status' },
          { key: 'calls', label: '📞 Calls' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CHATS TAB */}
      {activeTab === 'chats' && (
        <View style={styles.flex}>
          <TouchableOpacity style={styles.randomBanner} onPress={() => router.push('/random-match')} activeOpacity={0.8}>
            <View style={styles.randomLeft}>
              <Text style={styles.randomEmoji}>🎲</Text>
              <View>
                <Text style={styles.randomTitle}>Random Match</Text>
                <Text style={styles.randomSub}>Meet someone anonymously</Text>
              </View>
            </View>
            <Text style={styles.randomArrow}>›</Text>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#6c63ff" />
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptySub}>Find friends to start chatting!</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/find-friends')}>
                <Text style={styles.emptyBtnText}>🔍  Find Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderFriend}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* GROUPS TAB */}
      {activeTab === 'groups' && (
        <View style={styles.flex}>
          <TouchableOpacity style={styles.createGroupBtn} onPress={() => router.push('/group-chat')} activeOpacity={0.8}>
            <Text style={styles.createGroupIcon}>➕</Text>
            <Text style={styles.createGroupText}>Create or Join a Group</Text>
          </TouchableOpacity>
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No Groups Yet</Text>
            <Text style={styles.emptySub}>Create a group and share the code with friends to chat together</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/group-chat')}>
              <Text style={styles.emptyBtnText}>➕  New Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STATUS TAB */}
      {activeTab === 'status' && (
        <View style={styles.flex}>
          <TouchableOpacity style={styles.myStatusRow} onPress={() => router.push('/status')} activeOpacity={0.8}>
            <View style={styles.statusAddBtn}>
              <Text style={styles.statusAddText}>+</Text>
            </View>
            <View>
              <Text style={styles.myStatusTitle}>My Status</Text>
              <Text style={styles.myStatusSub}>Tap to add a status update</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>⭕</Text>
            <Text style={styles.emptyTitle}>No Status Updates</Text>
            <Text style={styles.emptySub}>Add friends to see their status updates here</Text>
          </View>
        </View>
      )}

      {/* CALLS TAB */}
      {activeTab === 'calls' && (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📞</Text>
          <Text style={styles.emptyTitle}>No Recent Calls</Text>
          <Text style={styles.emptySub}>Start a call from any chat conversation</Text>
        </View>
      )}

      {/* FAB - New Chat Button */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/find-friends')} activeOpacity={0.8}>
        <Text style={styles.fabText}>✉️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14, backgroundColor: '#0d0d14', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  headerTitle: { fontWeight: 'bold', letterSpacing: 6 },
  headerActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#111120', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  iconBtnText: { fontSize: 20 },
  badge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ff4d4d', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', backgroundColor: '#0d0d14' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#6c63ff' },
  tabText: { color: '#444', fontWeight: '600', fontSize: 11 },
  activeTabText: { color: '#6c63ff' },
  randomBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginVertical: 12, padding: 16, backgroundColor: '#0d0d14', borderRadius: 16, borderWidth: 1, borderColor: '#6c63ff' },
  randomLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  randomEmoji: { fontSize: 32 },
  randomTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  randomSub: { color: '#555', fontSize: 12, marginTop: 2 },
  randomArrow: { color: '#6c63ff', fontSize: 28 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#0d0d14' },
  chatAvatar: { width: 54, height: 54, borderRadius: 27 },
  chatAvatarPlaceholder: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  chatAvatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 13, height: 13, borderRadius: 7, backgroundColor: '#00e676', borderWidth: 2, borderColor: '#050508' },
  chatInfo: { flex: 1, marginLeft: 14 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lastMessage: { color: '#444', fontSize: 13, marginTop: 3 },
  chevron: { color: '#333', fontSize: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  emptySub: { color: '#444', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { backgroundColor: '#6c63ff', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, marginTop: 24 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  createGroupBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginVertical: 12, padding: 16, backgroundColor: '#0d0d14', borderRadius: 16, borderWidth: 1, borderColor: '#1a1a2e' },
  createGroupIcon: { fontSize: 24 },
  createGroupText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  myStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#0d0d14' },
  statusAddBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  statusAddText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  myStatusTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  myStatusSub: { color: '#555', fontSize: 13, marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabText: { fontSize: 26 },
});