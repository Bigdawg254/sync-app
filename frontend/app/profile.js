import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const userId = await SecureStore.getItemAsync('userId');
      const response = await fetch(`${API}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setUser(data);
      if (data.profile_picture) setImage(data.profile_picture);
    } catch (err) {
      console.log('Profile load error:', err);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const saveProfilePicture = async () => {
    if (!imageBase64) return;
    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const userId = await SecureStore.getItemAsync('userId');
      const response = await fetch(`${API}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: user.username,
          bio: user.bio,
          age: user.age,
          gender: user.gender,
          profile_picture: imageBase64
        })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Profile picture saved!');
        setImage(data.profile_picture);
        setImageBase64(null);
        setUser(data);
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (err) {
      Alert.alert('Error', 'Cannot connect to server');
    }
    setSaving(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = await SecureStore.getItemAsync('userId');
              const response = await fetch(`${API}/api/auth/delete/${userId}`, {
                method: 'DELETE'
              });
              if (response.ok) {
                await SecureStore.deleteItemAsync('userToken');
                await SecureStore.deleteItemAsync('userId');
                await SecureStore.deleteItemAsync('userEmail');
                await SecureStore.deleteItemAsync('userPassword');
                await SecureStore.deleteItemAsync('username');
                router.replace('/login');
              } else {
                Alert.alert('Error', 'Could not delete account');
              }
            } catch (err) {
              Alert.alert('Error', 'Cannot connect to server');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('userEmail');
    await SecureStore.deleteItemAsync('userPassword');
    await SecureStore.deleteItemAsync('username');
    router.replace('/login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.username ? user.username[0].toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <Text style={styles.changePhoto}>Tap to change photo</Text>
        </TouchableOpacity>

        {imageBase64 && (
          <TouchableOpacity style={styles.savePhotoBtn} onPress={saveProfilePicture} disabled={saving}>
            <Text style={styles.savePhotoBtnText}>{saving ? 'Saving...' : '💾 Save Photo'}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.username}>{user?.username || 'Loading...'}</Text>
        <Text style={styles.bio}>{user?.bio || 'No bio yet'}</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>📧 {user?.email}</Text>
          <Text style={styles.infoText}>🎂 Age: {user?.age || 'Not set'}</Text>
          <Text style={styles.infoText}>⚧ {user?.gender || 'Not set'}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/edit-profile')}>
          <Text style={styles.buttonText}>✏️ Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>🗑️ Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#1a1a2e', gap: 16 },
  back: { color: '#6c63ff', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { alignItems: 'center', padding: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  changePhoto: { color: '#6c63ff', textAlign: 'center', marginTop: 8, marginBottom: 8 },
  savePhotoBtn: { backgroundColor: '#00c853', padding: 12, borderRadius: 10, marginBottom: 16, paddingHorizontal: 24 },
  savePhotoBtnText: { color: '#fff', fontWeight: 'bold' },
  username: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  bio: { color: '#888', marginTop: 8, textAlign: 'center', marginBottom: 8 },
  infoBox: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16, width: '100%', marginTop: 16 },
  infoText: { color: '#aaa', marginBottom: 10, fontSize: 15 },
  button: { backgroundColor: '#6c63ff', padding: 14, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoutBtn: { marginTop: 20 },
  logoutText: { color: '#ff4d4d', fontSize: 15 },
  deleteBtn: { marginTop: 16, marginBottom: 40 },
  deleteText: { color: '#ff0000', fontSize: 15, fontWeight: 'bold' }
});