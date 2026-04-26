import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function RequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
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
        <Text style={styles.headerTitle}>Friend Requests</Text>
      </View>

      {requests.length === 0 ? (
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
  requestCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1, marginLeft: 12 },
  username: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bio: { color: '#888', fontSize: 13, marginTop: 2 },
  acceptBtn: { backgroundColor: '#00c853', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  acceptBtnText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { color: '#888', fontSize: 16 },
});