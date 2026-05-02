import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');
const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();

    checkBiometrics();
    loadSaved();
  }, []);

  const checkBiometrics = async () => {
    const compat = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compat && enrolled);
  };

  const loadSaved = async () => {
    try {
      const e = await SecureStore.getItemAsync('userEmail');
      const p = await SecureStore.getItemAsync('userPassword');
      if (e) setEmail(e);
      if (p) setPassword(p);
    } catch {}
  };

 // Save credentials - works on both web and mobile
const saveCredentials = async (token, userId, username, email, password) => {
  try {
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('userId', userId);
    await SecureStore.setItemAsync('username', username);
    await SecureStore.setItemAsync('userEmail', email);
    await SecureStore.setItemAsync('userPassword', password);
  } catch {
    // Web fallback
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('userToken', token);
      localStorage.setItem('userId', userId);
      localStorage.setItem('username', username);
    }
  }
};
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e.trim().toLowerCase(), password: p })
      });
      const data = await res.json();
      if (res.ok) {
        await SecureStore.setItemAsync('userToken', data.token);
        await SecureStore.setItemAsync('userId', data.user.id.toString());
        await SecureStore.setItemAsync('username', data.user.username);
        await SecureStore.setItemAsync('userEmail', e.trim().toLowerCase());
        await SecureStore.setItemAsync('userPassword', p);
        router.replace('/home');
      } else {
        Alert.alert('Login Failed', data.error);
      }
    } catch {
      Alert.alert('Error', 'Cannot connect. Check internet.');
    }
    setLoading(false);
  };

  const biometricLogin = async () => {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Login with Fingerprint' });
    if (result.success) {
      const e = await SecureStore.getItemAsync('userEmail');
      const p = await SecureStore.getItemAsync('userPassword');
      if (e && p) await doLogin(e, p);
      else Alert.alert('Error', 'Login with email first to enable biometrics');
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient orbs background */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      <View style={[styles.orb, styles.orb3]} />
      <View style={[styles.orb, styles.orb4]} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <Animated.View style={[styles.logoWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Animated.View style={[styles.logoOrb, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.logoInner}>
                <Text style={styles.logoS}>S</Text>
              </View>
              <View style={styles.ring1} />
              <View style={styles.ring2} />
              <View style={styles.ring3} />
            </Animated.View>
            <Text style={styles.appName}>SYNC</Text>
            <Text style={styles.tagline}>Connect  •  Vibe  •  Belong</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.welcomeTitle}>Welcome back 👋</Text>
            <Text style={styles.welcomeSub}>Sign in to your account</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldIcon}>✉️</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="your@email.com"
                  placeholderTextColor="#2a2a3a"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldIcon}>🔑</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Your password"
                  placeholderTextColor="#2a2a3a"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => router.push('/reset-password')} style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnOff]}
              onPress={() => doLogin(email, password)}
              disabled={loading}
              activeOpacity={0.85}>
              <Text style={styles.loginBtnText}>{loading ? 'Signing in...' : 'SIGN IN'}</Text>
            </TouchableOpacity>

            {biometricAvailable && (
              <TouchableOpacity style={styles.bioBtn} onPress={biometricLogin} activeOpacity={0.8}>
                <Text style={styles.bioBtnText}>🔐  Use Fingerprint</Text>
              </TouchableOpacity>
            )}

            <View style={styles.divider}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>OR</Text>
              <View style={styles.divLine} />
            </View>

            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/signup')} activeOpacity={0.85}>
              <Text style={styles.createBtnText}>CREATE ACCOUNT</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02020a' },
  flex: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 350, height: 350, backgroundColor: 'rgba(108,99,255,0.15)', top: -120, left: -100 },
  orb2: { width: 250, height: 250, backgroundColor: 'rgba(108,99,255,0.08)', top: height * 0.35, right: -80 },
  orb3: { width: 180, height: 180, backgroundColor: 'rgba(255,107,107,0.06)', bottom: 80, left: -40 },
  orb4: { width: 120, height: 120, backgroundColor: 'rgba(100,200,255,0.05)', bottom: 200, right: 20 },
  scroll: { flexGrow: 1, paddingBottom: 48 },
  logoWrap: { alignItems: 'center', paddingTop: height * 0.09, paddingBottom: 36 },
  logoOrb: { width: 130, height: 130, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  logoInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 20 },
  logoS: { fontSize: 56, fontWeight: 'bold', color: '#fff' },
  ring1: { position: 'absolute', width: 115, height: 115, borderRadius: 58, borderWidth: 1.5, borderColor: 'rgba(108,99,255,0.5)' },
  ring2: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderColor: 'rgba(108,99,255,0.25)' },
  ring3: { position: 'absolute', width: 145, height: 145, borderRadius: 73, borderWidth: 0.5, borderColor: 'rgba(108,99,255,0.1)' },
  appName: { fontSize: 46, fontWeight: 'bold', color: '#fff', letterSpacing: 16, marginBottom: 10 },
  tagline: { color: '#6c63ff', fontSize: 12, letterSpacing: 4, fontWeight: '500' },
  form: { paddingHorizontal: 24 },
  welcomeTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 6 },
  welcomeSub: { color: '#333', fontSize: 15, marginBottom: 32 },
  field: { marginBottom: 20 },
  fieldLabel: { color: '#6c63ff', fontSize: 10, fontWeight: 'bold', letterSpacing: 3, marginBottom: 10 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080814', borderRadius: 14, borderWidth: 1, borderColor: '#111128', paddingHorizontal: 16, height: 56 },
  fieldIcon: { fontSize: 18, marginRight: 12 },
  fieldInput: { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 18 },
  forgotWrap: { alignItems: 'flex-end', marginBottom: 28, marginTop: -8 },
  forgotText: { color: '#6c63ff', fontSize: 13 },
  loginBtn: { backgroundColor: '#6c63ff', height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  loginBtnOff: { backgroundColor: '#2a2760', shadowOpacity: 0 },
  loginBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15, letterSpacing: 3 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 14, marginTop: 12, backgroundColor: '#080814', borderWidth: 1, borderColor: '#6c63ff' },
  bioBtnText: { color: '#6c63ff', fontWeight: '600', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divLine: { flex: 1, height: 1, backgroundColor: '#0d0d1a' },
  divText: { color: '#222', marginHorizontal: 16, fontSize: 11, letterSpacing: 3 },
  createBtn: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#6c63ff' },
  createBtnText: { color: '#6c63ff', fontWeight: 'bold', fontSize: 15, letterSpacing: 3 },
});