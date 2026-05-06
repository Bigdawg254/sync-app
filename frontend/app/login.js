import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from './storage';

const { width, height } = Dimensions.get('window');
const API = 'https://sync-app-production-2ff8.up.railway.app';

// Burj Khalifa silhouette drawn with pure React Native views
function BurjKhalifa() {
  return (
    <View style={bk.container}>
      {/* Sky gradient layers */}
      <View style={bk.skyLayer1} />
      <View style={bk.skyLayer2} />
      <View style={bk.skyLayer3} />

      {/* Stars */}
      {[...Array(20)].map((_, i) => (
        <View key={i} style={[bk.star, {
          top: Math.random() * 120,
          left: Math.random() * width,
          width: Math.random() > 0.5 ? 2 : 1,
          height: Math.random() > 0.5 ? 2 : 1,
          opacity: Math.random() * 0.8 + 0.2
        }]} />
      ))}

      {/* Ground/city base */}
      <View style={bk.cityBase} />

      {/* City buildings silhouette */}
      <View style={[bk.building, { height: 60, width: 18, bottom: 20, left: width * 0.05 }]} />
      <View style={[bk.building, { height: 80, width: 22, bottom: 20, left: width * 0.12 }]} />
      <View style={[bk.building, { height: 55, width: 16, bottom: 20, left: width * 0.22 }]} />
      <View style={[bk.building, { height: 95, width: 28, bottom: 20, left: width * 0.3 }]} />
      <View style={[bk.building, { height: 70, width: 20, bottom: 20, left: width * 0.43 }]} />
      <View style={[bk.building, { height: 50, width: 18, bottom: 20, right: width * 0.22 }]} />
      <View style={[bk.building, { height: 75, width: 24, bottom: 20, right: width * 0.12 }]} />
      <View style={[bk.building, { height: 60, width: 20, bottom: 20, right: width * 0.04 }]} />

      {/* Burj Khalifa - centered, tall */}
      {/* Base section */}
      <View style={[bk.burjSection, { width: 52, height: 30, bottom: 80, alignSelf: 'center' }]} />
      {/* Middle section */}
      <View style={[bk.burjSection, { width: 40, height: 50, bottom: 108, alignSelf: 'center' }]} />
      {/* Upper section */}
      <View style={[bk.burjSection, { width: 30, height: 60, bottom: 156, alignSelf: 'center' }]} />
      {/* Slim upper */}
      <View style={[bk.burjSection, { width: 20, height: 70, bottom: 214, alignSelf: 'center' }]} />
      {/* Needle section */}
      <View style={[bk.burjSection, { width: 12, height: 80, bottom: 282, alignSelf: 'center' }]} />
      {/* Tip */}
      <View style={[bk.burjTip, { bottom: 360, alignSelf: 'center' }]} />

      {/* Windows on Burj - lit up */}
      {[...Array(12)].map((_, i) => (
        <View key={i} style={[bk.burjWindow, {
          bottom: 100 + (i * 22),
          alignSelf: 'center',
          left: width / 2 - 6 + (i % 3 === 0 ? -8 : i % 3 === 1 ? 0 : 8)
        }]} />
      ))}

      {/* Purple glow at base of Burj */}
      <View style={bk.burjGlow} />

      {/* Moon */}
      <View style={bk.moon} />
    </View>
  );
}

