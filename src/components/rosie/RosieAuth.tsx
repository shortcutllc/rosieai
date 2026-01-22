import React, { useState } from 'react';
import { useRosieAuth } from './RosieAuthContext';
import './rosie.css';

type AuthView = 'welcome' | 'signin' | 'signup' | 'verify-email' | 'signup-name' | 'signup-baby';

interface RosieAuthProps {
  onComplete: () => void;
}

export const RosieAuth: React.FC<RosieAuthProps> = ({ onComplete }) => {
  const {
    user,
    profile,
    babies,
    loading,
    error,
    signUp,
    signInWithPassword,
    createProfile,
    addBaby,
    clearError,
  } = useRosieAuth();

  const [view, setView] = useState<AuthView>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [parentName, setParentName] = useState('');
  const [babyName, setBabyName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthWeightLbs, setBirthWeightLbs] = useState('');
  const [birthWeightOz, setBirthWeightOz] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // If user is signed in and has profile and babies, complete
  React.useEffect(() => {
    if (loading) return;

    console.log('[RosieAuth] Checking state - user:', !!user, 'profile:', !!profile, 'babies:', babies.length);

    if (user && profile && babies.length > 0) {
      console.log('[RosieAuth] User fully set up, completing auth');
      onComplete();
    } else if (user && !profile) {
      console.log('[RosieAuth] User needs to create profile');
      setView('signup-name');
    } else if (user && profile && babies.length === 0) {
      console.log('[RosieAuth] User needs to add baby');
      setView('signup-baby');
    }
  }, [user, profile, babies, loading, onComplete]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalLoading(true);

    const result = await signInWithPassword(email, password);

    if (!result.success) {
      setLocalError(result.error || 'Failed to sign in');
    }

    setLocalLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setLocalLoading(true);

    const result = await signUp(email, password);

    if (!result.success) {
      setLocalError(result.error || 'Failed to create account');
      setLocalLoading(false);
      return;
    }

    // Signup successful - show verification email screen
    // Email confirmation is required in Supabase, so user needs to verify first
    setLocalLoading(false);
    setView('verify-email');
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalLoading(true);

    const result = await createProfile(parentName);

    if (result.success) {
      setView('signup-baby');
    } else {
      setLocalError(result.error || 'Failed to create profile');
    }

    setLocalLoading(false);
  };

  const handleAddBaby = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalLoading(true);

    // Convert lbs + oz to total oz for storage
    const lbs = parseFloat(birthWeightLbs) || 0;
    const oz = parseFloat(birthWeightOz) || 0;
    const totalOz = (lbs * 16) + oz;

    const result = await addBaby({
      name: babyName,
      birthDate,
      birthWeight: totalOz > 0 ? totalOz : undefined,
      weightUnit: 'oz',
    });

    if (result.success) {
      onComplete();
    } else {
      setLocalError(result.error || 'Failed to add baby');
    }

    setLocalLoading(false);
  };

  const displayError = localError || error;

  // Welcome Screen
  if (view === 'welcome') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card">
          <div className="rosie-auth-logo">
            <img src="/rosie-icon.svg" alt="Rosie" className="rosie-auth-logo-img" />
          </div>
          <h1 className="rosie-auth-title">Rosie</h1>
          <p className="rosie-auth-tagline">
            Calm technology for chaotic moments
          </p>

          <div className="rosie-auth-features">
            <div className="rosie-auth-feature">
              <span className="rosie-auth-feature-icon">🌙</span>
              <span>Track feeds, sleep, and diapers</span>
            </div>
            <div className="rosie-auth-feature">
              <span className="rosie-auth-feature-icon">💭</span>
              <span>Get answers to your questions</span>
            </div>
            <div className="rosie-auth-feature">
              <span className="rosie-auth-feature-icon">🧠</span>
              <span>Understand developmental leaps</span>
            </div>
          </div>

          <div className="rosie-auth-actions">
            <button
              className="rosie-auth-btn rosie-auth-btn-primary"
              onClick={() => setView('signup')}
            >
              Create Account
            </button>
            <button
              className="rosie-auth-btn rosie-auth-btn-secondary"
              onClick={() => setView('signin')}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sign Up
  if (view === 'signup') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card">
          <button
            className="rosie-auth-back"
            onClick={() => { setView('welcome'); clearError(); setLocalError(null); }}
          >
            ← Back
          </button>

          <h1 className="rosie-auth-title">Create Account</h1>
          <p className="rosie-auth-subtitle">
            Join Rosie to start tracking
          </p>

          {displayError && (
            <div className="rosie-auth-error">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSignUp} className="rosie-auth-form">
            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rosie-auth-input"
                required
                autoFocus
              />
            </div>

            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="rosie-auth-input"
                required
                minLength={6}
              />
            </div>

            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="rosie-auth-input"
                required
              />
            </div>

            <button
              type="submit"
              className="rosie-auth-btn rosie-auth-btn-primary"
              disabled={localLoading || loading || !email || !password || !confirmPassword}
            >
              {localLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="rosie-auth-switch">
            Already have an account?{' '}
            <button
              className="rosie-auth-link"
              onClick={() => { setView('signin'); clearError(); setLocalError(null); }}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Email Verification Sent
  if (view === 'verify-email') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card">
          <div className="rosie-auth-success-icon">✉️</div>
          <h1 className="rosie-auth-title">Check your email</h1>
          <p className="rosie-auth-subtitle">
            We've sent a verification link to
          </p>
          <p className="rosie-auth-email-display">{email}</p>
          <p className="rosie-auth-instructions">
            Click the link in the email to verify your account, then come back here to sign in.
          </p>

          <button
            className="rosie-auth-btn rosie-auth-btn-primary"
            onClick={() => { setView('signin'); setLocalError(null); }}
          >
            Go to Sign In
          </button>

          <p className="rosie-auth-hint">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              className="rosie-auth-link"
              onClick={() => { setView('signup'); setLocalError(null); }}
            >
              try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Sign In with Email/Password
  if (view === 'signin') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card">
          <button
            className="rosie-auth-back"
            onClick={() => { setView('welcome'); clearError(); setLocalError(null); }}
          >
            ← Back
          </button>

          <h1 className="rosie-auth-title">Welcome back</h1>
          <p className="rosie-auth-subtitle">
            Sign in to your account
          </p>

          {displayError && (
            <div className="rosie-auth-error">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSignIn} className="rosie-auth-form">
            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rosie-auth-input"
                required
                autoFocus
              />
            </div>

            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="rosie-auth-input"
                required
              />
            </div>

            <button
              type="submit"
              className="rosie-auth-btn rosie-auth-btn-primary"
              disabled={localLoading || loading || !email || !password}
            >
              {localLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="rosie-auth-switch">
            Don't have an account?{' '}
            <button
              className="rosie-auth-link"
              onClick={() => { setView('signup'); clearError(); setLocalError(null); }}
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Signup Step 1: Parent Name
  if (view === 'signup-name') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card">
          <div className="rosie-auth-progress">
            <div className="rosie-auth-progress-step active">1</div>
            <div className="rosie-auth-progress-line"></div>
            <div className="rosie-auth-progress-step">2</div>
          </div>

          <h1 className="rosie-auth-title">What should we call you?</h1>
          <p className="rosie-auth-subtitle">
            This is how Rosie will greet you
          </p>

          {displayError && (
            <div className="rosie-auth-error">
              {displayError}
            </div>
          )}

          <form onSubmit={handleCreateProfile} className="rosie-auth-form">
            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Your name</label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g., Sarah, Mom, Mama"
                className="rosie-auth-input"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="rosie-auth-btn rosie-auth-btn-primary"
              disabled={localLoading || !parentName.trim()}
            >
              {localLoading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Signup Step 2: Add Baby
  if (view === 'signup-baby') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card">
          <div className="rosie-auth-progress">
            <div className="rosie-auth-progress-step completed">✓</div>
            <div className="rosie-auth-progress-line active"></div>
            <div className="rosie-auth-progress-step active">2</div>
          </div>

          <h1 className="rosie-auth-title">Tell us about your little one</h1>
          <p className="rosie-auth-subtitle">
            We'll personalize everything for their age
          </p>

          {displayError && (
            <div className="rosie-auth-error">
              {displayError}
            </div>
          )}

          <form onSubmit={handleAddBaby} className="rosie-auth-form">
            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Baby's name</label>
              <input
                type="text"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                placeholder="e.g., Emma"
                className="rosie-auth-input"
                required
                autoFocus
              />
            </div>

            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Date of birth</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="rosie-auth-input"
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Birth weight (optional)</label>
              <div className="rosie-auth-weight-inputs">
                <div className="rosie-auth-weight-field">
                  <input
                    type="number"
                    value={birthWeightLbs}
                    onChange={(e) => setBirthWeightLbs(e.target.value)}
                    className="rosie-auth-input rosie-auth-input-small"
                    placeholder="0"
                    min="0"
                    max="20"
                  />
                  <span className="rosie-auth-weight-unit">lbs</span>
                </div>
                <div className="rosie-auth-weight-field">
                  <input
                    type="number"
                    value={birthWeightOz}
                    onChange={(e) => setBirthWeightOz(e.target.value)}
                    className="rosie-auth-input rosie-auth-input-small"
                    placeholder="0"
                    min="0"
                    max="15"
                  />
                  <span className="rosie-auth-weight-unit">oz</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="rosie-auth-btn rosie-auth-btn-primary"
              disabled={localLoading || !babyName.trim() || !birthDate}
            >
              {localLoading ? 'Setting up...' : 'Start Using Rosie'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
};

export default RosieAuth;
