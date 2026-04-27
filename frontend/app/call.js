import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

export default function CallScreen() {
  const router = useRouter();
  const { friendName } = useLocalSearchParams();
  const [callStatus, setCallStatus] = useState('calling');
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  const endCall = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.callerInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{friendName ? friendName[0].toUpperCase() : '?'}</Text>
        </View>
        <Text style={styles.callerName}>{friendName || 'Unknown'}</Text>
        <Text style={styles.callStatus}>
          {callStatus === 'calling' ? 'Calling...' : 'Connected'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setMuted(!muted)}>
          <Text style={styles.controlIcon}>{muted ? '🔇' : '🎤'}</Text>
          <Text style={styles.controlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endBtn} onPress={endCall}>
          <Text style={styles.endBtnIcon}>📵</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={() => setSpeakerOn(!speakerOn)}>
          <Text style={styles.controlIcon}>{speakerOn ? '🔊' : '🔈'}</Text>
          <Text style={styles.controlLabel}>{speakerOn ? 'Speaker' : 'Earpiece'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'space-between', paddingVertical: 80 },
  callerInfo: { alignItems: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  avatarText: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  callerName: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  callStatus: { color: '#888', fontSize: 16, marginTop: 8 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40 },
  controlBtn: { alignItems: 'center' },
  controlIcon: { fontSize: 32 },
  controlLabel: { color: '#888', marginTop: 8, fontSize: 12 },
  endBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ff4d4d', justifyContent: 'center', alignItems: 'center' },
  endBtnIcon: { fontSize: 32 },
});