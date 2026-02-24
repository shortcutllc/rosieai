import React, { useState, useMemo } from 'react';
import { useRosieAuth } from './RosieAuthContext';
import './rosie.css';

type AuthView = 'welcome' | 'signin' | 'signup' | 'confirm-email' | 'signup-name' | 'signup-baby-name' | 'signup-baby-birthday' | 'celebration';

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
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [parentName, setParentName] = useState('');
  const [babyName, setBabyName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Navigate between auth views with slide animation
  const navigateTo = (newView: AuthView, direction: 'left' | 'right' = 'left') => {
    setSlideDirection(direction);
    setView(newView);
    clearError();
    setLocalError(null);
  };

  const slideClass = slideDirection === 'left' ? 'slide-left' : slideDirection === 'right' ? 'slide-right' : '';

  // Real-time password validation
  const passwordTouched = password.length > 0;
  const confirmTouched = confirmPassword.length > 0;

  const passwordValidation = useMemo(() => ({
    hasMinLength: password.length >= 6,
    passwordsMatch: password === confirmPassword && confirmPassword.length > 0,
  }), [password, confirmPassword]);

  const isPasswordValid = passwordValidation.hasMinLength;
  const isFormValid = email.trim() && isPasswordValid && passwordValidation.passwordsMatch;

  // If user is signed in and has profile and babies, complete (or show celebration)
  React.useEffect(() => {
    if (loading) return;
    // Don't override these screens — user is in a specific flow
    if (view === 'confirm-email' || view === 'celebration') return;
    // Don't override profile/baby setup screens — user is actively filling in data
    if (view === 'signup-name' && !profile) return;
    if ((view === 'signup-baby-name' || view === 'signup-baby-birthday') && babies.length === 0) return;

    if (user && profile && babies.length > 0) {
      onComplete();
    } else if (user && !profile) {
      navigateTo('signup-name', 'left');
    } else if (user && profile && babies.length === 0) {
      navigateTo('signup-baby-name', 'left');
    }
  }, [user, profile, babies, loading, onComplete, view]);

  // Compute baby's age for celebration screen
  const babyAgeWeeks = React.useMemo(() => {
    if (!birthDate) return null;
    const birth = new Date(birthDate + 'T12:00:00');
    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  }, [birthDate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalLoading(true);

    const result = await signInWithPassword(email, password);

    if (!result.success) {
      if (result.emailNotConfirmed) {
        navigateTo('confirm-email', 'left');
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
      navigateTo('confirm-email', 'left');
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
      navigateTo('signup-baby-name', 'left');
    } else {
      setLocalError(result.error || 'Failed to create profile');
    }

    setLocalLoading(false);
  };

  const handleAddBaby = async () => {
    setLocalError(null);
    setLocalLoading(true);

    const result = await addBaby({
      name: babyName,
      birthDate,
    });

    if (result.success) {
      navigateTo('celebration', 'left');
    } else {
      setLocalError(result.error || 'Failed to add baby');
    }

    setLocalLoading(false);
  };

  const displayError = localError || error;

  // Progress bar helper: 4 segments
  // Step 1: Account (signup) | Step 2: Parent name | Step 3: Baby name + birthday | Step 4: Celebration
  const renderProgress = (currentStep: number) => {
    const segments = [1, 2, 3, 4];
    return (
      <div className="ob-progress">
        {segments.map(s => (
          <div
            key={s}
            className={`ob-progress-seg ${s < currentStep ? 'done' : s === currentStep ? 'active' : ''}`}
          />
        ))}
      </div>
    );
  };

  // ═══════════════════════════════════════
  // WELCOME SCREEN
  // ═══════════════════════════════════════
  if (view === 'welcome') {
    return (
      <div className="ob-container">
        <div className={`ob-card ${slideClass}`}>
          <div className="ob-screen">
            <div className="ob-spacer" />

            <div className="ob-logo">🌱</div>
            <h1 className="ob-hero-title">
              Your calm companion<br />for the first year
            </h1>
            <p className="ob-hero-subtitle">
              Track, learn, and breathe — Rosie is<br />here for you and your baby.
            </p>

            <div className="ob-values">
              <div className="ob-value">
                <div className="ob-value-icon orange">🍼</div>
                <div className="ob-value-text">
                  <h4>Track without stress</h4>
                  <p>Quick logging for feeds, sleep, and diapers. No perfectionism required.</p>
                </div>
              </div>
              <div className="ob-value">
                <div className="ob-value-icon purple">🧠</div>
                <div className="ob-value-text">
                  <h4>Understand every leap</h4>
                  <p>Know why your baby is fussy and when the sunny days return.</p>
                </div>
              </div>
              <div className="ob-value">
                <div className="ob-value-icon green">💚</div>
                <div className="ob-value-text">
                  <h4>Support for you too</h4>
                  <p>You're not just a caregiver. Rosie checks in on how you're doing.</p>
                </div>
              </div>
            </div>

            <div className="ob-spacer" />

            <div className="ob-actions">
              <button
                className="ob-btn ob-btn-primary"
                onClick={() => navigateTo('signup', 'left')}
              >
                Get Started
              </button>
              <button
                className="ob-btn ob-btn-secondary"
                onClick={() => navigateTo('signin', 'left')}
              >
                I already have an account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // SIGN UP
  // ═══════════════════════════════════════
  if (view === 'signup') {
    return (
      <div className="ob-container">
        <div className={`ob-card ${slideClass}`}>
          {renderProgress(1)}
          <div className="ob-screen">
            <button className="ob-back" onClick={() => navigateTo('welcome', 'right')}>
              ← Back
            </button>
            <div className="ob-spacer-lg" />

            <h1 className="ob-question">Create your account</h1>
            <p className="ob-question-sub">Quick setup — takes less than a minute.</p>

            {displayError && (
              <div className="ob-error">{displayError}</div>
            )}

            <form onSubmit={handleSignUp}>
              <div className="ob-field">
                <label className="ob-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="ob-input"
                  required
                  autoFocus
                />
              </div>

              <div className="ob-field">
                <label className="ob-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="ob-input"
                  required
                />
                {passwordTouched && (
                  <div className={`ob-password-hint ${passwordValidation.hasMinLength ? 'valid' : 'invalid'}`}>
                    {passwordValidation.hasMinLength ? '✓' : '○'} 6+ characters
                  </div>
                )}
              </div>

              <div className="ob-field">
                <label className="ob-label">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="ob-input"
                  required
                />
                {confirmTouched && (
                  <div className={`ob-password-hint ${passwordValidation.passwordsMatch ? 'valid' : 'invalid'}`}>
                    {passwordValidation.passwordsMatch ? '✓' : '○'} Passwords match
                  </div>
                )}
              </div>

              <div className="ob-spacer" />
              <div className="ob-actions">
                <button
                  type="submit"
                  className="ob-btn ob-btn-primary"
                  disabled={localLoading || loading || !isFormValid}
                >
                  {localLoading ? 'Creating account...' : 'Continue'}
                </button>
                <button
                  type="button"
                  className="ob-link"
                  onClick={() => navigateTo('signin', 'left')}
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // EMAIL CONFIRMATION
  // ═══════════════════════════════════════
  if (view === 'confirm-email') {
    return (
      <div className="ob-container">
        <div className={`ob-card ${slideClass}`}>
          <div className="ob-screen">
            <div className="ob-spacer" />

            <div className="ob-success">
              <div className="ob-success-emoji">✉️</div>
              <h1 className="ob-success-title">Check your email</h1>
              <p className="ob-success-subtitle">
                We sent a confirmation link to
              </p>
              <p className="ob-confirm-email">{email}</p>
              <p className="ob-confirm-instruction">
                Click the link in the email to activate your account, then come back here to sign in.
              </p>

              {resendMessage && (
                <div className={`ob-confirm-message ${resendMessage.includes('resent') ? 'success' : 'error'}`}>
                  {resendMessage}
                </div>
              )}
            </div>

            <div className="ob-spacer" />

            <div className="ob-actions">
              <button
                className="ob-btn ob-btn-secondary"
                onClick={handleResendConfirmation}
                disabled={resendCooldown}
              >
                {resendCooldown ? 'Email sent' : "Didn't get the email? Resend"}
              </button>

              <button
                className="ob-btn ob-btn-primary"
                onClick={() => {
                  navigateTo('signin', 'left');
                  setPassword('');
                  setConfirmPassword('');
                }}
              >
                Go to Sign In
              </button>
            </div>

            <p className="ob-confirm-hint">
              Check your spam folder if you don't see the email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // SIGN IN
  // ═══════════════════════════════════════
  if (view === 'signin') {
    return (
      <div className="ob-container">
        <div className={`ob-card ${slideClass}`}>
          <div className="ob-screen">
            <button className="ob-back" onClick={() => navigateTo('welcome', 'right')}>
              ← Back
            </button>
            <div className="ob-spacer-lg" />

            <h1 className="ob-question">Welcome back</h1>
            <p className="ob-question-sub">Sign in to your account.</p>

            {displayError && (
              <div className="ob-error">{displayError}</div>
            )}

            <form onSubmit={handleSignIn}>
              <div className="ob-field">
                <label className="ob-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="ob-input"
                  required
                  autoFocus
                />
              </div>

              <div className="ob-field">
                <label className="ob-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="ob-input"
                  required
                />
              </div>

              <div className="ob-spacer" />
              <div className="ob-actions">
                <button
                  type="submit"
                  className="ob-btn ob-btn-primary"
                  disabled={localLoading || loading || !email || !password}
                >
                  {localLoading ? 'Signing in...' : 'Sign In'}
                </button>
                <button
                  type="button"
                  className="ob-link"
                  onClick={() => navigateTo('signup', 'left')}
                >
                  Don't have an account? Create one
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // SIGNUP STEP: PARENT NAME
  // ═══════════════════════════════════════
  if (view === 'signup-name') {
    return (
      <div className="ob-container">
        <div className={`ob-card ${slideClass}`}>
          {renderProgress(2)}
          <div className="ob-screen">
            <div className="ob-spacer-lg" />

            <h1 className="ob-question">What should we call you?</h1>
            <p className="ob-question-sub">This is how Rosie will greet you.</p>

            {displayError && (
              <div className="ob-error">{displayError}</div>
            )}

            <form onSubmit={handleCreateProfile}>
              <div className="ob-field">
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="e.g., Sarah, Mom, Mama"
                  className="ob-input ob-input-large"
                  required
                  autoFocus
                />
              </div>

              <div className="ob-spacer" />
              <div className="ob-actions">
                <button
                  type="submit"
                  className="ob-btn ob-btn-primary"
                  disabled={localLoading || !parentName.trim()}
                >
                  {localLoading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>

            <p className="ob-switch-text">
              Wrong account?{' '}
              <button className="ob-link-inline" onClick={signOut}>
                Sign out
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // SIGNUP STEP: BABY'S NAME
  // ═══════════════════════════════════════
  if (view === 'signup-baby-name') {
    return (
      <div className="ob-container">
        <div className={`ob-card ${slideClass}`}>
          {renderProgress(3)}
          <div className="ob-screen">
            <div className="ob-spacer-lg" />

            <h1 className="ob-question">What's your baby's name?</h1>
            <p className="ob-question-sub">We'll use this to personalize everything.</p>

            {displayError && (
              <div className="ob-error">{displayError}</div>
            )}

            <div className="ob-field">
              <input
                type="text"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                placeholder="Enter baby's name"
                className="ob-input ob-input-large"
                autoFocus
              />
            </div>

            <div className="ob-spacer" />
            <div className="ob-actions">
              <button
                className="ob-btn ob-btn-primary"
                onClick={() => {
                  if (babyName.trim()) {
                    navigateTo('signup-baby-birthday', 'left');
                  }
                }}
                disabled={!babyName.trim()}
              >
                Continue
              </button>
            </div>

            <p className="ob-switch-text">
              Wrong account?{' '}
              <button className="ob-link-inline" onClick={signOut}>
                Sign out
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // SIGNUP STEP: BABY'S BIRTHDAY
  // ═══════════════════════════════════════
  if (view === 'signup-baby-birthday') {
    return (
      <div className="ob-container">
        <div className={`ob-card ${slideClass}`}>
          {renderProgress(3)}
          <div className="ob-screen">
            <button className="ob-back" onClick={() => navigateTo('signup-baby-name', 'right')}>
              ← Back
            </button>
            <div className="ob-spacer-lg" />

            <h1 className="ob-question">When was {babyName} born?</h1>
            <p className="ob-question-sub">This helps us track milestones and developmental leaps accurately.</p>

            {displayError && (
              <div className="ob-error">{displayError}</div>
            )}

            <div className="ob-field">
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="ob-input"
                max={new Date().toISOString().split('T')[0]}
                required
                autoFocus
              />
            </div>

            <div className="ob-spacer" />
            <div className="ob-actions">
              <button
                className="ob-btn ob-btn-primary"
                onClick={() => {
                  if (birthDate) {
                    handleAddBaby();
                  }
                }}
                disabled={localLoading || !birthDate}
              >
                {localLoading ? 'Setting up...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // CELEBRATION SCREEN
  // ═══════════════════════════════════════
  if (view === 'celebration') {
    const weekText = babyAgeWeeks !== null ? `Week ${babyAgeWeeks + 1}` : '';
    return (
      <div className="ob-container">
        <div className={`ob-card ${slideClass}`}>
          {renderProgress(4)}
          <div className="ob-screen">
            <div className="ob-spacer" />

            <div className="ob-success">
              <div className="ob-success-emoji">🎉</div>
              <h1 className="ob-success-title">You're all set!</h1>
              <p className="ob-success-subtitle">
                Rosie is ready to help you and {babyName} through the first year.
              </p>

              <div className="ob-success-card">
                <h4>What you can do</h4>
                <div className="ob-success-item">
                  <div className="ob-success-check">✓</div>
                  <span>Log feeds, sleep, and diapers with one tap</span>
                </div>
                <div className="ob-success-item">
                  <div className="ob-success-check">✓</div>
                  <span>{weekText ? `See what's normal at ${weekText}` : "See what's normal for your baby's age"}</span>
                </div>
                <div className="ob-success-item">
                  <div className="ob-success-check">✓</div>
                  <span>Ask Rosie anything — she's always here</span>
                </div>
              </div>
            </div>

            <div className="ob-spacer" />
            <div className="ob-actions">
              <button
                className="ob-btn ob-btn-primary"
                onClick={onComplete}
              >
                Start Using Rosie
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default RosieAuth;
