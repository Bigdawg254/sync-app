import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Please enter your email'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
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
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.logoBox}>
          <Text style={styles.logoLetter}>S</Text>
        </View>

        {!sent ? (
          <>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.sub}>Enter your email and we'll send you a new temporary password</Text>

            <View style={styles.inputRow}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="Your email address"
                placeholderTextColor="#252535"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <TouchableOpacity style={[styles.btn, loading && styles.btnOff]} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Email</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successWrap}>
            <Text style={styles.successIcon}>📬</Text>
            <Text style={styles.successTitle}>Email Sent!</Text>
            <Text style={styles.successSub}>Check your inbox for your temporary password. Use it to login then change your password in Profile → Edit Profile.</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/login')} activeOpacity={0.85}>
              <Text style={styles.btnText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02020a' },
  inner: { flex: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  backBtn: { marginBottom: 32 },
  backText: { color: '#6c63ff', fontSize: 15 },
  logoBox: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12 },
  logoLetter: { fontSize: 36, fontWeight: 'bold', color: '#fff', fontStyle: 'italic' },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
  sub: { color: '#444', fontSize: 15, lineHeight: 22, marginBottom: 32 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#07070f', borderRadius: 16, borderWidth: 1, borderColor: '#0f0f20', paddingHorizontal: 16, height: 58, marginBottom: 20 },
  inputIcon: { fontSize: 18, marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  btn: { backgroundColor: '#6c63ff', height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  btnOff: { backgroundColor: '#2a2760', shadowOpacity: 0 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  successWrap: { alignItems: 'center', paddingTop: 40 },
  successIcon: { fontSize: 72, marginBottom: 20 },
  successTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
  successSub: { color: '#444', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
});