import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="home" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="call" />
      <Stack.Screen name="group-chat" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="find-friends" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="random-match" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="status" />
      <Stack.Screen name="user-profile" />
      <Stack.Screen name="chat-options" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}