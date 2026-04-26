import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function StatusScreen() {
  const router = useRouter();
  const [statuses, setStatuses] = useState([]);
  const [myStatus, setMyStatus] = useState(null);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setStatuses(data);
    } catch (err) {
      console.log(err);
    }
  };

  const addStatus = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.5,
      base64: true
    });
    if (!result.canceled) {
      try {
        const userId = await SecureStore.getItemAsync('userId');
        const token = await SecureStore.getItemAsync('userToken');
        const response = await fetch(`${API}/api/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            user_id: userId,
            image: `data:image/jpeg;base64,${result.assets[0].base64}`
          })
        });
        if (response.ok) {
          Alert.alert('Success', 'Status posted!');
          loadStatuses();
        }
      } catch (err) {
        Alert.alert('Error', 'Could not post status');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Status</Text>
      </View>

      <TouchableOpacity style={styles.myStatusRow} onPress={addStatus}>
        <View style={styles.addAvatar}>
          <Text style={styles.addAvatarText}>+</Text>
        </View>
        <View>
          <Text style={styles.myStatusTitle}>My Status</Text>
          <Text style={styles.myStatusSubtitle}>Tap to add status update</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent Updates</Text>

      {statuses.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No status updates yet</Text>
        </View>
      ) : (
        <FlatList
          data={statuses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.statusRow}>
              <View style={styles.statusAvatarRing}>
                <Image source={{ uri: item.image }} style={styles.statusAvatar} />
              </View>
              <View>
                <Text style={styles.statusUsername}>{item.username}</Text>
                <Text style={styles.statusTime}>Today</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#1a1a2e', gap: 16 },
  back: { color: '#6c63ff', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  myStatusRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e', gap: 12 },
  addAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  addAvatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  myStatusTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  myStatusSubtitle: { color: '#888', fontSize: 13, marginTop: 2 },
  sectionTitle: { color: '#888', fontSize: 13, padding: 16, paddingBottom: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e', gap: 12 },
  statusAvatarRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  statusAvatar: { width: 48, height: 48, borderRadius: 24 },
  statusUsername: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  statusTime: { color: '#888', fontSize: 13, marginTop: 2 },
});