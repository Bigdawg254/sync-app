import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';

export default function HomeScreen() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://sync-app-production-2ff8.up.railway.app/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.log(err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6c63ff" />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discover</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.age}>Age: {item.age}</Text>
            <Text style={styles.bio}>{item.bio || 'No bio yet'}</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.push('/chat')}>
              <Text style={styles.buttonText}>Connect</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
        <Text style={styles.profileText}>My Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20, marginTop: 40 },
  card: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16, marginBottom: 16 },
  username: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  age: { color: '#888', marginTop: 4 },
  bio: { color: '#aaa', marginTop: 8 },
  button: { backgroundColor: '#6c63ff', padding: 10, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  profileBtn: { backgroundColor: '#1e1e1e', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  profileText: { color: '#6c63ff', fontWeight: 'bold' }
});