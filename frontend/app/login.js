import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  Dimensions, Animated, StatusBar
} from 'react-native';
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
  const [focused, setFocused] = useState(null);
  const router = useRouter();

  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const glow = useRef(new Animated.Value(0.3)).current;
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 45, friction: 7, useNativeDriver: true }),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 2000, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(ring1, { toValue: 1.15, duration: 2500, useNativeDriver: true }),
      Animated.timing(ring1, { toValue: 1, duration: 2500, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.delay(500),
      Animated.timing(ring2, { toValue: 1.2, duration: 3000, useNativeDriver: true }),
      Animated.timing(ring2, { toValue: 1, duration: 3000, useNativeDriver: true }),
    ])).start();

    init();
  }, []);

  const init = async () => {
    try {
      const token = await storage.get('userToken');
      if (token) { router.replace('/home'); return; }
      const savedEmail = await storage.get('userEmail');
      const savedPassword = await storage.get('userPassword');
      if (savedEmail) setEmail(savedEmail);
      if (Platform.OS !== 'web') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHardware && isEnrolled && savedEmail && savedPassword) {
          setBiometricAvailable(true);
          setTimeout(() => triggerBiometric(savedEmail, savedPassword), 800);
        }
      }
    } catch (e) { console.log(e); }
    setCheckingAuto(false);
  };

  const triggerBiometric = async (e, p) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to Sync',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });
      if (result.success) doLogin(e, p);
    } catch {}
  };

  const doLogin = async (emailVal, passwordVal) => {
    if (!emailVal?.trim() || !passwordVal?.trim()) {
      Alert.alert('Missing Info', 'Please enter your email and password');
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
      Alert.alert('No Connection', 'Cannot reach server. Check your internet.');
    }
    setLoading(false);
  };

  if (checkingAuto) {
    return (
      <View style={s.splash}>
        <StatusBar barStyle="light-content" />
        <Animated.View style={[s.splashGlow, { opacity: glow }]} />
        <View style={s.splashBox}>
          <Text style={s.splashS}>S</Text>
        </View>
        <Text style={s.splashName}>sync</Text>
        <Text style={s.splashTag}>connect · vibe · belong</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#02020a" />

      {/* Background orbs */}
      <View style={[s.orb, { width: 380, height: 380, top: -160, left: -130, opacity: 0.12 }]} />
      <View style={[s.orb, { width: 260, height: 260, top: height * 0.42, right: -100, opacity: 0.07 }]} />
      <View style={[s.orb, { width: 180, height: 180, bottom: 80, left: -60, opacity: 0.05 }]} />

      {/* Star dots scattered around */}
      {[...Array(18)].map((_, i) => (
        <View key={i} style={[s.star, {
          top: (Math.sin(i * 2.4) * 0.5 + 0.5) * height,
          left: (Math.cos(i * 1.7) * 0.5 + 0.5) * width,
          width: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1.5,
          height: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1.5,
          opacity: 0.15 + (i % 5) * 0.07,
        }]} />
      ))}

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>

          {/* Logo area */}
          <Animated.View style={[s.logoArea, { opacity: fade }]}>
            <Animated.View style={[s.logoWrap, { transform: [{ scale: logoScale }] }]}>
              {/* Outer glow */}
              <Animated.View style={[s.logoGlowBig, { opacity: glow }]} />
              {/* Breathing rings */}
              <Animated.View style={[s.logoRing, s.logoRingOuter, { transform: [{ scale: ring2 }] }]} />
              <Animated.View style={[s.logoRing, s.logoRingInner, { transform: [{ scale: ring1 }] }]} />
              {/* Main logo box */}
              <View style={s.logoBox}>
                <View style={s.logoBoxInner}>
                  <Text style={s.logoS}>S</Text>
                </View>
                {/* Highlight */}
                <View style={s.logoHighlight} />
                {/* Bottom shadow */}
                <View style={s.logoShadow} />
              </View>
              {/* Floating accent dots */}
              <View style={[s.accentDot, { top: 6, right: 18, width: 10, height: 10 }]} />
              <View style={[s.accentDot, { bottom: 14, left: 18, width: 7, height: 7, opacity: 0.6 }]} />
              <View style={[s.accentDot, { top: 22, left: 10, width: 5, height: 5, opacity: 0.4 }]} />
            </Animated.View>

            <Text style={s.appName}>sync</Text>
            <View style={s.tagRow}>
              <View style={s.tagLine} />
              <Text style={s.tagText}>connect · vibe · belong</Text>
              <View style={s.tagLine} />
            </View>
          </Animated.View>

          {/* Form card */}
          <Animated.View style={[s.card, { opacity: fade, transform: [{ translateY: slideY }] }]}>
            {/* Top accent bar */}
            <View style={s.cardAccent} />

            <Text style={s.cardTitle}>Welcome back 👋</Text>
            <Text style={s.cardSub}>Sign in to continue</Text>

            {/* Email field */}
            <View style={s.fieldLabel}>
              <Text style={s.fieldLabelText}>EMAIL</Text>
            </View>
            <View style={[s.fieldBox, focused === 'email' && s.fieldBoxFocused]}>
              <Text style={s.fieldIcon}>✉</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="your@email.com"
                placeholderTextColor="#151525"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
            </View>

            {/* Password field */}
            <View style={s.fieldLabel}>
              <Text style={s.fieldLabelText}>PASSWORD</Text>
            </View>
            <View style={[s.fieldBox, focused === 'password' && s.fieldBoxFocused]}>
              <Text style={s.fieldIcon}>🔒</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="Your password"
                placeholderTextColor="#151525"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCorrect={false}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                <Text style={{ fontSize: 17 }}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push('/reset-password')} style={s.forgotRow}>
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign in */}
            <TouchableOpacity
              style={[s.signBtn, loading && s.signBtnOff]}
              onPress={() => doLogin(email, password)}
              disabled={loading}
              activeOpacity={0.88}>
              <Animated.View style={[s.signBtnSheen, { opacity: glow }]} />
              <Text style={s.signBtnText}>{loading ? 'Signing in...' : 'Sign In  →'}</Text>
            </TouchableOpacity>

            {/* Biometric - always shown if available */}
            {biometricAvailable && (
              <TouchableOpacity
                style={s.bioBtn}
                onPress={() => triggerBiometric(email, password)}
                activeOpacity={0.8}>
                <Text style={s.bioBtnIcon}>🔐</Text>
                <Text style={s.bioBtnText}>Continue with Fingerprint</Text>
              </TouchableOpacity>
            )}

            {/* Note for Expo Go users */}
            {Platform.OS !== 'web' && !biometricAvailable && (
              <Text style={s.bioNote}>
                💡 Fingerprint login available in the installed APK
              </Text>
            )}

            <View style={s.divRow}>
              <View style={s.divLine} />
              <Text style={s.divText}>or</Text>
              <View style={s.divLine} />
            </View>

            <TouchableOpacity style={s.createBtn} onPress={() => router.push('/signup')} activeOpacity={0.88}>
              <Text style={s.createBtnText}>Create Account</Text>
            </TouchableOpacity>

            <Text style={s.terms}>
              By continuing you agree to our Terms of Service & Privacy Policy
            </Text>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const PURPLE = '#6c63ff';
