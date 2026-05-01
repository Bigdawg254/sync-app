import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');
const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);

  // Auto refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadFriends();
      loadNotifCount();
    }, [])
  );

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

  const renderChat = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push({ pathname: '/chat', params: { friendId: item.id, friendName: item.username } })}
      activeOpacity={0.7}>
      <View style={styles.chatAvatar}>
        <Text style={styles.chatAvatarText}>{item.username[0].toUpperCase()}</Text>
        <View style={styles.onlineDot} />
      </View>
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
        <Text style={styles.headerTitle}>SYNC</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/requests')}>
            <Text style={styles.iconBtnText}>🔔</Text>
            {notifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/group-chat')}>
            <Text style={styles.iconBtnText}>👥</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/find-friends')}>
            <Text style={styles.iconBtnText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/profile')}>
            <Text style={styles.iconBtnText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['chats', 'status', 'calls'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'chats' ? '💬 Chats' : tab === 'status' ? '⭕ Status' : '📞 Calls'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'chats' && (
        <View style={styles.flex}>
          {/* Random Match Banner */}
          <TouchableOpacity style={styles.randomBanner} onPress={() => router.push('/random-match')} activeOpacity={0.8}>
            <View style={styles.randomBannerLeft}>
              <Text style={styles.randomBannerEmoji}>🎲</Text>
              <View>
                <Text style={styles.randomBannerTitle}>Random Match</Text>
                <Text style={styles.randomBannerSub}>Chat anonymously with a stranger</Text>
              </View>
            </View>
            <Text style={styles.randomBannerArrow}>›</Text>
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
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/find-friends')} activeOpacity={0.8}>
                <Text style={styles.emptyBtnText}>🔍  Find Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderChat}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {activeTab === 'status' && (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>⭕</Text>
          <Text style={styles.emptyTitle}>Status Updates</Text>
          <Text style={styles.emptySub}>Share moments with your friends</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/status')} activeOpacity={0.8}>
            <Text style={styles.emptyBtnText}>View Status</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'calls' && (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📞</Text>
          <Text style={styles.emptyTitle}>No recent calls</Text>
          <Text style={styles.emptySub}>Start a call from any chat</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16, backgroundColor: '#0d0d14', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', letterSpacing: 6 },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111120', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  iconBtnText: { fontSize: 20 },
  badge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#ff4d4d', justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', backgroundColor: '#0d0d14', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#6c63ff' },
  tabText: { color: '#444', fontWeight: '600', fontSize: 13 },
  activeTabText: { color: '#6c63ff' },
  randomBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 16, padding: 16, backgroundColor: '#0d0d14', borderRadius: 16, borderWidth: 1, borderColor: '#6c63ff' },
  randomBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  randomBannerEmoji: { fontSize: 32 },
  randomBannerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  randomBannerSub: { color: '#555', fontSize: 12, marginTop: 2 },
  randomBannerArrow: { color: '#6c63ff', fontSize: 28 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#0d0d14' },
  chatAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  chatAvatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#00e676', borderWidth: 2, borderColor: '#050508' },
  chatInfo: { flex: 1, marginLeft: 14 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lastMessage: { color: '#444', fontSize: 13, marginTop: 3 },
  chevron: { color: '#333', fontSize: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  emptySub: { color: '#444', fontSize: 14, marginTop: 8, textAlign: 'center' },
  emptyBtn: { backgroundColor: '#6c63ff', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, marginTop: 24 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});