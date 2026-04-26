import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function RequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');

  useEffect(() => {
    fetchRequests();
    fetchNotifications();
  }, []);

  const fetchRequests = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/connections/requests/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/connections/notifications/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setNotifications(data);

      // Mark as read
      await fetch(`${API}/api/connections/notifications/${userId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.log(err);
    }
  };

  const acceptRequest = async (connectionId) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/connections/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ connection_id: connectionId })
      });
      if (response.ok) {
        Alert.alert('Success', 'Friend request accepted!');
        fetchRequests();
      }
    } catch (err) {
      Alert.alert('Error', 'Cannot connect to server');
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6c63ff" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}>
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Friend Requests {requests.length > 0 ? `(${requests.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}>
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
            Notifications {notifications.length > 0 ? `(${notifications.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'requests' && (
        requests.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.requestCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{item.username}</Text>
                  <Text style={styles.bio}>{item.bio || 'No bio yet'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => acceptRequest(item.id)}>
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )
      )}

      {activeTab === 'notifications' && (
        notifications.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[styles.notificationCard, !item.is_read && styles.unread]}>
                <Text style={styles.notificationText}>🔔 {item.message}</Text>
                <Text style={styles.notificationTime}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#1a1a2e', gap: 16 },
  back: { color: '#6c63ff', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  tabs: { flexDirection: 'row', backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#6c63ff' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 13 },
  activeTabText: { color: '#6c63ff' },
  requestCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1, marginLeft: 12 },
  username: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bio: { color: '#888', fontSize: 13, marginTop: 2 },
  acceptBtn: { backgroundColor: '#00c853', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  acceptBtnText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { color: '#888', fontSize: 16 },
  notificationCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  unread: { backgroundColor: '#1a1a2e' },
  notificationText: { color: '#fff', fontSize: 14 },
  notificationTime: { color: '#888', fontSize: 12, marginTop: 4 },
});