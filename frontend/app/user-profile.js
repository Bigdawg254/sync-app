import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setUser(data);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6c63ff" />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.heroSection}>
        {user?.profile_picture ? (
          <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user?.username ? user.username[0].toUpperCase() : '?'}</Text>
          </View>
        )}
        <Text style={styles.username}>{user?.username}</Text>
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <Text style={styles.bio}>{user?.bio || 'No bio yet'}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>INFO</Text>
        {user?.age && <Text style={styles.infoRow}>🎂  Age: {user.age}</Text>}
        {user?.gender && <Text style={styles.infoRow}>⚧  {user.gender}</Text>}
      </View>

      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => router.push({ pathname: '/chat', params: { friendId: userId, friendName: user?.username } })}
        activeOpacity={0.8}>
        <Text style={styles.chatBtnText}>💬  Send Message</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050508' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: '#0d0d14', borderBottomWidth: 1, borderBottomColor: '#1a1a2e', gap: 12 },
  backBtn: { padding: 8 },
  backText: { color: '#6c63ff', fontSize: 24 },
  headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  heroSection: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#0d0d14', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 42, color: '#fff', fontWeight: 'bold' },
  username: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00e676' },
  onlineText: { color: '#00e676', fontSize: 13 },
  infoCard: { margin: 16, backgroundColor: '#0d0d14', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1a1a2e' },
  sectionTitle: { color: '#6c63ff', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 12 },
  bio: { color: '#888', fontSize: 15, lineHeight: 22 },
  infoRow: { color: '#888', fontSize: 15, marginBottom: 10 },
  chatBtn: { backgroundColor: '#6c63ff', margin: 16, padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 40 },
  chatBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});