import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type AuthSessionState = { status: 'loading' } | { status: 'anon' } | { status: 'signedIn'; userId: string; email: string | null };

/** Login-gated sections (saved dogs, community) read this instead of calling an
 * authenticated endpoint blind and handling the 401. */
export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>(supabase ? { status: 'loading' } : { status: 'anon' });

  useEffect(() => {
    if (!supabase) {
      return;
    }
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        const user = data.session?.user;
        setState(user ? { status: 'signedIn', userId: user.id, email: user.email ?? null } : { status: 'anon' });
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session?.user ? { status: 'signedIn', userId: session.user.id, email: session.user.email ?? null } : { status: 'anon' },
      );
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return state;
}
