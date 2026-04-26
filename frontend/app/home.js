import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/connections/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setFriends(data);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const renderChat = ({ item }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => router.push('/chat')}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.username}</Text>
        <Text style={styles.lastMessage}>Tap to chat</Text>
      </View>
      <Text style={styles.chatTime}>Now</Text>
    </TouchableOpacity>
  );

  const renderStatus = () => (
    <View style={styles.statusContainer}>
      <TouchableOpacity style={styles.myStatus}>
        <View style={styles.addStatus}>
          <Text style={styles.addStatusText}>+</Text>
        </View>
        <Text style={styles.statusLabel}>My Status</Text>
      </TouchableOpacity>
      <Text style={styles.statusHint}>Add a status update</Text>
    </View>
  );

  const renderCalls = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>📞 No recent calls</Text>
      <Text style={styles.emptySubText}>Calls coming soon!</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sync</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.requestsBtn} onPress={() => router.push('/requests')}>
            <Text style={styles.requestsBtnText}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.findBtn} onPress={() => router.push('/find-friends')}>
            <Text style={styles.findBtnText}>Find Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <View style={styles.profileIcon}>
              <Text style={styles.profileIconText}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['chats', 'status', 'calls'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'chats' && (
        loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#6c63ff" />
          </View>
        ) : (
          <View style={styles.flex}>
            {/* Random Match Banner */}
            <TouchableOpacity style={styles.randomBanner} onPress={() => router.push('/random-match')}>
              <Text style={styles.randomBannerIcon}>🎲</Text>
              <View>
                <Text style={styles.randomBannerTitle}>Random Match</Text>
                <Text style={styles.randomBannerSubtitle}>Chat anonymously with a stranger</Text>
              </View>
              <Text style={styles.randomBannerArrow}>→</Text>
            </TouchableOpacity>

            {friends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No chats yet</Text>
                <Text style={styles.emptySubText}>Find friends to start chatting!</Text>
                <TouchableOpacity style={styles.findFriendsBtn} onPress={() => router.push('/find-friends')}>
                  <Text style={styles.findFriendsBtnText}>Find Friends</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderChat}
              />
            )}
          </View>
        )
      )}

      {activeTab === 'status' && renderStatus()}
      {activeTab === 'calls' && renderCalls()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#1a1a2e' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#6c63ff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center' },
  requestsBtnText: { fontSize: 18 },
  findBtn: { backgroundColor: '#6c63ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  findBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  profileIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2d2d44', justifyContent: 'center', alignItems: 'center' },
  profileIconText: { fontSize: 18 },
  tabs: { flexDirection: 'row', backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#6c63ff' },
  tabText: { color: '#888', fontWeight: 'bold' },
  activeTabText: { color: '#6c63ff' },
  randomBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', margin: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#6c63ff' },
  randomBannerIcon: { fontSize: 30, marginRight: 12 },
  randomBannerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  randomBannerSubtitle: { color: '#888', fontSize: 12, marginTop: 2 },
  randomBannerArrow: { color: '#6c63ff', fontSize: 20, marginLeft: 'auto' },
  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  chatInfo: { flex: 1, marginLeft: 12 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  lastMessage: { color: '#888', fontSize: 13, marginTop: 4 },
  chatTime: { color: '#888', fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  emptySubText: { color: '#888', marginTop: 8 },
  findFriendsBtn: { backgroundColor: '#6c63ff', padding: 14, borderRadius: 10, marginTop: 20 },
  findFriendsBtnText: { color: '#fff', fontWeight: 'bold' },
  statusContainer: { padding: 16, alignItems: 'center' },
  myStatus: { alignItems: 'center', marginBottom: 16 },
  addStatus: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  addStatusText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  statusLabel: { color: '#888', marginTop: 6, fontSize: 12 },
  statusHint: { color: '#555', fontSize: 14 },
});