import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useState } from 'react';

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hey! I saw your profile', sender: 'them' },
    { id: '2', text: 'Hi! Thanks for connecting', sender: 'me' },
  ]);

  const sendMessage = () => {
    if (message.trim()) {
      setMessages([...messages, { id: Date.now().toString(), text: message, sender: 'me' }]);
      setMessage('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Chat</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender === 'me' ? styles.me : styles.them]}>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 40, marginBottom: 16 },
  bubble: { padding: 12, borderRadius: 10, marginBottom: 10, maxWidth: '75%' },
  me: { backgroundColor: '#6c63ff', alignSelf: 'flex-end' },
  them: { backgroundColor: '#1e1e1e', alignSelf: 'flex-start' },
  msgText: { color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: { flex: 1, backgroundColor: '#1e1e1e', color: '#fff', padding: 12, borderRadius: 10 },
  sendBtn: { backgroundColor: '#6c63ff', padding: 12, borderRadius: 10, marginLeft: 8 },
  sendText: { color: '#fff', fontWeight: 'bold' }
});