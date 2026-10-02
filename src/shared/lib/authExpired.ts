// apiFetch reports "this request carried a session token and still got 401" here; the app
// root listens and shows the 로그인 만료 sheet. Kept as a tiny emitter so shared/lib doesn't
// depend on navigation.
type Listener = () => void;
const listeners = new Set<Listener>();
let notifiedAt = 0;

export function onAuthExpired(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// A burst of parallel requests all 401 together — only the first one should open the sheet.
export function notifyAuthExpired() {
  const now = Date.now();
  if (now - notifiedAt < 3000) {
    return;
  }
  notifiedAt = now;
  listeners.forEach(listener => listener());
}
