import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { storage } from './storage';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function StatusScreen() {
  const router = useRouter();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const id = await storage.get('userId');
    setMyUserId(id);
    await loadStatuses(id);
  };

  const loadStatuses = async (id) => {
    setLoading(true);
    try {
      const token = await storage.get('userToken');
      const res = await fetch(`${API}/api/status/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStatuses(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  const addStatus = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [9, 16], quality: 0.6, base64: true
    });
    if (!result.canceled) {
      setPosting(true);
      try {
        const token = await storage.get('userToken');
        const userId = await storage.get('userId');
        const res = await fetch(`${API}/api/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ user_id: userId, image: `data:image/jpeg;base64,${result.assets[0].base64}` })
        });
        const data = await res.json();
        if (res.ok) {
          Alert.alert('✅ Status posted!');
          await loadStatuses(userId);
        } else {
          Alert.alert('Error', data.error || 'Upload failed');
        }
      } catch { Alert.alert('Error', 'Cannot connect'); }
      setPosting(false);
    }
  };

  const deleteStatus = async (statusId) => {
    Alert.alert('Delete Status', 'Remove this status update?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const token = await storage.get('userToken');
          const res = await fetch(`${API}/api/status/${statusId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            setSelectedStatus(null);
            const userId = await storage.get('userId');
            await loadStatuses(userId);
          }
        } catch {}
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Status</Text>
        <View style={{ width: 44 }} />
      </View>

      <TouchableOpacity style={styles.myRow} onPress={addStatus} disabled={posting} activeOpacity={0.8}>
        <View style={styles.myAvatar}>
          <Text style={styles.myAvatarText}>{posting ? '⏳' : '+'}</Text>
        </View>
        <View>
          <Text style={styles.myTitle}>My Status</Text>
          <Text style={styles.mySub}>{posting ? 'Uploading...' : 'Tap to add a status update'}</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>RECENT UPDATES</Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#6c63ff" size="large" /></View>
      ) : statuses.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⭕</Text>
          <Text style={styles.emptyTitle}>No Updates</Text>
          <Text style={styles.emptySub}>Add friends to see their status updates here</Text>
        </View>
      ) : (
        <FlatList
          data={statuses}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.statusRow} onPress={() => setSelectedStatus(item)} activeOpacity={0.8}>
              <View style={styles.statusRing}>
                <Image source={{ uri: item.image }} style={styles.statusThumb} />
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusName}>{item.username}</Text>
                <Text style={styles.statusTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              {item.user_id?.toString() === myUserId && (
                <TouchableOpacity onPress={() => deleteStatus(item.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Full screen viewer */}
      <Modal visible={!!selectedStatus} transparent animationType="fade" onRequestClose={() => setSelectedStatus(null)}>
        <View style={styles.modal}>
          <View style={styles.modalTop}>
            <Text style={styles.modalName}>{selectedStatus?.username}</Text>
            <Text style={styles.modalTime}>{selectedStatus && new Date(selectedStatus.created_at).toLocaleTimeString()}</Text>
          </View>
          {selectedStatus && <Image source={{ uri: selectedStatus.image }} style={styles.modalImage} resizeMode="contain" />}
          <View style={styles.modalBottom}>
            {selectedStatus?.user_id?.toString() === myUserId && (
              <TouchableOpacity style={styles.modalDelete} onPress={() => deleteStatus(selectedStatus.id)} activeOpacity={0.8}>
                <Text style={styles.modalDeleteText}>🗑️  Delete Status</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedStatus(null)} activeOpacity={0.8}>
              <Text style={styles.modalCloseText}>✕  Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02020a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 12, backgroundColor: '#0d0d18', borderBottomWidth: 1, borderBottomColor: '#111125' },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#6c63ff', fontSize: 24 },
  headerTitle: { flex: 1, color: '#fff', fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
  myRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#06060f', gap: 14 },
  myAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#8a83ff' },
  myAvatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  myTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  mySub: { color: '#444', fontSize: 13, marginTop: 2 },
  sectionLabel: { color: '#333', fontSize: 11, letterSpacing: 2, paddingHorizontal: 16, paddingVertical: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#06060f' },
  statusRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, borderColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', padding: 2 },
  statusThumb: { width: 50, height: 50, borderRadius: 25 },
  statusInfo: { flex: 1, marginLeft: 14 },
  statusName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  statusTime: { color: '#444', fontSize: 13, marginTop: 3 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 20 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { color: '#444', fontSize: 14, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'space-between' },
  modalTop: { paddingTop: 60, paddingHorizontal: 20 },
  modalName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalTime: { color: '#666', fontSize: 13, marginTop: 4 },
  modalImage: { width: '100%', height: '70%' },
  modalBottom: { paddingHorizontal: 20, paddingBottom: 50, gap: 12 },
  modalDelete: { backgroundColor: '#1a0a0a', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ff4d4d' },
  modalDeleteText: { color: '#ff4d4d', fontWeight: 'bold', fontSize: 15 },
  modalClose: { backgroundColor: '#111120', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  modalCloseText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});