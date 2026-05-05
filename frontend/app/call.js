import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { storage } from './storage';

const API = 'https://sync-app-production-2ff8.up.railway.app';

export default function CallScreen() {
  const router = useRouter();
  const { friendName, friendId, isOutgoing, isVideo, isIncoming, callerId, callerName } = useLocalSearchParams();
  const [callStatus, setCallStatus] = useState(isIncoming === 'true' ? 'incoming' : 'calling');
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [videoOn, setVideoOn] = useState(isVideo === 'true');
  const [duration, setDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const socketRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    initSocket();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const initSocket = async () => {
    const userId = await storage.get('userId');
    socketRef.current = io(API, { transports: ['websocket'] });
    socketRef.current.emit('user_online', userId);

    socketRef.current.on('call_accepted', () => {
      setCallStatus('connected');
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    });

    socketRef.current.on('call_rejected', () => {
      Alert.alert('Call Rejected', `${friendName} declined the call`);
      saveCallLog('rejected', 0);
      router.back();
    });

    socketRef.current.on('call_ended', () => {
      const dur = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
      saveCallLog('completed', dur);
      router.back();
    });

    // Auto connect if no answer after 30 seconds
    if (isIncoming !== 'true') {
      setTimeout(() => {
        if (callStatus === 'calling') {
          saveCallLog('missed', 0);
          router.back();
        }
      }, 30000);
    }
  };

  const saveCallLog = async (status, dur) => {
    try {
      const token = await storage.get('userToken');
      await fetch(`${API}/api/calls/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          receiver_id: friendId || callerId,
          duration: dur,
          status,
          call_type: videoOn ? 'video' : 'voice'
        })
      });
    } catch {}
  };

  const acceptCall = () => {
    const callerIdVal = callerId;
    if (socketRef.current) {
      socketRef.current.emit('accept_call', { callerId: callerIdVal });
    }
    setCallStatus('connected');
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const endCall = () => {
    const dur = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    if (socketRef.current) {
      socketRef.current.emit('end_call', { targetUserId: friendId || callerId });
    }
    saveCallLog(callStatus === 'connected' ? 'completed' : 'missed', dur);
    if (timerRef.current) clearInterval(timerRef.current);
    router.back();
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const displayName = isIncoming === 'true' ? (callerName || 'Unknown') : (friendName || 'Unknown');

  return (
    <View style={styles.container}>
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <View style={styles.topSection}>
        {callStatus === 'calling' && <Text style={styles.callLabel}>📞 Calling...</Text>}
        {callStatus === 'incoming' && <Text style={styles.callLabel}>📲 Incoming Call</Text>}
        {callStatus === 'connected' && <Text style={styles.callLabel}>🟢 Connected</Text>}

        <Animated.View style={[styles.avatarWrap, callStatus !== 'connected' && { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName[0]?.toUpperCase() || '?'}</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={styles.friendName}>{displayName}</Text>
        <Text style={styles.callDuration}>
          {callStatus === 'calling' ? 'Ringing...' : callStatus === 'incoming' ? 'Tap to answer' : formatDuration(duration)}
        </Text>
        {videoOn && <Text style={styles.videoLabel}>📹 Video Call</Text>}
      </View>

      <View style={styles.controlsWrap}>
        {callStatus === 'incoming' ? (
          <View style={styles.incomingActions}>
            <TouchableOpacity style={styles.rejectBtn} onPress={endCall} activeOpacity={0.8}>
              <Text style={styles.rejectBtnIcon}>📵</Text>
              <Text style={styles.rejectBtnLabel}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={acceptCall} activeOpacity={0.8}>
              <Text style={styles.acceptBtnIcon}>📞</Text>
              <Text style={styles.acceptBtnLabel}>Accept</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.controlsRow}>
              <TouchableOpacity style={[styles.controlBtn, muted && styles.controlBtnActive]} onPress={() => setMuted(!muted)} activeOpacity={0.8}>
                <Text style={styles.controlBtnIcon}>{muted ? '🔇' : '🎤'}</Text>
                <Text style={styles.controlBtnLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, videoOn && styles.controlBtnActive]} onPress={() => setVideoOn(!videoOn)} activeOpacity={0.8}>
                <Text style={styles.controlBtnIcon}>{videoOn ? '📹' : '📷'}</Text>
                <Text style={styles.controlBtnLabel}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, speakerOn && styles.controlBtnActive]} onPress={() => setSpeakerOn(!speakerOn)} activeOpacity={0.8}>
                <Text style={styles.controlBtnIcon}>{speakerOn ? '🔊' : '🔈'}</Text>
                <Text style={styles.controlBtnLabel}>Speaker</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.endBtn} onPress={endCall} activeOpacity={0.8}>
              <Text style={styles.endBtnIcon}>📵</Text>
              <Text style={styles.endBtnLabel}>End Call</Text>
            </TouchableOpacity>
          </>
        )}
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
  avatarRing: { width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: 'rgba(108,99,255,0.4)', justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 128, height: 128, borderRadius: 64, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 18 },
  avatarText: { fontSize: 56, fontWeight: 'bold', color: '#fff' },
  friendName: { color: '#fff', fontSize: 30, fontWeight: 'bold', marginBottom: 8 },
  callDuration: { color: '#555', fontSize: 18 },
  videoLabel: { color: '#6c63ff', fontSize: 13, marginTop: 8 },
  controlsWrap: { paddingBottom: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 24 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 32 },
  controlBtn: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#0d0d18', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1a1a2e' },
  controlBtnActive: { backgroundColor: '#6c63ff22', borderColor: '#6c63ff' },
  controlBtnIcon: { fontSize: 28 },
  controlBtnLabel: { color: '#555', fontSize: 11, marginTop: 4 },
  endBtn: { width: '100%', height: 68, borderRadius: 34, backgroundColor: '#ff3b3b', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 12, shadowColor: '#ff3b3b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  endBtnIcon: { fontSize: 28 },
  endBtnLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  incomingActions: { flexDirection: 'row', justifyContent: 'space-around' },
  rejectBtn: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ff3b3b', justifyContent: 'center', alignItems: 'center', shadowColor: '#ff3b3b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  rejectBtnIcon: { fontSize: 36 },
  rejectBtnLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
  acceptBtn: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#00c853', justifyContent: 'center', alignItems: 'center', shadowColor: '#00c853', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  acceptBtnIcon: { fontSize: 36 },
  acceptBtnLabel: { color: '#fff', fontSize: 12, marginTop: 4 },
});