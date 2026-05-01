import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ChatOptionsScreen() {
  const router = useRouter();
  const { friendId, friendName } = useLocalSearchParams();

  const options = [
    { icon: '💬', label: 'Open Chat', action: () => router.replace({ pathname: '/chat', params: { friendId, friendName } }) },
    { icon: '👤', label: 'View Profile', action: () => router.replace({ pathname: '/user-profile', params: { userId: friendId } }) },
    { icon: '🔇', label: 'Mute Notifications', action: () => Alert.alert('Muted', `${friendName} notifications muted`) },
    { icon: '📦', label: 'Archive Chat', action: () => Alert.alert('Archived', `Chat with ${friendName} archived`) },
    { icon: '🗑️', label: 'Delete Chat', action: () => Alert.alert('Delete Chat', `Delete chat with ${friendName}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => router.replace('/home') }]) },
    { icon: '🚫', label: 'Block User', action: () => Alert.alert('Block', `Block ${friendName}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Block', style: 'destructive', onPress: () => router.replace('/home') }]) },
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.overlay} onPress={() => router.back()} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.name}>{friendName}</Text>
        {options.map((opt, i) => (
          <TouchableOpacity key={i} style={styles.option} onPress={opt.action} activeOpacity={0.7}>
            <Text style={styles.optionIcon}>{opt.icon}</Text>
            <Text style={[styles.optionLabel, opt.label.includes('Delete') || opt.label.includes('Block') ? styles.danger : null]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  overlay: { flex: 1 },
  sheet: { backgroundColor: '#0d0d14', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, borderWidth: 1, borderColor: '#1a1a2e' },
  handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  name: { color: '#6c63ff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#111120', gap: 16 },
  optionIcon: { fontSize: 24, width: 32 },
  optionLabel: { color: '#fff', fontSize: 16 },
  danger: { color: '#ff4d4d' },
});