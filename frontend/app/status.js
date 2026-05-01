import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function StatusScreen() {
  const router = useRouter();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    setLoading(true);
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API}/api/status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setStatuses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
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
      setPosting(true);
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
        const data = await response.json();
        if (response.ok) {
          Alert.alert('Success', 'Status posted!');
          loadStatuses();
        } else {
          Alert.alert('Error', data.error || 'Could not post status');
        }
      } catch (err) {
        Alert.alert('Error', 'Cannot connect to server');
      }
      setPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Status</Text>
      </View>

      <TouchableOpacity style={styles.myStatusRow} onPress={addStatus} disabled={posting}>
        <View style={styles.addAvatar}>
          <Text style={styles.addAvatarText}>{posting ? '⏳' : '+'}</Text>
        </View>
        <View>
          <Text style={styles.myStatusTitle}>My Status</Text>
          <Text style={styles.myStatusSubtitle}>{posting ? 'Uploading...' : 'Tap to add status update'}</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>RECENT UPDATES</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6c63ff" />
        </View>
      ) : statuses.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No status updates</Text>
          <Text style={styles.emptySubText}>Add friends to see their status updates!</Text>
        </View>
      ) : (
        <FlatList
          data={statuses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.statusRow} onPress={() => setSelectedStatus(item)}>
              <View style={styles.statusAvatarRing}>
                <Image source={{ uri: item.image }} style={styles.statusAvatar} />
              </View>
              <View>
                <Text style={styles.statusUsername}>{item.username}</Text>
                <Text style={styles.statusTime}>{new Date(item.created_at).toLocaleTimeString()}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Full screen status viewer */}
      <Modal visible={!!selectedStatus} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedStatus(null)}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedStatus && (
            <Image source={{ uri: selectedStatus.image }} style={styles.fullImage} resizeMode="contain" />
          )}
          {selectedStatus && (
            <Text style={styles.modalUsername}>{selectedStatus.username}</Text>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#1a1a2e', gap: 16 },
  back: { color: '#6c63ff', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  myStatusRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e', gap: 12 },
  addAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  addAvatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  myStatusTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  myStatusSubtitle: { color: '#888', fontSize: 13, marginTop: 2 },
  sectionTitle: { color: '#555', fontSize: 12, padding: 16, paddingBottom: 8, letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptySubText: { color: '#555', fontSize: 13, marginTop: 8, textAlign: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e1e1e', gap: 12 },
  statusAvatarRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  statusAvatar: { width: 50, height: 50, borderRadius: 25 },
  statusUsername: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  statusTime: { color: '#888', fontSize: 13, marginTop: 2 },
  modalContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  modalCloseText: { color: '#fff', fontSize: 24 },
  fullImage: { width: '100%', height: '80%' },
  modalUsername: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
});