const bk = StyleSheet.create({
  container: { width: '100%', height: 280, overflow: 'hidden', position: 'relative' },
  skyLayer1: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#02020a' },
  skyLayer2: { position: 'absolute', top: 0, left: 0, right: 0, height: 180, backgroundColor: 'rgba(108,99,255,0.08)' },
  skyLayer3: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, backgroundColor: 'rgba(108,99,255,0.05)' },
  star: { position: 'absolute', backgroundColor: '#fff', borderRadius: 2 },
  cityBase: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, backgroundColor: '#0a0a16' },
  building: { position: 'absolute', backgroundColor: '#0d0d1e', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  burjSection: { position: 'absolute', backgroundColor: '#111128', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  burjTip: { position: 'absolute', width: 4, height: 30, backgroundColor: '#6c63ff', borderRadius: 2, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 15 },
  burjWindow: { position: 'absolute', width: 3, height: 3, backgroundColor: 'rgba(108,99,255,0.6)', borderRadius: 1 },
  burjGlow: { position: 'absolute', bottom: 60, alignSelf: 'center', width: 100, height: 40, backgroundColor: 'rgba(108,99,255,0.12)', borderRadius: 50 },
  moon: { position: 'absolute', top: 24, right: width * 0.15, width: 28, height: 28, borderRadius: 14, backgroundColor: '#e8e0ff', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 16, elevation: 10 },
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [checkingAuto, setCheckingAuto] = useState(true);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const towerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      Animated.timing(towerAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
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
          setTimeout(() => triggerBiometric(savedEmail, savedPassword), 1000);
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

  const doLogin = async (emailVal, passwordVal) => {
    if (!emailVal?.trim() || !passwordVal?.trim()) { Alert.alert('Error', 'Please fill in all fields'); return; }
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
        Alert.alert('Login Failed', data.error);
      }
    } catch { Alert.alert('Error', 'Cannot connect. Check your internet.'); }
    setLoading(false);
  };

  if (checkingAuto) {
    return (
      <View style={styles.splash}>
        <Animated.View style={[styles.splashGlow, { opacity: glowAnim }]} />
        <View style={styles.splashLogo}>
          <Text style={styles.splashLogoText}>S</Text>
        </View>
        <Text style={styles.splashName}>sync</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>

          {/* Burj Khalifa scene */}
          <Animated.View style={{ opacity: towerAnim }}>
            <BurjKhalifa />
          </Animated.View>

          {/* Logo overlay on the scene */}
          <View style={styles.logoOverlay}>
            <Animated.View style={[styles.logoMark, { opacity: glowAnim }]}>
              <View style={styles.logoMarkInner}>
                <Text style={styles.logoMarkS}>S</Text>
              </View>
            </Animated.View>
          </View>

          {/* App name */}
          <Animated.View style={[styles.appNameWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.appName}>SYNC</Text>
            <Text style={styles.appTagline}>where connections reach new heights</Text>
          </Animated.View>

          {/* Form card */}
          <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.formCardTop}>
              <View style={styles.formCardDot} />
              <View style={[styles.formCardDot, { opacity: 0.5 }]} />
              <View style={[styles.formCardDot, { opacity: 0.3 }]} />
            </View>

            <Text style={styles.formTitle}>Sign In</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputIconText}>@</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#1a1a2a"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputIconText}>•••</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your password"
                  placeholderTextColor="#1a1a2a"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => router.push('/reset-password')} style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.signInBtn, loading && styles.signInBtnOff]} onPress={() => doLogin(email, password)} disabled={loading} activeOpacity={0.85}>
              <Animated.View style={[styles.signInBtnGlow, { opacity: glowAnim }]} />
              <Text style={styles.signInBtnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
            </TouchableOpacity>

            {biometricAvailable && (
              <TouchableOpacity style={styles.bioBtn} onPress={() => triggerBiometric(email, password)} activeOpacity={0.8}>
                <Text style={styles.bioBtnText}>🔐  Use Fingerprint</Text>
              </TouchableOpacity>
            )}

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>NEW HERE?</Text>
              <View style={styles.orLine} />
            </View>

            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/signup')} activeOpacity={0.85}>
              <Text style={styles.createBtnText}>Create Account</Text>
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
  splash: { flex: 1, backgroundColor: '#02020a', justifyContent: 'center', alignItems: 'center' },
  splashGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(108,99,255,0.2)' },
  splashLogo: { width: 90, height: 90, borderRadius: 28, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 40, elevation: 30 },
  splashLogoText: { fontSize: 48, fontWeight: 'bold', color: '#fff', fontStyle: 'italic' },
  splashName: { color: '#fff', fontSize: 32, fontWeight: '200', letterSpacing: 12, marginTop: 20 },
  scroll: { flexGrow: 1 },
  logoOverlay: { position: 'absolute', top: 180, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  logoMark: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 24, elevation: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  logoMarkInner: { width: 52, height: 52, borderRadius: 15, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  logoMarkS: { fontSize: 30, fontWeight: 'bold', color: '#fff', fontStyle: 'italic' },
  appNameWrap: { alignItems: 'center', paddingTop: 48, paddingBottom: 20 },
  appName: { fontSize: 44, fontWeight: '200', color: '#fff', letterSpacing: 16 },
  appTagline: { color: 'rgba(108,99,255,0.6)', fontSize: 11, letterSpacing: 3, marginTop: 8, textAlign: 'center' },
  formCard: { marginHorizontal: 20, backgroundColor: '#06060e', borderRadius: 28, padding: 28, borderWidth: 1, borderColor: '#0d0d1e', marginBottom: 48, overflow: 'hidden' },
  formCardTop: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  formCardDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6c63ff' },
  formTitle: { color: '#fff', fontSize: 22, fontWeight: '600', marginBottom: 24, letterSpacing: 1 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { color: '#1e1e3a', fontSize: 10, fontWeight: 'bold', letterSpacing: 3, marginBottom: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#030309', borderRadius: 14, borderWidth: 1, borderColor: '#0d0d1e', paddingHorizontal: 16, height: 56 },
  inputIconText: { color: '#6c63ff', fontSize: 14, fontWeight: 'bold', marginRight: 12, width: 28 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn: { padding: 6 },
  forgotRow: { alignItems: 'flex-end', marginBottom: 24, marginTop: 4 },
  forgotText: { color: '#6c63ff', fontSize: 13 },
  signInBtn: { height: 56, borderRadius: 16, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 15 },
  signInBtnGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.08)' },
  signInBtnOff: { backgroundColor: '#1a1830', shadowOpacity: 0 },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 2 },
  bioBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 12, backgroundColor: '#030309', borderWidth: 1, borderColor: '#6c63ff' },
  bioBtnText: { color: '#6c63ff', fontWeight: '600', fontSize: 15 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: '#0a0a18' },
  orText: { color: '#111128', marginHorizontal: 14, fontSize: 10, letterSpacing: 3 },
  createBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#6c63ff' },
  createBtnText: { color: '#6c63ff', fontWeight: '700', fontSize: 16 },
});