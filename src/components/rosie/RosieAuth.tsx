import React, { useState } from 'react';
import { useRosieAuth } from './RosieAuthContext';
import './rosie.css';

type AuthView = 'welcome' | 'signin' | 'signup-name' | 'signup-baby';

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
    signInWithPassword,
    createProfile,
    addBaby,
    clearError,
  } = useRosieAuth();

  const [view, setView] = useState<AuthView>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [parentName, setParentName] = useState('');
  const [babyName, setBabyName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // If user is signed in and has profile and babies, complete
  // Wait for loading to complete before making decisions
  React.useEffect(() => {
    if (loading) return; // Don't make decisions while still loading

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

    const result = await addBaby({
      name: babyName,
      birthDate,
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
            <span className="rosie-auth-logo-icon">🌸</span>
            <h1 className="rosie-auth-logo-text">Rosie</h1>
          </div>

          <p className="rosie-auth-tagline">
            Calm technology for chaotic moments
          </p>

          <p className="rosie-auth-description">
            Track feeds, sleep, and diapers. Get personalized developmental insights.
            All with the support of expert-backed guidance.
          </p>

          {/* Sign In Section */}
          <div className="rosie-auth-section">
            <button
              className="rosie-auth-btn rosie-auth-btn-primary"
              onClick={() => setView('signin')}
            >
              Sign In
            </button>
          </div>

          <p className="rosie-auth-footer">
            Use the same login as your Shortcut Proposals account
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

          <h1 className="rosie-auth-title">Sign in</h1>
          <p className="rosie-auth-subtitle">
            Use your Shortcut Proposals account
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
