import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  Dimensions, Animated, StatusBar
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from './storage';
import { API } from '../constants/config';

const { width, height } = Dimensions.get('window');

// Animated particle component
function Particle({ delay, x, size, opacity }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 4000 + Math.random() * 3000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.6, -50] });
  const op = anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, opacity, opacity, 0] });
  return <Animated.View style={{ position: 'absolute', left: x, width: size, height: size, borderRadius: size / 2, backgroundColor: '#6c63ff', opacity: op, transform: [{ translateY }] }} />;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [checkingAuto, setCheckingAuto] = useState(true);
  const [focusedField, setFocusedField] = useState(null);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  const particles = useRef(
    Array.from({ length: 15 }, (_, i) => ({
      delay: i * 400,
      x: Math.random() * width,
      size: Math.random() * 4 + 2,
      opacity: Math.random() * 0.6 + 0.2,
    }))
  ).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(logoScaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2500, useNativeDriver: true }),
      ])
    ).start();

    init();
  }, []);

  const init = async () => {
    try {
      const token = await storage.get('userToken');
      if (token) { router.replace('/home'); return; }
      const savedEmail = await storage.get('userEmail');
      if (savedEmail) setEmail(savedEmail);
      if (Platform.OS !== 'web') {
        const compat = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const savedPassword = await storage.get('userPassword');
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
      });
      if (result.success) await doLogin(e, p);
    } catch {}
  };

  const pressIn = () => Animated.spring(buttonScaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(buttonScaleAnim, { toValue: 1, useNativeDriver: true }).start();

  const doLogin = async (emailVal, passwordVal) => {
    if (!emailVal?.trim() || !passwordVal?.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password');
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
        Alert.alert('Sign In Failed', data.error || 'Invalid credentials');
      }
    } catch {
      Alert.alert('Connection Error', 'Cannot reach server. Check your internet.');
    }
    setLoading(false);
  };

  if (checkingAuto) {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" />
        <Animated.View style={[styles.splashGlow, { opacity: glowAnim }]} />
        <View style={styles.splashLogo}>
          <View style={styles.splashLogoRing}>
            <Text style={styles.splashLogoLetter}>S</Text>
          </View>
        </View>
        <Text style={styles.splashTitle}>sync</Text>
        <Text style={styles.splashSub}>connect · vibe · belong</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#02020a" />

      {/* Floating particles */}
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      {/* Background gradient mesh */}
      <View style={styles.meshBg} />
      <View style={styles.meshBg2} />
      <View style={styles.meshBg3} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>

          {/* Hero Section */}
          <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
            {/* Logo */}
            <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScaleAnim }] }]}>
              <Animated.View style={[styles.logoGlow, { opacity: glowAnim }]} />
              <View style={styles.logoHex}>
                <View style={styles.logoHexInner}>
                  <Text style={styles.logoLetter}>S</Text>
                </View>
                {/* Orbiting rings */}
                <View style={styles.orbitRing1} />
                <View style={styles.orbitRing2} />
                {/* Corner accents */}
                <View style={[styles.cornerDot, { top: -4, right: 16 }]} />
                <View style={[styles.cornerDot, styles.cornerDotSm, { bottom: 8, left: 12 }]} />
                <View style={[styles.cornerDot, styles.cornerDotXs, { top: 14, left: -4 }]} />
              </View>
            </Animated.View>

            <Text style={styles.appTitle}>sync</Text>
            <View style={styles.taglineRow}>
              <View style={styles.taglineDash} />
              <Text style={styles.tagline}>where connections reach new heights</Text>
              <View style={styles.taglineDash} />
            </View>
          </Animated.View>

          {/* Form */}
          <Animated.View style={[styles.formWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Glass card */}
            <View style={styles.glassCard}>
              {/* Card top accent */}
              <View style={styles.cardTopAccent} />

              <Text style={styles.formHeading}>Welcome back</Text>
              <Text style={styles.formSubheading}>Sign in to continue your journey</Text>

              {/* Email */}
              <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused]}>
                <Text style={styles.inputPrefix}>✉</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#1e1e35"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Password */}
              <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused]}>
                <Text style={styles.inputPrefix}>⬡</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#1e1e35"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCorrect={false}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>

              {/* Forgot */}
              <TouchableOpacity onPress={() => router.push('/reset-password')} style={styles.forgotRow}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign in button */}
              <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
                <TouchableOpacity
                  style={[styles.signInBtn, loading && styles.signInBtnLoading]}
                  onPress={() => doLogin(email, password)}
                  onPressIn={pressIn}
                  onPressOut={pressOut}
                  disabled={loading}
                  activeOpacity={1}>
                  <View style={styles.signInBtnBg} />
                  <Text style={styles.signInBtnText}>
                    {loading ? '✦  Signing in...' : 'Sign In  →'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Biometric */}
              {biometricAvailable && (
                <TouchableOpacity
                  style={styles.bioBtn}
                  onPress={() => triggerBiometric(email, password)}
                  activeOpacity={0.8}>
                  <Text style={styles.bioBtnText}>🔐  Continue with Fingerprint</Text>
                </TouchableOpacity>
              )}

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>·  NEW TO SYNC  ·</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Create account */}
              <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/signup')} activeOpacity={0.85}>
                <Text style={styles.createBtnText}>Create Account</Text>
              </TouchableOpacity>

              <Text style={styles.termsText}>
                By continuing you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#02020a' },
  flex: { flex: 1 },
  splash: { flex: 1, backgroundColor: '#02020a', justifyContent: 'center', alignItems: 'center' },
  splashGlow: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#6c63ff', opacity: 0.15 },
  splashLogo: { width: 96, height: 96, borderRadius: 30, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 40, elevation: 30 },
  splashLogoRing: { width: 80, height: 80, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  splashLogoLetter: { fontSize: 44, fontWeight: '900', color: '#fff', fontStyle: 'italic' },
  splashTitle: { color: '#fff', fontSize: 36, fontWeight: '200', letterSpacing: 14, marginTop: 24 },
  splashSub: { color: 'rgba(108,99,255,0.6)', fontSize: 12, letterSpacing: 4, marginTop: 10 },
  meshBg: { position: 'absolute', width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(108,99,255,0.07)', top: -150, left: -120 },
  meshBg2: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(108,99,255,0.05)', top: height * 0.35, right: -100 },
  meshBg3: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(180,100,255,0.04)', bottom: 60, left: -60 },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? height * 0.09 : height * 0.07, paddingBottom: 32 },
  logoWrap: { alignItems: 'center', justifyContent: 'center', width: 160, height: 160, marginBottom: 20 },
  logoGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#6c63ff', opacity: 0.12 },
  logoHex: { width: 110, height: 110, borderRadius: 32, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 32, elevation: 25, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', position: 'relative' },
  logoHexInner: { width: 88, height: 88, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  logoLetter: { fontSize: 52, fontWeight: '900', color: '#fff', fontStyle: 'italic', letterSpacing: -2, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 2, height: 4 }, textShadowRadius: 8 },
  orbitRing1: { position: 'absolute', width: 128, height: 128, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)', borderStyle: 'dashed' },
  orbitRing2: { position: 'absolute', width: 148, height: 148, borderRadius: 46, borderWidth: 0.5, borderColor: 'rgba(108,99,255,0.15)' },
  cornerDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#6c63ff', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6, elevation: 6 },
  cornerDotSm: { width: 7, height: 7, borderRadius: 3.5, opacity: 0.7 },
  cornerDotXs: { width: 5, height: 5, borderRadius: 2.5, opacity: 0.5 },
  appTitle: { fontSize: 46, fontWeight: '200', color: '#fff', letterSpacing: 18, marginBottom: 14 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taglineDash: { width: 24, height: 1, backgroundColor: 'rgba(108,99,255,0.5)' },
  tagline: { color: 'rgba(108,99,255,0.65)', fontSize: 11, letterSpacing: 2 },
  formWrap: { paddingHorizontal: 20 },
  glassCard: { backgroundColor: 'rgba(8,8,20,0.95)', borderRadius: 28, padding: 28, borderWidth: 1, borderColor: '#0f0f22', overflow: 'hidden' },
  cardTopAccent: { position: 'absolute', top: 0, left: 40, right: 40, height: 1, backgroundColor: '#6c63ff', opacity: 0.5 },
  formHeading: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  formSubheading: { color: '#2a2a45', fontSize: 14, marginBottom: 28 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#04040e', borderRadius: 16, borderWidth: 1, borderColor: '#0f0f22', paddingHorizontal: 16, height: 58, marginBottom: 14 },
  inputWrapFocused: { borderColor: '#6c63ff', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  inputPrefix: { color: '#6c63ff', fontSize: 16, marginRight: 12, width: 24 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn: { padding: 6 },
  eyeText: { fontSize: 17 },
  forgotRow: { alignItems: 'flex-end', marginBottom: 22, marginTop: 2 },
  forgotText: { color: '#6c63ff', fontSize: 13 },
  signInBtn: { height: 58, borderRadius: 18, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  signInBtnBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#6c63ff' },
  signInBtnLoading: { opacity: 0.7, shadowOpacity: 0 },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 1, zIndex: 1 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 16, marginTop: 12, backgroundColor: '#04040e', borderWidth: 1, borderColor: '#6c63ff33' },
  bioBtnText: { color: '#6c63ff', fontWeight: '600', fontSize: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 22, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#0a0a18' },
  dividerLabel: { color: '#111128', fontSize: 9, letterSpacing: 3 },
  createBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#6c63ff33', backgroundColor: '#04040e' },
  createBtnText: { color: '#6c63ff', fontWeight: '700', fontSize: 15 },
  termsText: { color: '#0d0d20', fontSize: 11, textAlign: 'center', marginTop: 18, lineHeight: 16 },
  termsLink: { color: '#1a1a35' },
});