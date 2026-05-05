import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from './storage';

const { width, height } = Dimensions.get('window');
const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [checkingAuto, setCheckingAuto] = useState(true);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    init();
  }, []);

  const init = async () => {
    try {
      const token = await storage.get('userToken');
      if (token) { router.replace('/home'); return; }
      const savedEmail = await storage.get('userEmail');
      const savedPassword = await storage.get('userPassword');
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
      if (Platform.OS !== 'web') {
        const compat = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (compat && enrolled && savedEmail && savedPassword) {
          setBiometricAvailable(true);
          setTimeout(() => triggerBiometric(savedEmail, savedPassword), 800);
        }
      }
    } catch {}
    setCheckingAuto(false);
  };

  const triggerBiometric = async (e, p) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to Sync',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });
      if (result.success) await doLogin(e, p);
    } catch {}
  };

  const doLogin = async (emailVal, passwordVal) => {
    if (!emailVal?.trim() || !passwordVal?.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal.trim().toLowerCase(), password: passwordVal })
      });
      const data = await res.json();
      if (res.ok) {
        await storage.set('userToken', data.token);
        await storage.set('userId', data.user.id.toString());
        await storage.set('username', data.user.username);
        await storage.set('userEmail', emailVal.trim().toLowerCase());
        await storage.set('userPassword', passwordVal);
        router.replace('/home');
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch {
      Alert.alert('Connection Error', 'Cannot reach server. Check your internet connection.');
    }
    setLoading(false);
  };

  if (checkingAuto) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.logoBoxSplash}>
          <Text style={styles.logoLetterSplash}>S</Text>
        </View>
        <Text style={styles.appNameSplash}>sync</Text>
      </View>
    );
  }

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      <View style={[styles.orb, styles.orb3]} />
      <View style={[styles.orb, styles.orb4]} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulseAnim }] }]}>
              <Animated.View style={[styles.logoGlow, { opacity: glowAnim }]} />
              {/* Instagram/WhatsApp style logo - gradient square with rounded corners */}
              <View style={styles.logoBox}>
                <View style={styles.logoBoxInner}>
                  {/* Camera lens style inner design */}
                  <View style={styles.logoCircleOuter}>
                    <View style={styles.logoCircleInner}>
                      <Text style={styles.logoLetter}>S</Text>
                    </View>
                  </View>
                  {/* Top right dot like Instagram */}
                  <View style={styles.logoTopDot} />
                </View>
              </View>
              <View style={styles.logoRing1} />
              <View style={styles.logoRing2} />
            </Animated.View>
            <Text style={styles.appName}>sync</Text>
            <Text style={styles.tagline}>connect  ·  vibe  ·  belong</Text>
          </Animated.View>

          <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.welcomeTitle}>Welcome back 👋</Text>
            <Text style={styles.welcomeSub}>Sign in to your account</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#252535"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <Text style={styles.inputIcon}>🔑</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#252535"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} activeOpacity={0.7}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => router.push('/reset-password')} style={styles.forgotWrap} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.loginBtn, loading && styles.loginBtnOff]} onPress={() => doLogin(email, password)} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.loginBtnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
            </TouchableOpacity>

            {biometricAvailable && (
              <TouchableOpacity style={styles.bioBtn} onPress={() => triggerBiometric(email, password)} activeOpacity={0.8}>
                <Text style={styles.bioBtnText}>🔐  Use Fingerprint</Text>
              </TouchableOpacity>
            )}

            <View style={styles.divider}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>or</Text>
              <View style={styles.divLine} />
            </View>

            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/signup')} activeOpacity={0.85}>
              <Text style={styles.createBtnText}>Create Account</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>By continuing you agree to our Terms of Service</Text>
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
  orb1: { width: 350, height: 350, backgroundColor: 'rgba(108,99,255,0.13)', top: -120, left: -100 },
  orb2: { width: 250, height: 250, backgroundColor: 'rgba(108,99,255,0.07)', top: height * 0.4, right: -80 },
  orb3: { width: 180, height: 180, backgroundColor: 'rgba(255,100,150,0.05)', bottom: 100, left: -40 },
  orb4: { width: 120, height: 120, backgroundColor: 'rgba(100,200,255,0.04)', bottom: 250, right: 30 },
  scroll: { flexGrow: 1, paddingBottom: 48 },
  logoSection: { alignItems: 'center', paddingTop: height * 0.09, paddingBottom: 40 },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 24, position: 'relative' },
  logoGlow: { position: 'absolute', width: 140, height: 140, borderRadius: 44, backgroundColor: '#6c63ff', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 40, elevation: 30 },
  logoBox: {
    width: 110, height: 110, borderRadius: 34,
    backgroundColor: '#6c63ff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 20,
  },
  logoBoxInner: { width: 96, height: 96, borderRadius: 28, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  logoCircleOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center' },
  logoCircleInner: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  logoLetter: { fontSize: 28, fontWeight: 'bold', color: '#fff', fontStyle: 'italic', letterSpacing: -1 },
  logoTopDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', top: 2, right: 4, opacity: 0.9 },
  logoRing1: { position: 'absolute', width: 126, height: 126, borderRadius: 40, borderWidth: 1.5, borderColor: 'rgba(108,99,255,0.35)' },
  logoRing2: { position: 'absolute', width: 144, height: 144, borderRadius: 46, borderWidth: 0.8, borderColor: 'rgba(108,99,255,0.15)' },
  appName: { fontSize: 40, fontWeight: '300', color: '#fff', letterSpacing: 14, marginBottom: 10 },
  tagline: { color: 'rgba(108,99,255,0.75)', fontSize: 12, letterSpacing: 4 },
  form: { paddingHorizontal: 24 },
  welcomeTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 6 },
  welcomeSub: { color: '#333', fontSize: 15, marginBottom: 28 },
  inputGroup: { marginBottom: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#07070f', borderRadius: 16, borderWidth: 1, borderColor: '#0f0f20', paddingHorizontal: 16, height: 58 },
  inputIcon: { fontSize: 18, marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 18 },
  forgotWrap: { alignItems: 'flex-end', marginBottom: 22, marginTop: 6 },
  forgotText: { color: '#6c63ff', fontSize: 13 },
  loginBtn: { backgroundColor: '#6c63ff', height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  loginBtnOff: { backgroundColor: '#2a2760', shadowOpacity: 0 },
  loginBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 58, borderRadius: 16, marginTop: 12, backgroundColor: '#07070f', borderWidth: 1, borderColor: '#6c63ff' },
  bioBtnText: { color: '#6c63ff', fontWeight: '600', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  divLine: { flex: 1, height: 1, backgroundColor: '#0a0a18' },
  divText: { color: '#1a1a2a', marginHorizontal: 14, fontSize: 13 },
  createBtn: { height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#6c63ff' },
  createBtnText: { color: '#6c63ff', fontWeight: 'bold', fontSize: 16 },
  terms: { color: '#111120', fontSize: 11, textAlign: 'center', marginTop: 20 },
  logoBoxSplash: { width: 90, height: 90, borderRadius: 28, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoLetterSplash: { fontSize: 44, fontWeight: 'bold', color: '#fff', fontStyle: 'italic' },
  appNameSplash: { fontSize: 36, fontWeight: '300', color: '#fff', letterSpacing: 12 },
});