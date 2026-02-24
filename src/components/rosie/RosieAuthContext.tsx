import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { BabyProfile } from './types';

// Rosie-specific user profile
export interface RosieUserProfile {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

// Extended baby profile from database
export interface RosieBabyProfile extends BabyProfile {
  id: string;
  user_id: string;
  created_at: string;
}

interface RosieAuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  profile: RosieUserProfile | null;
  babies: RosieBabyProfile[];
  currentBaby: RosieBabyProfile | null;
  loading: boolean;
  error: string | null;

  // Auth methods
  signUp: (email: string, password: string) => Promise<{ success: boolean; confirmationPending?: boolean; error?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; emailNotConfirmed?: boolean; error?: string }>;
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;

  // Profile methods
  createProfile: (name: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (name: string) => Promise<{ success: boolean; error?: string }>;
  addBaby: (baby: Omit<BabyProfile, 'id'>) => Promise<{ success: boolean; baby?: RosieBabyProfile; error?: string }>;
  updateBaby: (babyId: string, updates: Partial<BabyProfile>) => Promise<{ success: boolean; error?: string }>;
  setCurrentBaby: (babyId: string) => void;

  // Utility
  clearError: () => void;
}

const RosieAuthContext = createContext<RosieAuthContextType | undefined>(undefined);

// Timeout wrapper for fetch operations
const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
};

