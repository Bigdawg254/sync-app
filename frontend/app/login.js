import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');
const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkBiometrics();
    loadSavedCredentials();
  }, []);

  const checkBiometrics = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
  };

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await SecureStore.getItemAsync('userEmail');
      const savedPassword = await SecureStore.getItemAsync('userPassword');
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
    } catch (err) {}
  };

  const handleBiometricLogin = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login with Fingerprint',
      fallbackLabel: 'Use Password'
    });
    if (result.success) {
      const savedEmail = await SecureStore.getItemAsync('userEmail');
      const savedPassword = await SecureStore.getItemAsync('userPassword');
      if (savedEmail && savedPassword) {
        await doLogin(savedEmail, savedPassword);
      } else {
        Alert.alert('Error', 'Please login with email first');
      }
    }
  };

  const doLogin = async (emailVal, passwordVal) => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal.trim().toLowerCase(), password: passwordVal })
      });
      const data = await response.json();
      if (response.ok) {
        await SecureStore.setItemAsync('userToken', data.token);
        await SecureStore.setItemAsync('userId', data.user.id.toString());
        await SecureStore.setItemAsync('username', data.user.username);
        await SecureStore.setItemAsync('userEmail', emailVal.trim().toLowerCase());
        await SecureStore.setItemAsync('userPassword', passwordVal);
        router.replace('/home');
      } else {
        Alert.alert('Login Failed', data.error);
      }
    } catch (err) {
      Alert.alert('Error', 'Cannot connect to server. Check your internet.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Anime-style header */}
        <View style={styles.heroSection}>
          <View style={styles.orbOuter}>
            <View style={styles.orbInner}>
              <Text style={styles.orbText}>S</Text>
            </View>
          </View>
          <Text style={styles.appName}>SYNC</Text>
          <Text style={styles.tagline}>✦ Connect Beyond Boundaries ✦</Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome Back</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#444"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#444"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={() => doLogin(email, password)}
            disabled={loading}>
            <Text style={styles.loginBtnText}>
              {loading ? 'CONNECTING...' : 'LOGIN →'}
            </Text>
          </TouchableOpacity>

          {biometricAvailable && (
            <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin}>
              <Text style={styles.biometricText}>🔐  Use Fingerprint</Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.signupBtn} onPress={() => router.push('/signup')}>
            <Text style={styles.signupBtnText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/reset-password')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: height * 0.08, paddingBottom: 30 },
  orbOuter: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 20 },
  orbInner: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  orbText: { fontSize: 44, fontWeight: 'bold', color: '#fff' },
  appName: { fontSize: 42, fontWeight: 'bold', color: '#fff', letterSpacing: 12 },
  tagline: { color: '#6c63ff', fontSize: 13, marginTop: 8, letterSpacing: 2 },
  formCard: { marginHorizontal: 20, backgroundColor: '#0d0d14', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: '#1a1a2e' },
  formTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  inputWrapper: { marginBottom: 20 },
  inputLabel: { color: '#6c63ff', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  input: { backgroundColor: '#111120', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#1e1e3a' },
  loginBtn: { backgroundColor: '#6c63ff', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  loginBtnDisabled: { backgroundColor: '#3a3760' },
  loginBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 2 },
  biometricBtn: { backgroundColor: '#111120', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#6c63ff' },
  biometricText: { color: '#6c63ff', fontWeight: 'bold', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1e1e3a' },
  dividerText: { color: '#444', marginHorizontal: 12, fontSize: 12 },
  signupBtn: { backgroundColor: 'transparent', padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#6c63ff' },
  signupBtnText: { color: '#6c63ff', fontWeight: 'bold', fontSize: 16, letterSpacing: 2 },
  forgotText: { color: '#444', textAlign: 'center', marginTop: 20, fontSize: 14 },
});