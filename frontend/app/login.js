import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, KeyboardAvoidingView, Platform, ScrollView, 
  Dimensions, Animated
} from 'react-native';
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
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

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
        Alert.alert('Error', 'Please login with email first to enable biometrics');
      }
    }
  };

  const doLogin = async (emailVal, passwordVal) => {
    if (!emailVal || !passwordVal) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailVal.trim().toLowerCase(), 
          password: passwordVal 
        })
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
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (err) {
      Alert.alert('Connection Error', 'Cannot reach server. Check your internet connection.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Animated background orbs */}
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />
      <View style={styles.bgOrb3} />

      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Logo Section */}
          <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Animated.View style={[styles.logoOrb, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.logoOrbInner}>
                <Text style={styles.logoLetter}>S</Text>
              </View>
              <View style={styles.logoRing1} />
              <View style={styles.logoRing2} />
            </Animated.View>
            <Text style={styles.appName}>SYNC</Text>
            <Text style={styles.tagline}>Connect • Vibe • Belong</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.welcomeSub}>Sign in to continue</Text>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="#333"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#333"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => router.push('/reset-password')} style={styles.forgotContainer}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnLoading]}
              onPress={() => doLogin(email, password)}
              disabled={loading}
              activeOpacity={0.85}>
              <Text style={styles.loginBtnText}>
                {loading ? '⏳  Signing in...' : 'SIGN IN  →'}
              </Text>
            </TouchableOpacity>

            {/* Biometric */}
            {biometricAvailable && (
              <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin} activeOpacity={0.8}>
                <Text style={styles.biometricIcon}>🔐</Text>
                <Text style={styles.biometricText}>Sign in with Fingerprint</Text>
              </TouchableOpacity>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>NEW TO SYNC?</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={styles.signupBtn}
              onPress={() => router.push('/signup')}
              activeOpacity={0.85}>
              <Text style={styles.signupBtnText}>CREATE FREE ACCOUNT</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020208' },
  flex: { flex: 1 },
  bgOrb1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(108,99,255,0.12)', top: -80, left: -80 },
  bgOrb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(108,99,255,0.08)', top: height * 0.3, right: -60 },
  bgOrb3: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(108,99,255,0.06)', bottom: 100, left: 20 },
  scrollContent: { flexGrow: 1, paddingBottom: 48 },
  logoSection: { alignItems: 'center', paddingTop: height * 0.1, paddingBottom: 40 },
  logoOrb: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative' },
  logoOrbInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 30, elevation: 20 },
  logoLetter: { fontSize: 52, fontWeight: 'bold', color: '#fff' },
  logoRing1: { position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 1.5, borderColor: 'rgba(108,99,255,0.4)' },
  logoRing2: { position: 'absolute', width: 128, height: 128, borderRadius: 64, borderWidth: 1, borderColor: 'rgba(108,99,255,0.15)' },
  appName: { fontSize: 44, fontWeight: 'bold', color: '#fff', letterSpacing: 14, marginBottom: 8 },
  tagline: { color: '#6c63ff', fontSize: 13, letterSpacing: 3, fontWeight: '500' },
  formSection: { paddingHorizontal: 24 },
  welcomeText: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 6 },
  welcomeSub: { color: '#444', fontSize: 15, marginBottom: 32 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: '#6c63ff', fontSize: 10, fontWeight: 'bold', letterSpacing: 3, marginBottom: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d0d18', borderRadius: 14, borderWidth: 1, borderColor: '#1a1a2e', paddingHorizontal: 16 },
  inputIcon: { fontSize: 18, marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 16 },
  eyeBtn: { padding: 8 },
  eyeIcon: { fontSize: 18 },
  forgotContainer: { alignItems: 'flex-end', marginBottom: 28, marginTop: -8 },
  forgotText: { color: '#6c63ff', fontSize: 13 },
  loginBtn: { backgroundColor: '#6c63ff', paddingVertical: 18, borderRadius: 14, alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  loginBtnLoading: { backgroundColor: '#3a3760', shadowOpacity: 0 },
  loginBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 2 },
  biometricBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0d0d18', paddingVertical: 16, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: '#6c63ff' },
  biometricIcon: { fontSize: 20 },
  biometricText: { color: '#6c63ff', fontWeight: '600', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 28 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#111120' },
  dividerText: { color: '#333', marginHorizontal: 14, fontSize: 11, letterSpacing: 2 },
  signupBtn: { borderWidth: 1.5, borderColor: '#6c63ff', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  signupBtnText: { color: '#6c63ff', fontWeight: 'bold', fontSize: 15, letterSpacing: 2 },
});