export const RosieAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<RosieUserProfile | null>(null);
  const [babies, setBabies] = useState<RosieBabyProfile[]>([]);
  const [currentBaby, setCurrentBabyState] = useState<RosieBabyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already loaded user data to prevent double-loading
  const dataLoadedForUser = useRef<string | null>(null);
  const isLoadingData = useRef(false);
  // Flag to suppress onAuthStateChange during sign-up (confirmation pending)
  const suppressAuthEvent = useRef(false);

  // Fetch user profile from rosie_profiles table
  const fetchProfile = useCallback(async (userId: string): Promise<RosieUserProfile | null> => {
    console.log('[RosieAuth] Fetching profile for:', userId);
    try {
      const { data, error: fetchError } = await supabase
        .from('rosie_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('[RosieAuth] Error fetching profile:', fetchError.message);
        return null;
      }

      console.log('[RosieAuth] Profile result:', data ? 'found' : 'not found');
      return data as RosieUserProfile | null;
    } catch (err) {
      console.error('[RosieAuth] Exception fetching profile:', err);
      return null;
    }
  }, []);

  // Fetch babies for user
  const fetchBabies = useCallback(async (userId: string): Promise<RosieBabyProfile[]> => {
    console.log('[RosieAuth] Fetching babies for:', userId);
    try {
      const { data, error: fetchError } = await supabase
        .from('rosie_babies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('[RosieAuth] Error fetching babies:', fetchError.message);
        return [];
      }

      console.log('[RosieAuth] Babies result:', data?.length || 0, 'found');
      // Map snake_case database columns to camelCase interface
      return (data || []).map(row => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        birthDate: row.birth_date,
        photoUrl: row.photo_url,
        birthWeight: row.birth_weight,
        weightUnit: row.weight_unit || 'oz',
        created_at: row.created_at,
      })) as RosieBabyProfile[];
    } catch (err) {
      console.error('[RosieAuth] Exception fetching babies:', err);
      return [];
    }
  }, []);

  // Load user data (profile + babies) with deduplication
  const loadUserData = useCallback(async (userId: string): Promise<void> => {
    // Skip if already loaded for this user or currently loading
    if (dataLoadedForUser.current === userId) {
      console.log('[RosieAuth] Data already loaded for user, skipping');
      return;
    }
    if (isLoadingData.current) {
      console.log('[RosieAuth] Already loading data, skipping');
      return;
    }

    isLoadingData.current = true;
    console.log('[RosieAuth] Loading user data for:', userId);

    try {
      // Fire off real fetches — they'll update state whenever they resolve
      const profilePromise = fetchProfile(userId).then(result => {
        if (result) {
          console.log('[RosieAuth] Profile fetched, updating state');
          setProfile(result);
        }
        return result;
      });

      const babiesPromise = fetchBabies(userId).then(result => {
        if (result.length > 0) {
          console.log('[RosieAuth] Babies fetched, updating state');
          setBabies(result);
          // Set current baby from localStorage or first baby
          const savedBabyId = localStorage.getItem('rosie_current_baby_id');
          const savedBaby = result.find(b => b.id === savedBabyId);
          setCurrentBabyState(savedBaby || result[0] || null);
        }
        return result;
      });

      // Wait up to 5s so we can stop showing the loading spinner,
      // but the .then() callbacks above will still fire after timeout
      await Promise.all([
        withTimeout(profilePromise, 5000, null),
        withTimeout(babiesPromise, 5000, [])
      ]);

      // Mark as loaded for this user
      dataLoadedForUser.current = userId;
    } catch (err) {
      console.error('[RosieAuth] Error loading user data:', err);
    } finally {
      isLoadingData.current = false;
    }
  }, [fetchProfile, fetchBabies]);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      console.log('[RosieAuth] Initializing auth...');

      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (currentSession?.user) {
          console.log('[RosieAuth] Found existing session for:', currentSession.user.id);
          setSession(currentSession);
          setUser(currentSession.user);
          await loadUserData(currentSession.user.id);
        } else {
          console.log('[RosieAuth] No existing session');
        }
      } catch (err) {
        console.error('[RosieAuth] Error in initAuth:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      console.log('[RosieAuth] Auth state changed:', event, 'suppressed:', suppressAuthEvent.current);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setBabies([]);
        setCurrentBabyState(null);
        dataLoadedForUser.current = null;
        suppressAuthEvent.current = false;
        setLoading(false);
        return;
      }

      // During sign-up with confirmation pending, ignore auth events —
      // we don't want to set user/session state which would cause
      // the RosieAuth useEffect to redirect to profile setup.
      if (suppressAuthEvent.current) {
        console.log('[RosieAuth] Suppressing auth event during sign-up');
        return;
      }

      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);

        // Only load data if it's a new sign in or we haven't loaded for this user yet
        if (event === 'SIGNED_IN' && dataLoadedForUser.current !== newSession.user.id) {
          await loadUserData(newSession.user.id);
        }
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  // Sign up with email and password
  // NOTE: This does NOT set loading state — the caller (RosieAuth) uses its own localLoading.
  // This prevents the auth useEffect from firing and redirecting before the caller
  // can show the confirmation screen.
  const signUp = async (email: string, password: string): Promise<{ success: boolean; confirmationPending?: boolean; error?: string }> => {
    try {
      setError(null);
      // Suppress onAuthStateChange from setting user during sign-up
      suppressAuthEvent.current = true;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      console.log('[RosieAuth] signUp response:', {
        hasUser: !!signUpData.user,
        hasSession: !!signUpData.session,
        identities: signUpData.user?.identities?.length,
        error: signUpError?.message,
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('An account with this email already exists. Try signing in instead.');
        }
        throw signUpError;
      }

      // Supabase returns a user with empty identities array when the email
      // already exists (to prevent email enumeration). Detect this case.
      if (signUpData.user && signUpData.user.identities?.length === 0) {
        throw new Error('An account with this email already exists. Try signing in instead.');
      }

      // Check if email confirmation is required
      // If session is null but user exists, confirmation email was sent
      const confirmationPending = !signUpData.session && !!signUpData.user;

      console.log('[RosieAuth] confirmationPending:', confirmationPending);

      // If confirmation is pending, do NOT set user state — we don't want
      // the auth useEffect to fire and redirect to profile setup.
      // The user hasn't confirmed their email yet.
      if (confirmationPending) {
        // Supabase may have fired onAuthStateChange, but without a session
        // the user isn't really authenticated. Clear any user state that
        // may have been set by the event listener.
        setUser(null);
        setSession(null);
        // Keep suppressAuthEvent true — will be cleared when component unmounts
        // or user signs in later
      } else {
        // Not pending — allow auth events normally
        suppressAuthEvent.current = false;
      }

      return { success: true, confirmationPending };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
      suppressAuthEvent.current = false;
      return { success: false, error: errorMessage };
    }
  };

  // Resend confirmation email
  const resendConfirmation = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (resendError) {
        throw resendError;
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend confirmation email';
      return { success: false, error: errorMessage };
    }
  };

  // Sign in with email and password
  // NOTE: This does NOT set context loading state — the caller (RosieAuth) uses its own localLoading.
  // Setting context loading causes RosieAI to unmount RosieAuth (replacing it with a spinner),
  // which destroys all component state (view, form fields, error messages).
  // On success, onAuthStateChange will handle loading/user state transitions.
  const signInWithPassword = async (email: string, password: string): Promise<{ success: boolean; emailNotConfirmed?: boolean; error?: string }> => {
    try {
      setError(null);
      // Reset data loaded flag so we fetch fresh data
      dataLoadedForUser.current = null;
      // Clear the sign-up suppression flag — this is a real sign-in
      suppressAuthEvent.current = false;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Check error.code (not error.message) — Supabase returns
        // 'email_not_confirmed' when the password is correct but
        // the user hasn't clicked the confirmation link yet.
        // It only reveals this when the password is correct (prevents enumeration).
        const errorCode = (signInError as { code?: string }).code;

        if (errorCode === 'email_not_confirmed') {
          return {
            success: false,
            emailNotConfirmed: true,
            error: 'Please check your email and click the confirmation link before signing in.',
          };
        }

        if (errorCode === 'invalid_credentials' || signInError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password.');
        }

        throw signInError;
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
    // Note: on success, loading is set to false by onAuthStateChange handler
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('rosie_current_baby_id');
      dataLoadedForUser.current = null;
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
      setLoading(false);
    }
    // Note: state is cleared by onAuthStateChange handler
  };

  // Create user profile (called after first sign in)
  const createProfile = async (name: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('rosie_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setProfile(data as RosieUserProfile);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update user profile (e.g., parent name)
  const updateProfile = async (name: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error: updateError } = await supabase
        .from('rosie_profiles')
        .update({ name })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev
        ? { ...prev, name }
        : { id: user.id, email: user.email || '', name, created_at: new Date().toISOString() }
      );
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      return { success: false, error: errorMessage };
    }
  };

  // Add a baby
  const addBaby = async (baby: Omit<BabyProfile, 'id'>): Promise<{ success: boolean; baby?: RosieBabyProfile; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('rosie_babies')
        .insert({
          user_id: user.id,
          name: baby.name,
          birth_date: baby.birthDate,
          photo_url: baby.photoUrl || null,
          birth_weight: baby.birthWeight || null,
          weight_unit: baby.weightUnit || 'oz',
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const newBaby: RosieBabyProfile = {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        birthDate: data.birth_date,
        photoUrl: data.photo_url,
        birthWeight: data.birth_weight,
        weightUnit: data.weight_unit || 'oz',
        created_at: data.created_at,
      };

      setBabies(prev => [...prev, newBaby]);

      // Set as current if it's the first baby
      if (babies.length === 0) {
        setCurrentBabyState(newBaby);
        localStorage.setItem('rosie_current_baby_id', newBaby.id);
      }

      return { success: true, baby: newBaby };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add baby';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update a baby
  const updateBaby = async (babyId: string, updates: Partial<BabyProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);

      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.birthDate !== undefined) updateData.birth_date = updates.birthDate;
      if (updates.photoUrl !== undefined) updateData.photo_url = updates.photoUrl;

      const { error: updateError } = await supabase
        .from('rosie_babies')
        .update(updateData)
        .eq('id', babyId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setBabies(prev => prev.map(b =>
        b.id === babyId
          ? { ...b, ...updates }
          : b
      ));

      // Update current baby if it's the one being updated
      if (currentBaby?.id === babyId) {
        setCurrentBabyState(prev => prev ? { ...prev, ...updates } : null);
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update baby';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Set current baby
  const setCurrentBaby = (babyId: string) => {
    const baby = babies.find(b => b.id === babyId);
    if (baby) {
      setCurrentBabyState(baby);
      localStorage.setItem('rosie_current_baby_id', babyId);
    }
  };

  // Clear error
  const clearError = () => setError(null);

  return (
    <RosieAuthContext.Provider
      value={{
        user,
        session,
        profile,
        babies,
        currentBaby,
        loading,
        error,
        signUp,
        signInWithPassword,
        resendConfirmation,
        signOut,
        createProfile,
        updateProfile,
        addBaby,
        updateBaby,
        setCurrentBaby,
        clearError,
      }}
    >
      {children}
    </RosieAuthContext.Provider>
  );
};

export const useRosieAuth = () => {
  const context = useContext(RosieAuthContext);
  if (context === undefined) {
    throw new Error('useRosieAuth must be used within a RosieAuthProvider');
  }
  return context;
};
