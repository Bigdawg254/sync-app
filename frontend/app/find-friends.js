import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function FindFriendsScreen() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const filtered = data.filter(u => u.id.toString() !== userId);
      setUsers(filtered);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const sendRequest = async (receiverId) => {
    setRequesting(prev => ({ ...prev, [receiverId]: true }));
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/connections/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId, connected_user_id: receiverId })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Friend request sent!');
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (err) {
      Alert.alert('Error', 'Cannot connect to server');
    }
    setRequesting(prev => ({ ...prev, [receiverId]: false }));
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6c63ff" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Friends</Text>
      </View>

      {users.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.age}>Age: {item.age || 'N/A'}</Text>
                <Text style={styles.bio}>{item.bio || 'No bio yet'}</Text>
              </View>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => sendRequest(item.id)}
                disabled={requesting[item.id]}>
                <Text style={styles.addBtnText}>
                  {requesting[item.id] ? '...' : '+ Add'}
                </Text>
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
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1, marginLeft: 12 },
  username: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  age: { color: '#888', fontSize: 13, marginTop: 2 },
  bio: { color: '#aaa', fontSize: 13, marginTop: 2 },
  addBtn: { backgroundColor: '#6c63ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { color: '#888', fontSize: 16 },
});