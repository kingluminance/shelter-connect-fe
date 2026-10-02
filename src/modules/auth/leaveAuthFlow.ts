import type { NavigationProp } from '@react-navigation/native';

const AUTH_ROUTES = new Set(['Login', 'SignUp', 'LoginGuide']);

/** Pops every login/가입/안내 screen off the stack so the user lands back on the screen that
 * asked for login (docs/personal-discovery-api.md: "성공 후 원래 화면으로 돌아가는 것은 프론트 책임"). */
export function leaveAuthFlow(navigation: NavigationProp<Record<string, object | undefined>>) {
  const { routes } = navigation.getState();
  let top = routes.length - 1;
  while (top > 0 && AUTH_ROUTES.has(routes[top].name)) {
    top -= 1;
  }
  const count = routes.length - 1 - top;
  if (count > 0 && 'pop' in navigation && typeof navigation.pop === 'function') {
    (navigation as unknown as { pop: (n: number) => void }).pop(count);
  } else {
    navigation.goBack();
  }
}
