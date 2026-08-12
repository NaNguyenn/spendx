import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  apiGet,
  apiPost,
  type JsonRequestBody,
  type OkJson,
} from '@/api/client';
import type { paths } from '@/api/schema';
import { useStorageState } from '@/hooks/use-storage-state';

/**
 * Loads any persisted token at startup, exposes the signed-in user, and
 * provides signUp/signIn/signOut.
 *
 * The three type aliases below are derived from the generated `paths` rather
 * than hand-copied (ADR-0007), so changing a request or response shape in the
 * API breaks this file at compile time instead of at runtime.
 */

const SESSION_TOKEN_KEY = 'spendx-session-token';

export type SignUpInput = JsonRequestBody<paths['/auth/sign-up']['post']>;
export type SignInInput = JsonRequestBody<paths['/auth/sign-in']['post']>;
export type CurrentUser = OkJson<paths['/users/me']['get']>;

interface SessionContextValue {
  user: CurrentUser | null;
  /** True until the persisted token has been read and, if present, verified. */
  isLoading: boolean;
  signUp(input: SignUpInput): Promise<void>;
  signIn(input: SignInInput): Promise<void>;
  signOut(): void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isTokenLoading, token], setToken] =
    useStorageState(SESSION_TOKEN_KEY);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isResolvingUser, setIsResolvingUser] = useState(true);

  useEffect(() => {
    if (isTokenLoading) return;

    let cancelled = false;

    async function resolveUser() {
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setIsResolvingUser(false);
        }
        return;
      }

      setIsResolvingUser(true);

      try {
        const me = await apiGet('/users/me', { token });
        if (!cancelled) setUser(me);
      } catch {
        // Expired/invalid token (or a deleted account) — drop the session
        // rather than getting stuck loading forever.
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsResolvingUser(false);
      }
    }

    resolveUser();

    return () => {
      cancelled = true;
    };
  }, [isTokenLoading, token, setToken]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      isLoading: isTokenLoading || isResolvingUser,
      async signUp(input) {
        const result = await apiPost('/auth/sign-up', input);
        setToken(result.accessToken);
        setUser(result.user);
      },
      async signIn(input) {
        const result = await apiPost('/auth/sign-in', input);
        setToken(result.accessToken);
        setUser(result.user);
      },
      signOut() {
        setToken(null);
        setUser(null);
      },
    }),
    [user, isTokenLoading, isResolvingUser, setToken],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
