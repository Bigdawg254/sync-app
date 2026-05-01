import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.appName}>SYNC</Text>
          <Text style={styles.tagline}>✦ Join the Community ✦</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create Account</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>USERNAME *</Text>
            <TextInput style={styles.input} placeholder="Choose a username" placeholderTextColor="#444" value={username} onChangeText={setUsername} autoCapitalize="none" />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>EMAIL *</Text>
            <TextInput style={styles.input} placeholder="your@email.com" placeholderTextColor="#444" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>PASSWORD *</Text>
            <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#444" secureTextEntry value={password} onChangeText={setPassword} />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>AGE (OPTIONAL)</Text>
            <TextInput style={styles.input} placeholder="Your age" placeholderTextColor="#444" keyboardType="numeric" value={age} onChangeText={setAge} />
          </View>

          <TouchableOpacity style={[styles.signupBtn, loading && styles.signupBtnDisabled]} onPress={handleSignup} disabled={loading}>
            <Text style={styles.signupBtnText}>{loading ? 'CREATING...' : 'CREATE ACCOUNT →'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.loginText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: { paddingTop: 50, paddingHorizontal: 20 },
  backBtn: { padding: 8 },
  backText: { color: '#6c63ff', fontSize: 16 },
  heroSection: { alignItems: 'center', paddingVertical: 24 },
  appName: { fontSize: 36, fontWeight: 'bold', color: '#fff', letterSpacing: 12 },
  tagline: { color: '#6c63ff', fontSize: 13, marginTop: 8, letterSpacing: 2 },
  formCard: { marginHorizontal: 20, backgroundColor: '#0d0d14', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: '#1a1a2e' },
  formTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  inputWrapper: { marginBottom: 20 },
  inputLabel: { color: '#6c63ff', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  input: { backgroundColor: '#111120', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#1e1e3a' },
  signupBtn: { backgroundColor: '#6c63ff', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  signupBtnDisabled: { backgroundColor: '#3a3760' },
  signupBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 2 },
  loginText: { color: '#6c63ff', textAlign: 'center', marginTop: 20, fontSize: 14 },
});