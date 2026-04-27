import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function EditProfileScreen() {
const router = useRouter();
const [username, setUsername] = useState('');
const [bio, setBio] = useState('');
const [age, setAge] = useState('');
const [gender, setGender] = useState('');
const [loading, setLoading] = useState(false);

useEffect(() => {
loadProfile();
}, []);

const loadProfile = async () => {
try {
const userId = await SecureStore.getItemAsync('userId');
const token = await SecureStore.getItemAsync('userToken');

  if (!userId || !token) {
    Alert.alert('Error', 'User not authenticated');
    return;
  }

  const response = await fetch(`${API}/api/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json();
  console.log('Loaded profile:', data);

  setUsername(data.username || '');
  setBio(data.bio || '');
  setAge(data.age ? data.age.toString() : '');
  setGender(data.gender || '');

} catch (err) {
  console.log('Load profile error:', err);
  Alert.alert('Error', 'Failed to load profile');
}

};

const handleSave = async () => {
if (loading) return;

if (!username.trim()) {
  Alert.alert('Error', 'Username is required');
  return;
}

setLoading(true);

try {
  const userId = await SecureStore.getItemAsync('userId');
  const token = await SecureStore.getItemAsync('userToken');

  if (!userId || !token) {
    Alert.alert('Error', 'User not authenticated');
    setLoading(false);
    return;
  }

  const parsedAge = parseInt(age);
  const body = {
    username: username.trim(),
    bio: bio.trim(),
    gender: gender.trim()
  };

  if (age && age.trim() !== '') {
    if (isNaN(parsedAge)) {
      Alert.alert('Error', 'Age must be a valid number');
      setLoading(false);
      return;
    }
    body.age = parsedAge;
  }

  console.log('Sending body:', body);

  const response = await fetch(`${API}/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  console.log('Server response:', data);

  if (response.ok) {
    Alert.alert('Success', 'Profile updated!');
    router.replace('/profile');
  } else {
    Alert.alert('Error', data.error || 'Update failed');
  }

} catch (err) {
  console.log('Save error:', err);
  Alert.alert('Error', 'Cannot connect to server');
}

setLoading(false);

};

return (
<ScrollView style={styles.container}>
<View style={styles.header}>
<TouchableOpacity onPress={() => router.replace('/profile')}>
<Text style={styles.back}>← Back</Text>
</TouchableOpacity>
<Text style={styles.headerTitle}>Edit Profile</Text>
</View>

  <View style={styles.form}>
    <Text style={styles.label}>Username</Text>
    <TextInput
      style={styles.input}
      value={username}
      onChangeText={setUsername}
      placeholder="Username"
      placeholderTextColor="#888"
    />

    <Text style={styles.label}>Bio</Text>
    <TextInput
      style={[styles.input, styles.bioInput]}
      value={bio}
      onChangeText={setBio}
      placeholder="Tell people about yourself"
      placeholderTextColor="#888"
      multiline
    />

    <Text style={styles.label}>Age</Text>
    <TextInput
      style={styles.input}
      value={age}
      onChangeText={setAge}
      placeholder="Age"
      placeholderTextColor="#888"
      keyboardType="numeric"
    />

    <Text style={styles.label}>Gender</Text>
    <TextInput
      style={styles.input}
      value={gender}
      onChangeText={setGender}
      placeholder="Gender"
      placeholderTextColor="#888"
    />

    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
      <Text style={styles.saveBtnText}>
        {loading ? 'Saving...' : 'Save Changes'}
      </Text>
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
form: { padding: 24 },
label: { color: '#888', marginBottom: 8, fontSize: 14 },
input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 14, borderRadius: 10, marginBottom: 20 },
bioInput: { height: 100, textAlignVertical: 'top' },
saveBtn: { backgroundColor: '#6c63ff', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});