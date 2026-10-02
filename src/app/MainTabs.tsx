import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../modules/home/HomeScreen';
import { ShelterTabScreen } from '../modules/dog/ShelterTabScreen';
import { SavedFriendsScreen } from '../modules/dog/SavedFriendsScreen';
import { SettingsScreen } from '../modules/auth/SettingsScreen';
import { ConversationsScreen } from '../modules/conversations/ConversationsScreen';
import { fonts } from '../shared/lib/fonts';
import { HomeSvg } from '../modules/home/components/HomeSvg';
import type { svgAssets } from '../modules/home/assets/svgAssets';
import type { MainTabParamList } from './navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Figma-exported tab icons (node 1:72); `size` is each icon's own artboard size.
const TAB_ICONS: Record<Exclude<keyof MainTabParamList, '내 정보'>, { name: keyof typeof svgAssets; size: number; pillWidth: number }> = {
  홈: { name: 'tabHouse', size: 19, pillWidth: 54 },
  보호소: { name: 'tabPaw', size: 19, pillWidth: 54 },
  커뮤니티: { name: 'tabCommunity', size: 21, pillWidth: 54 },
  '저장한 친구': { name: 'tabHeart', size: 19, pillWidth: 64 },
  대화: { name: 'tabChat', size: 19, pillWidth: 54 },
};

// Figma "Navigation / Home selected" (node 1:72) — the default bottom-tabs chrome
// can't do the rounded-top-corner paper card + per-tab pill highlight, so this
// replaces it outright via the `tabBar` render prop.
function PuppyConnectTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: 61 + Math.max(insets.bottom, 10) }]}>
      {state.routes.map(route => {
        const icon = TAB_ICONS[route.name as keyof typeof TAB_ICONS];
        if (!icon) {
          return null; // 내 정보처럼 탭 바에 버튼이 없는 라우트
        }
        // 내 정보·설정(Figma 18)은 홈 탭을 선택한 모습으로 보여준다.
        const focusedName = state.routes[state.index].name;
        const focused = focusedName === route.name || (focusedName === '내 정보' && route.name === '홈');
        const { options } = descriptors[route.key];
        const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name;
        return (
          <Pressable
            key={route.key}
            style={styles.tab}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          >
            <View style={[styles.tabInner, { width: icon.pillWidth }, focused && styles.tabInnerFocused]}>
              <HomeSvg name={icon.name} width={icon.size} height={icon.size} stroke={focused ? '#8C789D' : '#ADA8B1'} />
              <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function PlaceholderScreen({ label }: { label: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{label} 화면은 준비 중이에요</Text>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      // BottomTabView invokes `tabBar` as a plain function call (not JSX), so the
      // wrapper must return an *element* here — passing the component reference
      // directly runs its body outside React's reconciler and breaks its hooks
      // (surfaced as a FrameSizeProvider/useContext crash on device). The eslint
      // warning this triggers is a false positive: PuppyConnectTabBar itself is a
      // stable module-scope reference, only this thin wrapper is recreated.
      // eslint-disable-next-line react/no-unstable-nested-components
      tabBar={props => <PuppyConnectTabBar {...props} />}
    >
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="보호소" component={ShelterTabScreen} />
      <Tab.Screen name="커뮤니티">{() => <PlaceholderScreen label="커뮤니티" />}</Tab.Screen>
      <Tab.Screen name="저장한 친구" component={SavedFriendsScreen} />
      <Tab.Screen name="내 정보" component={SettingsScreen} />
      <Tab.Screen name="대화" component={ConversationsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fffefa',
    borderTopWidth: 1,
    borderTopColor: '#e7e2d9',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 8,
    paddingHorizontal: 5,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabInner: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabInnerFocused: { backgroundColor: '#f0e6f4' },
  tabLabel: { fontFamily: fonts.pixel, fontSize: 8.5, color: '#ada8b1' },
  tabLabelFocused: { color: '#8c789d' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcf9f0' },
  placeholderText: { fontFamily: fonts.body, fontSize: 14, color: '#82949c' },
});
