import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { storage } from './storage';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          age: age ? parseInt(age) : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        await storage.set('userToken', data.token);
        await storage.set('userId', data.user.id.toString());
        await storage.set('username', data.user.username);
        await storage.set('userEmail', email.trim().toLowerCase());
        await storage.set('userPassword', password);
        router.replace('/home');
      } else {
        Alert.alert('Error', data.error);
      }
    } catch {
      Alert.alert('Error', 'Cannot connect to server');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
          <Text style={styles.appName}>sync</Text>
          <Text style={styles.tagline}>Join the community</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.sub}>It's free and always will be</Text>

          <View style={styles.field}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldIcon}>👤</Text>
              <TextInput style={styles.fieldInput} placeholder="Username" placeholderTextColor="#2a2a3a" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldIcon}>✉️</Text>
              <TextInput style={styles.fieldInput} placeholder="Email address" placeholderTextColor="#2a2a3a" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldIcon}>🔑</Text>
              <TextInput style={styles.fieldInput} placeholder="Password" placeholderTextColor="#2a2a3a" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} autoCorrect={false} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldIcon}>🎂</Text>
              <TextInput style={styles.fieldInput} placeholder="Age (optional)" placeholderTextColor="#2a2a3a" keyboardType="numeric" value={age} onChangeText={setAge} />
            </View>
          </View>

          <TouchableOpacity style={[styles.signupBtn, loading && styles.signupBtnOff]} onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.signupBtnText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.loginLink}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02020a' },
  scroll: { flexGrow: 1, paddingBottom: 48 },
  header: { paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingHorizontal: 12 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backText: { color: '#6c63ff', fontSize: 24 },
  logoSection: { alignItems: 'center', paddingVertical: 24 },
  logoBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 20, elevation: 15 },
  logoLetter: { fontSize: 40, fontWeight: 'bold', color: '#fff', fontStyle: 'italic' },
  appName: { fontSize: 32, fontWeight: '300', color: '#fff', letterSpacing: 10 },
  tagline: { color: 'rgba(108,99,255,0.8)', fontSize: 12, letterSpacing: 3, marginTop: 6 },
  form: { paddingHorizontal: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  sub: { color: '#333', fontSize: 14, marginBottom: 28 },
  field: { marginBottom: 14 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080814', borderRadius: 16, borderWidth: 1, borderColor: '#111128', paddingHorizontal: 16, height: 56 },
  fieldIcon: { fontSize: 18, marginRight: 12 },
  fieldInput: { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn: { padding: 4 },
  signupBtn: { backgroundColor: '#6c63ff', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  signupBtnOff: { backgroundColor: '#2a2760', shadowOpacity: 0 },
  signupBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loginLink: { color: '#6c63ff', textAlign: 'center', marginTop: 24, fontSize: 14 },
});