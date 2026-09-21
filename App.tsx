/**
 * Shelter Connect FE
 * @format
 */

import { Pressable, StatusBar, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameScreen } from './src/modules/game/GameScreen';

// ponytail: placeholder Home screen, replace once modules/shelter (보호소 선택) lands
function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 8, color: '#000' }}>보호소 커넥트</Text>
      <Text style={{ color: '#000', marginBottom: 24 }}>Dev environment ready 🐾</Text>
      <Pressable onPress={() => navigation.navigate('Game' as never)}>
        <Text style={{ color: '#4a90d9', fontSize: 16 }}>운동장 들어가기 →</Text>
      </Pressable>
    </View>
  );
}

const Stack = createNativeStackNavigator();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Game" component={GameScreen} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
