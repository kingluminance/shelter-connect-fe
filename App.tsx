/**
 * Shelter Connect FE
 * @format
 */

import { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainTabs } from './src/app/MainTabs';
import { ChatScreen } from './src/modules/dog/ChatScreen';
import { ProfileScreen } from './src/modules/dog/ProfileScreen';
import { GameScreen } from './src/modules/game/GameScreen';
import { LoginScreen } from './src/modules/auth/LoginScreen';
import { SignUpScreen } from './src/modules/auth/SignUpScreen';
import { LoginGuideScreen } from './src/modules/auth/LoginGuideScreen';
import { InquiryRoomScreen } from './src/modules/inquiry/InquiryRoomScreen';
import { CommunityPostScreen } from './src/modules/community/CommunityPostScreen';
import { CommunityCommentsScreen } from './src/modules/community/CommunityCommentsScreen';
import { CommunityLocationsScreen } from './src/modules/community/CommunityLocationsScreen';
import { CommunityComposeScreen } from './src/modules/community/CommunityComposeScreen';
import { SightingComposeScreen } from './src/modules/community/SightingComposeScreen';
import { onAuthExpired } from './src/shared/lib/authExpired';
import type { RootStackParamList } from './src/app/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // apiFetch가 "토큰을 들고 갔는데 401"을 알리면 로그인 만료 시트를 띄운다 (Figma 19).
  useEffect(
    () =>
      onAuthExpired(() => {
        if (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name !== 'LoginGuide') {
          navigationRef.navigate('LoginGuide', { reason: 'expired' });
        }
      }),
    [],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator>
            <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Game" component={GameScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="LoginGuide"
              component={LoginGuideScreen}
              options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }}
            />
            <Stack.Screen name="InquiryRoom" component={InquiryRoomScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CommunityPost" component={CommunityPostScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CommunityComments" component={CommunityCommentsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CommunityLocations" component={CommunityLocationsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CommunityCompose" component={CommunityComposeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SightingCompose" component={SightingComposeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
