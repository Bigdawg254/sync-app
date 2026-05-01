import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          age: age ? parseInt(age) : null
        })
      });
      const data = await response.json();
      if (response.ok) {
        await SecureStore.setItemAsync('userToken', data.token);
        await SecureStore.setItemAsync('userId', data.user.id.toString());
        await SecureStore.setItemAsync('username', data.user.username);
        await SecureStore.setItemAsync('userEmail', email.trim().toLowerCase());
        await SecureStore.setItemAsync('userPassword', password);
        router.replace('/home');
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (err) {
      Alert.alert('Error', 'Cannot connect to server');
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Join Sync</Text>
      <Text style={styles.subtitle}>Find your vibe</Text>

      <TextInput style={styles.input} placeholder="Username *" placeholderTextColor="#888" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Email *" placeholderTextColor="#888" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password *" placeholderTextColor="#888" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Age (optional)" placeholderTextColor="#888" keyboardType="numeric" value={age} onChangeText={setAge} />

      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/login')}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0f0f0f' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { color: '#888', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 14, borderRadius: 10, marginBottom: 16 },
  button: { backgroundColor: '#6c63ff', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#6c63ff', textAlign: 'center', marginTop: 10 }
});