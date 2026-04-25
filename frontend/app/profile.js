import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  const user = {
    username: 'Bigdawg254',
    email: 'brian@example.com',
    age: 20,
    bio: 'Just vibing and connecting',
    gender: 'Male'
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user.username[0]}</Text>
      </View>

      <Text style={styles.username}>{user.username}</Text>
      <Text style={styles.bio}>{user.bio}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>📧 {user.email}</Text>
        <Text style={styles.infoText}>🎂 Age: {user.age}</Text>
        <Text style={styles.infoText}>⚧ {user.gender}</Text>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', padding: 24 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: 'bold' },
  username: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  bio: { color: '#888', marginTop: 8, textAlign: 'center' },
  infoBox: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16, width: '100%', marginTop: 24 },
  infoText: { color: '#aaa', marginBottom: 10, fontSize: 15 },
  button: { backgroundColor: '#6c63ff', padding: 14, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoutBtn: { marginTop: 16 },
  logoutText: { color: '#ff4d4d', fontSize: 15 }
});