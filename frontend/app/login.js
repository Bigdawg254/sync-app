import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from './storage';

const { width, height } = Dimensions.get('window');
const API = 'https://sync-app-production-2ff8.up.railway.app';

// Premium 3D-style S Logo Component
function SyncLogo({ pulseAnim, glowAnim }) {
  return (
    <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulseAnim }] }]}>
      {/* Outer glow rings */}
      <Animated.View style={[styles.glowRing3, { opacity: Animated.multiply(glowAnim, 0.3) }]} />
      <Animated.View style={[styles.glowRing2, { opacity: Animated.multiply(glowAnim, 0.5) }]} />
      <Animated.View style={[styles.glowRing1, { opacity: glowAnim }]} />
      
      {/* Main logo body - 3D layered effect */}
      <View style={styles.logoShadowLayer3} />
      <View style={styles.logoShadowLayer2} />
      <View style={styles.logoShadowLayer1} />
      <View style={styles.logoMain}>
        {/* Top highlight - gives 3D effect */}
        <View style={styles.logoHighlight} />
        {/* The S letter with premium styling */}
        <Text style={styles.logoS}>𝑺</Text>
        {/* Bottom reflection */}
        <View style={styles.logoReflection} />
      </View>

      {/* Orbiting dot elements like Instagram */}
      <View style={[styles.orbitDot, styles.orbitDot1]} />
      <View style={[styles.orbitDot, styles.orbitDot2]} />
      <View style={[styles.orbitDot, styles.orbitDot3]} />
    </Animated.View>
  );
}

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
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
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
      Alert.alert('Connection Error', 'Cannot reach server. Check your internet.');
    }
    setLoading(false);
  };

  if (checkingAuto) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashLogo}>
          <View style={styles.splashLogoInner}>
            <Text style={styles.splashLogoS}>𝑺</Text>
          </View>
        </View>
        <Text style={styles.splashAppName}>sync</Text>
        <Text style={styles.splashTagline}>connect · vibe · belong</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background gradient orbs */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      <View style={[styles.orb, styles.orb3]} />
      <View style={[styles.orb, styles.orb4]} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo Section */}
          <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <SyncLogo pulseAnim={pulseAnim} glowAnim={glowAnim} />
            <Text style={styles.appName}>sync</Text>
            <Text style={styles.tagline}>connect  ·  vibe  ·  belong</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.welcomeTitle}>Welcome back 👋</Text>
            <Text style={styles.welcomeSub}>Sign in to your account</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#1e1e2e"
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
                  placeholderTextColor="#1e1e2e"
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

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnOff]}
              onPress={() => doLogin(email, password)}
              disabled={loading}
              activeOpacity={0.85}>
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
  orb1: { width: 380, height: 380, backgroundColor: 'rgba(108,99,255,0.14)', top: -130, left: -110 },
  orb2: { width: 260, height: 260, backgroundColor: 'rgba(150,100,255,0.07)', top: height * 0.38, right: -90 },
  orb3: { width: 190, height: 190, backgroundColor: 'rgba(255,100,150,0.05)', bottom: 90, left: -50 },
  orb4: { width: 130, height: 130, backgroundColor: 'rgba(100,200,255,0.04)', bottom: 240, right: 20 },
  scroll: { flexGrow: 1, paddingBottom: 48 },

  // Splash screen
  splashContainer: { flex: 1, backgroundColor: '#02020a', justifyContent: 'center', alignItems: 'center' },
  splashLogo: { width: 110, height: 110, borderRadius: 36, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 40, elevation: 30 },
  splashLogoInner: { width: 90, height: 90, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  splashLogoS: { fontSize: 52, color: '#fff', fontWeight: 'bold' },
  splashAppName: { fontSize: 38, fontWeight: '300', color: '#fff', letterSpacing: 14 },
  splashTagline: { color: 'rgba(108,99,255,0.7)', fontSize: 12, letterSpacing: 4, marginTop: 8 },

  // Logo
  logoSection: { alignItems: 'center', paddingTop: height * 0.08, paddingBottom: 36 },
  logoWrap: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 22, position: 'relative' },
  glowRing3: { position: 'absolute', width: 180, height: 180, borderRadius: 60, backgroundColor: 'rgba(108,99,255,0.06)' },
  glowRing2: { position: 'absolute', width: 155, height: 155, borderRadius: 52, backgroundColor: 'rgba(108,99,255,0.1)' },
  glowRing1: { position: 'absolute', width: 132, height: 132, borderRadius: 44, backgroundColor: 'rgba(108,99,255,0.18)' },
  logoShadowLayer3: { position: 'absolute', width: 115, height: 115, borderRadius: 38, backgroundColor: 'rgba(0,0,0,0.6)', top: 30, left: 22 },
  logoShadowLayer2: { position: 'absolute', width: 115, height: 115, borderRadius: 38, backgroundColor: 'rgba(60,50,180,0.6)', top: 26, left: 22 },
  logoShadowLayer1: { position: 'absolute', width: 115, height: 115, borderRadius: 38, backgroundColor: 'rgba(90,80,220,0.8)', top: 24, left: 22 },
  logoMain: {
    width: 115, height: 115, borderRadius: 36,
    backgroundColor: '#6c63ff',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 24,
  },
  logoHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 48, backgroundColor: 'rgba(255,255,255,0.12)', borderTopLeftRadius: 36, borderTopRightRadius: 36 },
  logoS: { fontSize: 68, color: '#fff', fontWeight: 'bold', letterSpacing: -2, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 2, height: 4 }, textShadowRadius: 8 },
  logoReflection: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: 'rgba(0,0,0,0.15)', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  orbitDot: { position: 'absolute', borderRadius: 999 },
  orbitDot1: { width: 12, height: 12, backgroundColor: '#6c63ff', top: 10, right: 18, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 8 },
  orbitDot2: { width: 8, height: 8, backgroundColor: 'rgba(108,99,255,0.7)', bottom: 18, left: 22, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 6 },
  orbitDot3: { width: 6, height: 6, backgroundColor: 'rgba(108,99,255,0.5)', top: 30, left: 14 },
  appName: { fontSize: 40, fontWeight: '300', color: '#fff', letterSpacing: 14, marginBottom: 10 },
  tagline: { color: 'rgba(108,99,255,0.75)', fontSize: 12, letterSpacing: 4 },

  // Form
  form: { paddingHorizontal: 24 },
  welcomeTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 6 },
  welcomeSub: { color: '#2a2a3a', fontSize: 15, marginBottom: 28 },
  inputGroup: { marginBottom: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#06060e', borderRadius: 16, borderWidth: 1, borderColor: '#0e0e1e', paddingHorizontal: 16, height: 58 },
  inputIcon: { fontSize: 18, marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 18 },
  forgotWrap: { alignItems: 'flex-end', marginBottom: 22, marginTop: 6 },
  forgotText: { color: '#6c63ff', fontSize: 13 },
  loginBtn: { backgroundColor: '#6c63ff', height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.55, shadowRadius: 22, elevation: 14 },
  loginBtnOff: { backgroundColor: '#2a2760', shadowOpacity: 0 },
  loginBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 58, borderRadius: 16, marginTop: 12, backgroundColor: '#06060e', borderWidth: 1, borderColor: '#6c63ff' },
  bioBtnText: { color: '#6c63ff', fontWeight: '600', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  divLine: { flex: 1, height: 1, backgroundColor: '#08081a' },
  divText: { color: '#1a1a2a', marginHorizontal: 14, fontSize: 13 },
  createBtn: { height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#6c63ff' },
  createBtnText: { color: '#6c63ff', fontWeight: 'bold', fontSize: 16 },
  terms: { color: '#0e0e1e', fontSize: 11, textAlign: 'center', marginTop: 20 },
});