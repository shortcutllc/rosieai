import React, { useState, useMemo } from 'react';
import { useRosieAuth } from './RosieAuthContext';
import './rosie.css';

type AuthView = 'welcome' | 'signin' | 'signup' | 'confirm-email' | 'signup-name' | 'signup-baby';

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
    resendConfirmation,
    signOut,
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
  const [resendCooldown, setResendCooldown] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Real-time password validation
  const passwordTouched = password.length > 0;
  const confirmTouched = confirmPassword.length > 0;

  const passwordValidation = useMemo(() => ({
    hasMinLength: password.length >= 6,
    hasUpperCase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    passwordsMatch: password === confirmPassword && confirmPassword.length > 0,
  }), [password, confirmPassword]);

  const isPasswordValid = passwordValidation.hasMinLength;
  const isFormValid = email.trim() && isPasswordValid && passwordValidation.passwordsMatch;

  // If user is signed in and has profile and babies, complete
  React.useEffect(() => {
    if (loading) return;
    // Don't override the confirm-email screen — user hasn't verified yet
    if (view === 'confirm-email') return;

    if (user && profile && babies.length > 0) {
      onComplete();
    } else if (user && !profile) {
      setView('signup-name');
    } else if (user && profile && babies.length === 0) {
      setView('signup-baby');
    }
  }, [user, profile, babies, loading, onComplete, view]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalLoading(true);

    const result = await signInWithPassword(email, password);

    if (!result.success) {
      if (result.emailNotConfirmed) {
        // User hasn't confirmed their email yet — show the confirmation screen
        setView('confirm-email');
      } else {
        setLocalError(result.error || 'Failed to sign in');
      }
    }

    setLocalLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!passwordValidation.hasMinLength) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (!passwordValidation.passwordsMatch) {
      setLocalError('Passwords do not match');
      return;
    }

    setLocalLoading(true);

    const result = await signUp(email, password);

    if (!result.success) {
      setLocalError(result.error || 'Failed to create account');
      setLocalLoading(false);
    } else {
      // Sign-up succeeded — show "check your email" screen BEFORE clearing loading.
      // This order matters: setting the view first ensures the useEffect guard
      // (which checks view === 'confirm-email') is already in place.
      setView('confirm-email');
      setLocalLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (resendCooldown) return;

    setResendMessage(null);
    const result = await resendConfirmation(email);

    if (result.success) {
      setResendMessage('Confirmation email resent!');
      setResendCooldown(true);
      // 60-second cooldown before allowing another resend
      setTimeout(() => {
        setResendCooldown(false);
        setResendMessage(null);
      }, 60000);
    } else {
      setResendMessage(result.error || 'Failed to resend. Please try again.');
    }
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
                className={`rosie-auth-input ${passwordTouched ? (isPasswordValid ? 'valid' : 'invalid') : ''}`}
                required
              />
              {passwordTouched && (
                <div className="rosie-auth-validation">
                  <div className={`rosie-auth-validation-item ${passwordValidation.hasMinLength ? 'valid' : 'invalid'}`}>
                    <span className="rosie-auth-validation-icon">
                      {passwordValidation.hasMinLength ? '✓' : '✗'}
                    </span>
                    At least 6 characters
                  </div>
                </div>
              )}
            </div>

            <div className="rosie-auth-field">
              <label className="rosie-auth-label">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className={`rosie-auth-input ${confirmTouched ? (passwordValidation.passwordsMatch ? 'valid' : 'invalid') : ''}`}
                required
              />
              {confirmTouched && (
                <div className="rosie-auth-validation">
                  <div className={`rosie-auth-validation-item ${passwordValidation.passwordsMatch ? 'valid' : 'invalid'}`}>
                    <span className="rosie-auth-validation-icon">
                      {passwordValidation.passwordsMatch ? '✓' : '✗'}
                    </span>
                    Passwords match
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="rosie-auth-btn rosie-auth-btn-primary"
              disabled={localLoading || loading || !isFormValid}
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

  // Email Confirmation Screen
  if (view === 'confirm-email') {
    return (
      <div className="rosie-auth-container">
        <div className="rosie-auth-card">
          <div className="rosie-auth-confirm">
            <div className="rosie-auth-confirm-icon">✉️</div>
            <h1 className="rosie-auth-title">Check your email</h1>
            <p className="rosie-auth-confirm-text">
              We sent a confirmation link to
            </p>
            <p className="rosie-auth-confirm-email">{email}</p>
            <p className="rosie-auth-confirm-instruction">
              Click the link in the email to activate your account, then come back here to sign in.
            </p>

            {resendMessage && (
              <div className={`rosie-auth-confirm-message ${resendMessage.includes('resent') ? 'success' : 'error'}`}>
                {resendMessage}
              </div>
            )}

            <div className="rosie-auth-confirm-actions">
              <button
                className="rosie-auth-btn rosie-auth-btn-secondary"
                onClick={handleResendConfirmation}
                disabled={resendCooldown}
              >
                {resendCooldown ? 'Email sent' : "Didn't get the email? Resend"}
              </button>

              <button
                className="rosie-auth-btn rosie-auth-btn-primary"
                onClick={() => {
                  setView('signin');
                  setPassword('');
                  setConfirmPassword('');
                  clearError();
                  setLocalError(null);
                }}
              >
                Go to Sign In
              </button>
            </div>

            <p className="rosie-auth-confirm-hint">
              Check your spam folder if you don't see the email.
            </p>
          </div>
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

          <p className="rosie-auth-switch">
            Wrong account?{' '}
            <button className="rosie-auth-link" onClick={signOut}>
              Sign out
            </button>
          </p>
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

          <p className="rosie-auth-switch">
            Wrong account?{' '}
            <button className="rosie-auth-link" onClick={signOut}>
              Sign out
            </button>
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default RosieAuth;
