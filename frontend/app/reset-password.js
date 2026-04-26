import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Password reset email sent! Check your inbox.');
        router.push('/login');
      } else {
        Alert.alert('Error', data.error || 'Something went wrong');
      }
    } catch (err) {
      Alert.alert('Error', 'Cannot connect to server');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your email and we'll send you a reset link</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <TouchableOpacity style={styles.button} onPress={handleReset}>
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.link}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0f0f0f' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { color: '#888', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 14, borderRadius: 10, marginBottom: 16 },
  button: { backgroundColor: '#6c63ff', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#6c63ff', textAlign: 'center', marginTop: 10 }
});