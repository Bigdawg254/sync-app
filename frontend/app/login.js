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
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    init();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const init = async () => {
    try {
      const token = await storage.get('userToken');
      if (token) { router.replace('/home'); return; }
      const savedEmail = await storage.get('userEmail');
      const savedPassword = await storage.get('userPassword');
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
      const compat = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (compat && enrolled && savedEmail && savedPassword) {
        setBiometricAvailable(true);
        setTimeout(() => triggerBiometric(savedEmail, savedPassword), 600);
      }
    } catch {}
    setCheckingAuto(false);
  };

  const triggerBiometric = async (e, p) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to Sync',
        fallbackLabel: 'Use Password'
      });
      if (result.success) await doLogin(e, p);
    } catch {}
  };

  const doLogin = async (emailVal, passwordVal) => {
    if (!emailVal || !passwordVal) { Alert.alert('Error', 'Please fill in all fields'); return; }
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

  if (checkingAuto) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      <View style={[styles.orb, styles.orb3]} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.logoGradient}>
                <View style={styles.logoInnerRing}>
                  <Text style={styles.logoLetter}>S</Text>
                </View>
              </View>
              <View style={styles.logoRing1} />
              <View style={styles.logoRing2} />
              <View style={[styles.logoDot, { top: 8, right: 16 }]} />
              <View style={[styles.logoDot, styles.logoDotSmall, { bottom: 12, left: 20 }]} />
              <View style={[styles.logoDot, styles.logoDotTiny, { top: 20, left: 12 }]} />
            </Animated.View>
            <Text style={styles.appName}>sync</Text>
            <Text style={styles.tagline}>connect  ·  vibe  ·  belong</Text>
          </Animated.View>

          <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.welcomeTitle}>Welcome back 👋</Text>
            <Text style={styles.welcomeSub}>Sign in to continue</Text>

            <View style={styles.field}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldIcon}>✉️</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Email address"
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
              <View style={styles.fieldRow}>
                <Text style={styles.fieldIcon}>🔑</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Password"
                  placeholderTextColor="#2a2a3a"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => router.push('/reset-password')} style={styles.forgotWrap}>
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

            <Text style={styles.terms}>By continuing you agree to our Terms of Service and Privacy Policy</Text>
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
  orb1: { width: 400, height: 400, backgroundColor: 'rgba(108,99,255,0.12)', top: -150, left: -120 },
  orb2: { width: 300, height: 300, backgroundColor: 'rgba(255,107,107,0.05)', top: height * 0.4, right: -100 },
  orb3: { width: 200, height: 200, backgroundColor: 'rgba(100,200,255,0.04)', bottom: 60, left: -40 },
  scroll: { flexGrow: 1, paddingBottom: 48 },
  logoSection: { alignItems: 'center', paddingTop: height * 0.08, paddingBottom: 40 },
  logoContainer: { width: 150, height: 150, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  logoGradient: { width: 110, height: 110, borderRadius: 32, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 40, elevation: 25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  logoInnerRing: { width: 90, height: 90, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  logoLetter: { fontSize: 52, fontWeight: 'bold', color: '#fff', fontStyle: 'italic' },
  logoRing1: { position: 'absolute', width: 128, height: 128, borderRadius: 38, borderWidth: 1.5, borderColor: 'rgba(108,99,255,0.4)' },
  logoRing2: { position: 'absolute', width: 148, height: 148, borderRadius: 44, borderWidth: 0.8, borderColor: 'rgba(108,99,255,0.15)' },
  logoDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#6c63ff' },
  logoDotSmall: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(108,99,255,0.6)' },
  logoDotTiny: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(108,99,255,0.4)' },
  appName: { fontSize: 42, fontWeight: '300', color: '#fff', letterSpacing: 12, marginBottom: 10 },
  tagline: { color: 'rgba(108,99,255,0.8)', fontSize: 12, letterSpacing: 5 },
  formCard: { paddingHorizontal: 24 },
  welcomeTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 6 },
  welcomeSub: { color: '#333', fontSize: 15, marginBottom: 32 },
  field: { marginBottom: 16 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080814', borderRadius: 16, borderWidth: 1, borderColor: '#111128', paddingHorizontal: 16, height: 58 },
  fieldIcon: { fontSize: 18, marginRight: 12 },
  fieldInput: { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn: { padding: 4 },
  forgotWrap: { alignItems: 'flex-end', marginBottom: 24, marginTop: 4 },
  forgotText: { color: '#6c63ff', fontSize: 13 },
  loginBtn: { backgroundColor: '#6c63ff', height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  loginBtnOff: { backgroundColor: '#2a2760', shadowOpacity: 0 },
  loginBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 58, borderRadius: 16, marginTop: 12, backgroundColor: '#080814', borderWidth: 1, borderColor: '#6c63ff' },
  bioBtnText: { color: '#6c63ff', fontWeight: '600', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divLine: { flex: 1, height: 1, backgroundColor: '#0d0d1a' },
  divText: { color: '#222', marginHorizontal: 16, fontSize: 13 },
  createBtn: { height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#6c63ff' },
  createBtnText: { color: '#6c63ff', fontWeight: 'bold', fontSize: 16 },
  terms: { color: '#1a1a2a', fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 16 },
});