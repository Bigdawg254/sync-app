import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';

const { width } = Dimensions.get('window');

export default function CallScreen() {
  const router = useRouter();
  const { friendName, friendId } = useLocalSearchParams();
  const [callStatus, setCallStatus] = useState('calling');
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [duration, setDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Simulate call connecting after 3 seconds
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }, 3000);

    return () => {
      clearTimeout(connectTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const endCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      {/* Top info */}
      <View style={styles.topSection}>
        <Text style={styles.callLabel}>{callStatus === 'calling' ? '📞 Calling...' : '🟢 Connected'}</Text>
        <Animated.View style={[styles.avatarWrap, { transform: [{ scale: callStatus === 'calling' ? pulseAnim : 1 }] }]}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{friendName ? friendName[0].toUpperCase() : '?'}</Text>
            </View>
          </View>
        </Animated.View>
        <Text style={styles.friendName}>{friendName || 'Unknown'}</Text>
        <Text style={styles.callDuration}>
          {callStatus === 'calling' ? 'Ringing...' : formatDuration(duration)}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsWrap}>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={[styles.controlBtn, muted && styles.controlBtnActive]} onPress={() => setMuted(!muted)} activeOpacity={0.8}>
            <Text style={styles.controlBtnIcon}>{muted ? '🔇' : '🎤'}</Text>
            <Text style={styles.controlBtnLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, videoOn && styles.controlBtnActive]} onPress={() => setVideoOn(!videoOn)} activeOpacity={0.8}>
            <Text style={styles.controlBtnIcon}>{videoOn ? '📹' : '📷'}</Text>
            <Text style={styles.controlBtnLabel}>{videoOn ? 'Video On' : 'Video'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, speakerOn && styles.controlBtnActive]} onPress={() => setSpeakerOn(!speakerOn)} activeOpacity={0.8}>
            <Text style={styles.controlBtnIcon}>{speakerOn ? '🔊' : '🔈'}</Text>
            <Text style={styles.controlBtnLabel}>{speakerOn ? 'Speaker' : 'Earpiece'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.endBtn} onPress={endCall} activeOpacity={0.8}>
          <Text style={styles.endBtnIcon}>📵</Text>
          <Text style={styles.endBtnLabel}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02020a', justifyContent: 'space-between' },
  bgOrb1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(108,99,255,0.12)', top: -80, left: -80 },
  bgOrb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(108,99,255,0.06)', bottom: 80, right: -60 },
  topSection: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 80 : 60 },
  callLabel: { color: '#6c63ff', fontSize: 14, letterSpacing: 2, marginBottom: 32 },
  avatarWrap: { marginBottom: 24 },
  avatarRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: 'rgba(108,99,255,0.4)', justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 15 },
  avatarText: { fontSize: 52, fontWeight: 'bold', color: '#fff' },
  friendName: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  callDuration: { color: '#555', fontSize: 18 },
  controlsWrap: { paddingBottom: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 24 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 32 },
  controlBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0d0d18', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1a1a2e' },
  controlBtnActive: { backgroundColor: '#6c63ff22', borderColor: '#6c63ff' },
  controlBtnIcon: { fontSize: 28 },
  controlBtnLabel: { color: '#555', fontSize: 11, marginTop: 4 },
  endBtn: { width: '100%', height: 68, borderRadius: 34, backgroundColor: '#ff3b3b', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10, shadowColor: '#ff3b3b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  endBtnIcon: { fontSize: 28 },
  endBtnLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});