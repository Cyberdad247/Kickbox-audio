import type { User } from 'firebase/auth';
import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initGmailAuth, signInWithGmail, signOutGmail, GMAIL_SCOPES } from '../lib/gmailAuth';
import { type GmailMessage, fetchUnreadEmails } from '../lib/gmailService';
import firebaseConfig from '../../../../firebase-applet-config.json';

interface GmailContextState {
  user: User | null;
  accessToken: string | null;
  unreadEmails: GmailMessage[];
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getUnreadEmails: () => Promise<void>;
}

const GmailContext = createContext<GmailContextState | undefined>(undefined);

export const GmailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [unreadEmails, setUnreadEmails] = useState<GmailMessage[]>([]);
  const [tokenClient, setTokenClient] = useState<any>(null);

  // Initialize Google Identity Services (GIS) for precise token exchange logic
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google?.accounts?.oauth2) {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: firebaseConfig.oAuthClientId,
          scope: GMAIL_SCOPES.join(' '),
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              setAccessToken(tokenResponse.access_token);
            }
          },
        });
        setTokenClient(client);
      }
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = initGmailAuth(
      (authUser, token) => {
        setUser(authUser);
        if (token) setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      },
    );
    return () => unsubscribe();
  }, []);

  // Implementing the fetching of unread headers
  const getUnreadEmails = useCallback(async () => {
    if (!accessToken) return;
    try {
      // Utilizing the service method which specifically requests metadata headers (Subject, From, Date)
      const emails = await fetchUnreadEmails(accessToken, 3);
      setUnreadEmails(emails);
    } catch (err) {
      console.error('Failed to fetch unread email headers:', err);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      getUnreadEmails();
      const interval = setInterval(getUnreadEmails, 60000);
      return () => clearInterval(interval);
    } else {
      setUnreadEmails([]);
    }
  }, [accessToken, getUnreadEmails]);

  const signIn = async () => {
    try {
      const res = await signInWithGmail();
      if (res) {
        setUser(res.user);
        // Execute token exchange using the OAuth client ID via GIS
        if (tokenClient) {
          tokenClient.requestAccessToken({ hint: res.user.email });
        } else {
          setAccessToken(res.accessToken);
        }
      }
    } catch (error) {
      console.error("Gmail authentication failed", error);
    }
  };

  const signOutHandler = async () => {
    await signOutGmail();
    setUser(null);
    setAccessToken(null);
    setUnreadEmails([]);
  };

  return (
    <GmailContext.Provider
      value={{
        user,
        accessToken,
        unreadEmails,
        signIn,
        signOut: signOutHandler,
        getUnreadEmails,
      }}
    >
      {children}
    </GmailContext.Provider>
  );
};

export const useGmail = () => {
  const ctx = useContext(GmailContext);
  if (!ctx) throw new Error('useGmail must be used within GmailProvider');
  return ctx;
};
