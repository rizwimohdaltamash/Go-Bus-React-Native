import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { auth, db } from '@/src/firebase/firebase';

export type UserRole = 'user' | 'busAdmin';

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

type SignupInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const usersCollection = 'users';

async function readProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, usersCollection, uid));
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
}

async function writeProfile(profile: UserProfile) {
  await setDoc(doc(db, usersCollection, profile.uid), profile, { merge: true });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const existingProfile = await readProfile(nextUser.uid);

        if (existingProfile) {
          setProfile(existingProfile);
        } else {
          const fallbackProfile: UserProfile = {
            uid: nextUser.uid,
            name: nextUser.displayName ?? 'GoBus User',
            email: nextUser.email ?? '',
            role: 'user',
            createdAt: new Date().toISOString(),
          };

          await writeProfile(fallbackProfile);
          setProfile(fallbackProfile);
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUp = useCallback(async ({ name, email, password, role }: SignupInput) => {
    const createdUser = await createUserWithEmailAndPassword(auth, email.trim(), password);

    const newProfile: UserProfile = {
      uid: createdUser.user.uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      createdAt: new Date().toISOString(),
    };

    await writeProfile(newProfile);
    setProfile(newProfile);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signUp,
      logout,
    }),
    [loading, logout, profile, signIn, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
