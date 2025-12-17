// src/pages/_app.tsx
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Provider, useDispatch } from 'react-redux';
import { store } from '@/store';
import React, { useEffect } from 'react';
import { restoreSessionIfPossible } from '@/services/authWrapper';
import { setCredentials, clearCredentials } from '@/store/authSlice';
import type { AppDispatch } from '@/store';

/**
 * AppInit runs once on client startup to restore session if possible.
 * It dispatches setCredentials or clearCredentials accordingly.
 *
 * Note: restoreSessionIfPossible reads stored tokens (localStorage) and attempts
 * a refresh if needed. It returns `{ user, token }` on success or `null` on failure.
 */
const AppInit: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const restored = await restoreSessionIfPossible();
        if (!mounted) return;

        if (restored) {
          dispatch(setCredentials({
            user: restored.user,
            token: restored.token,
          }));
        } else {
          dispatch(clearCredentials());
        }
      } catch {
        dispatch(clearCredentials());
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dispatch]);

  return null;
};


export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <AppInit />
      <Component {...pageProps} />
    </Provider>
  );
}