const BG = '#02020a';
const CARD = '#05050f';
const BORDER = '#0d0d1e';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  splash: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  splashGlow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: PURPLE, opacity: 0.15 },
  splashBox: { width: 96, height: 96, borderRadius: 30, backgroundColor: PURPLE, justifyContent: 'center', alignItems: 'center', shadowColor: PURPLE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 40, elevation: 30 },
  splashS: { fontSize: 52, fontWeight: '900', color: '#fff', fontStyle: 'italic' },
  splashName: { color: '#fff', fontSize: 36, fontWeight: '200', letterSpacing: 14, marginTop: 22 },
  splashTag: { color: `${PURPLE}88`, fontSize: 12, letterSpacing: 4, marginTop: 10 },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: PURPLE },
  star: { position: 'absolute', borderRadius: 2, backgroundColor: '#ffffff' },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  logoArea: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? height * 0.08 : height * 0.06, paddingBottom: 28 },
  logoWrap: { width: 170, height: 170, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  logoGlowBig: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: PURPLE, opacity: 0.1 },
  logoRing: { position: 'absolute', borderRadius: 999 },
  logoRingOuter: { width: 155, height: 155, borderWidth: 0.8, borderColor: `${PURPLE}25` },
  logoRingInner: { width: 135, height: 135, borderWidth: 1.2, borderColor: `${PURPLE}40` },
  logoBox: { width: 108, height: 108, borderRadius: 34, backgroundColor: PURPLE, justifyContent: 'center', alignItems: 'center', shadowColor: PURPLE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 30, elevation: 25, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  logoBoxInner: { width: 90, height: 90, borderRadius: 28, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  logoS: { fontSize: 56, fontWeight: '900', color: '#fff', fontStyle: 'italic', letterSpacing: -2, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 2, height: 4 }, textShadowRadius: 10 },
  logoHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 44, backgroundColor: 'rgba(255,255,255,0.08)', borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  logoShadow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, backgroundColor: 'rgba(0,0,0,0.2)', borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  accentDot: { position: 'absolute', borderRadius: 99, backgroundColor: PURPLE, shadowColor: PURPLE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6, elevation: 6 },
  appName: { fontSize: 44, fontWeight: '200', color: '#fff', letterSpacing: 16, marginBottom: 12 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tagLine: { width: 28, height: 1, backgroundColor: `${PURPLE}55` },
  tagText: { color: `${PURPLE}80`, fontSize: 11, letterSpacing: 3 },
  card: { marginHorizontal: 18, backgroundColor: CARD, borderRadius: 28, padding: 26, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 40 },
  cardAccent: { position: 'absolute', top: 0, left: 44, right: 44, height: 1.5, backgroundColor: PURPLE, opacity: 0.6 },
  cardTitle: { color: '#fff', fontSize: 23, fontWeight: '700', marginBottom: 5, letterSpacing: 0.3 },
  cardSub: { color: '#1a1a32', fontSize: 14, marginBottom: 26 },
  fieldLabel: { marginBottom: 7 },
  fieldLabelText: { color: '#111128', fontSize: 10, fontWeight: '700', letterSpacing: 3 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#030309', borderRadius: 15, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, height: 56, marginBottom: 16 },
  fieldBoxFocused: { borderColor: PURPLE, shadowColor: PURPLE, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  fieldIcon: { color: PURPLE, fontSize: 15, marginRight: 11, width: 22, textAlign: 'center' },
  fieldInput: { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn: { padding: 5 },
  forgotRow: { alignItems: 'flex-end', marginBottom: 22, marginTop: -4 },
  forgotText: { color: PURPLE, fontSize: 13 },
  signBtn: { height: 56, borderRadius: 16, backgroundColor: PURPLE, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 18, elevation: 14 },
  signBtnOff: { opacity: 0.65, shadowOpacity: 0 },
  signBtnSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.07)', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  signBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.8, zIndex: 1 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 15, marginTop: 12, backgroundColor: '#030309', borderWidth: 1, borderColor: `${PURPLE}44`, gap: 10 },
  bioBtnIcon: { fontSize: 20 },
  bioBtnText: { color: PURPLE, fontWeight: '600', fontSize: 14 },
  bioNote: { color: '#111128', fontSize: 11, textAlign: 'center', marginTop: 10 },
  divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 14 },
  divLine: { flex: 1, height: 1, backgroundColor: '#080818' },
  divText: { color: '#111128', fontSize: 12 },
  createBtn: { height: 54, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: `${PURPLE}44`, backgroundColor: '#030309' },
  createBtnText: { color: PURPLE, fontWeight: '700', fontSize: 15 },
  terms: { color: '#0a0a18', fontSize: 10, textAlign: 'center', marginTop: 16, lineHeight: 15 },
});