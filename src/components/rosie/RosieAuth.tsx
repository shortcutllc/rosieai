import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRosieAuth } from './RosieAuthContext';
import { calculateAge } from './contextEngine';
import './rosie.css';

type AuthView = 'welcome' | 'signin' | 'signup' | 'confirm-email' | 'signup-name' | 'signup-baby-name' | 'signup-baby-birthday' | 'signup-early' | 'celebration';

interface RosieAuthProps {
  onComplete: () => void;
}

// ═══════════════════════════════════════
// Typewriter Hook
// ═══════════════════════════════════════
function useTypewriter(text: string, speed = 40): { displayText: string; isComplete: boolean } {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    // Reset when text changes
    setDisplayText('');
    setIsComplete(false);

    if (prefersReducedMotion || !text) {
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeNext = () => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;

        // Punctuation pauses
        const char = text[index - 1];
        let delay = speed;
        if (char === ',') delay = 150;
        else if (char === '.') delay = 300;
        else if (char === '—' || char === '-') delay = 200;

        timeoutId = setTimeout(typeNext, delay);
      } else {
        setIsComplete(true);
      }
    };

    timeoutId = setTimeout(typeNext, speed);

    return () => clearTimeout(timeoutId);
  }, [text, speed, prefersReducedMotion]);

  return { displayText, isComplete };
}

// ═══════════════════════════════════════
// Confetti Component
// ═══════════════════════════════════════
const CONFETTI_COLORS = ['#8B5CF6', '#B57BEC', '#FFD700', '#FFC107', '#A78BFA', '#F5D060'];

function Confetti() {
  const particles = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.2}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 6,
    }));
  }, []);

  return (
    <div className="ob-confetti">
      {particles.map(p => (
        <span
          key={p.id}
          style={{
            left: p.left,
            animationDelay: p.delay,
            background: p.color,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
// Rosie Quote Generator
// ═══════════════════════════════════════
function getRosieQuote(babyName: string, ageMonths: number): string {
  if (ageMonths < 2) {
    return `Right now, ${babyName} is taking in the whole world — your voice, your face, your heartbeat. I'll help you know what to expect and when to just breathe.`;
  } else if (ageMonths < 4) {
    return `At ${ageMonths} months, ${babyName} is starting to smile, coo, and discover those tiny hands. I'll help you spot every little milestone.`;
  } else if (ageMonths < 6) {
    return `At ${ageMonths} months, ${babyName} is probably reaching for everything and getting ready to roll. I can't wait to help you with all of it.`;
  } else if (ageMonths < 9) {
    return `At ${ageMonths} months, ${babyName} is probably sitting up, reaching for everything, and ready for solid foods. I can't wait to help you with all of it.`;
  } else {
    return `At ${ageMonths} months, ${babyName} is on the move — crawling, babbling, and showing so much personality. Let's make the most of this amazing stage.`;
  }
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
  const [dueDate, setDueDate] = useState('');
  const [wasEarly, setWasEarly] = useState<boolean | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [animationStep, setAnimationStep] = useState(0);

  // Navigate between auth views with slide animation
  const navigateTo = useCallback((newView: AuthView, direction: 'left' | 'right' = 'left') => {
    setSlideDirection(direction);
    setView(newView);
    clearError();
    setLocalError(null);
    setAnimationStep(0); // Reset animation sequence
  }, [clearError]);

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

  // If user is signed in and has profile and babies, complete
  useEffect(() => {
    if (loading) return;
    if (view === 'confirm-email' || view === 'celebration') return;
    if (view === 'signup-name') return;
    if (view === 'signup-baby-name' || view === 'signup-baby-birthday' || view === 'signup-early') return;

    if (user && profile && babies.length > 0) {
      onComplete();
    } else if (user && !profile) {
      navigateTo('signup-name', 'left');
    } else if (user && profile && babies.length === 0) {
      navigateTo('signup-baby-name', 'left');
    }
  }, [user, profile, babies, loading, onComplete, view, navigateTo]);

  // Animation orchestration: stagger reveals per screen
  useEffect(() => {
    setAnimationStep(0);

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Step 0 happens immediately (emoji entrance)
    // Step 1: title typewriter starts (200ms delay)
    timers.push(setTimeout(() => setAnimationStep(1), 200));
    // Steps 2-5 are driven by typewriter completion and additional delays
    // We set them on timers as fallbacks, but typewriter onComplete can advance too

    return () => timers.forEach(clearTimeout);
  }, [view]);

  // Compute baby's age info for celebration screen and birthday feedback
  const ageInfo = useMemo(() => {
    if (!birthDate) return null;
    return calculateAge(birthDate, wasEarly && dueDate ? dueDate : undefined);
  }, [birthDate, dueDate, wasEarly]);

  // Typewriter texts per screen
  const typewriterTexts: Record<string, string> = {
    'welcome': "Hey there, I'm RosieAI.",
    'signup-name': 'First things first — what should I call you?',
    'signup-baby-name': 'And the star of the show?',
    'signup-baby-birthday': `When did ${babyName || 'your baby'} make her grand entrance?`,
    'signup-early': `One more thing — was ${babyName || 'your baby'} early?`,
    'celebration': `You're all set, ${parentName || 'friend'}!`,
  };

  const currentTypewriterText = typewriterTexts[view] || '';
  const { displayText: typedTitle, isComplete: titleComplete } = useTypewriter(
    animationStep >= 1 ? currentTypewriterText : '',
    40
  );

  // Advance animation steps after typewriter completes
  useEffect(() => {
    if (!titleComplete || animationStep < 1) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    if (animationStep < 2) {
      timers.push(setTimeout(() => setAnimationStep(2), 100)); // subtitle
    }
    if (animationStep < 3) {
      timers.push(setTimeout(() => setAnimationStep(3), 250)); // input
    }
    if (animationStep < 4) {
      timers.push(setTimeout(() => setAnimationStep(4), 400)); // button
    }

    return () => timers.forEach(clearTimeout);
  }, [titleComplete, animationStep]);

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

    const babyData: { name: string; birthDate: string; dueDate?: string } = {
      name: babyName,
      birthDate,
    };

    // Only include due date if baby was early and date was provided
    if (wasEarly && dueDate) {
      babyData.dueDate = dueDate;
    }

    const result = await addBaby(babyData);

    if (result.success) {
      navigateTo('celebration', 'left');
    } else {
      setLocalError(result.error || 'Failed to add baby');
    }

    setLocalLoading(false);
  };

  const displayError = localError || error;

  // ═══════════════════════════════════════
  // Progress Segments (horizontal bar style per wireframe)
  // ═══════════════════════════════════════
  const renderProgress = (currentStep: number, totalSteps = 4) => {
    const segs = Array.from({ length: totalSteps }, (_, i) => i + 1);
    return (
      <div className="ob-progress">
        {segs.map(s => (
          <div
            key={s}
            className={`ob-progress-seg ${s < currentStep ? 'done' : ''} ${s === currentStep ? 'active' : ''}`}
          />
        ))}
      </div>
    );
  };

  // Reveal helper: returns className for staggered animation
  const reveal = (step: number, spring = false) =>
    `ob-reveal ${animationStep >= step ? 'visible' : ''} ${spring ? 'spring' : ''}`;

  // ═══════════════════════════════════════
  // WELCOME SCREEN
  // ═══════════════════════════════════════
  if (view === 'welcome') {
    return (
      <div className="ob-container">
        <div className={`ob-card ${slideClass}`}>
          <div className="ob-screen">
            <div className="ob-spacer" />

            <div className="ob-emoji-anim heart">💜</div>

            <h1 className="ob-hero-title">
              {typedTitle}
              <span className={`ob-typewriter-cursor ${titleComplete ? 'done' : ''}`} />
            </h1>

            <p className={`ob-hero-subtitle ${reveal(2)}`}>
              I help parents survive (and enjoy) the first year. Think of me as that friend who's been through it and always picks up the phone.
            </p>

            <div className="ob-spacer" />

            <div className={`ob-actions ${reveal(3)}`}>
              <button
                className="ob-btn ob-btn-primary"
                onClick={() => navigateTo('signup', 'left')}
              >
                Let's get started
              </button>
              <button
                className="ob-skip"
                onClick={() => navigateTo('signin', 'left')}
              >
                Already have an account? Sign in
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
          {renderProgress(1)}
          <div className="ob-screen">
            <div className="ob-spacer-lg" />

            <div className="ob-emoji-anim wave">👋</div>

            <h1 className="ob-question">
              {typedTitle}
              <span className={`ob-typewriter-cursor ${titleComplete ? 'done' : ''}`} />
            </h1>
            <p className={`ob-question-sub ${reveal(2)}`}>
              Just your first name. We're on a first-name basis here.
            </p>

            {displayError && (
              <div className="ob-error">{displayError}</div>
            )}

            <form onSubmit={handleCreateProfile}>
              <div className={`ob-field ${reveal(3, true)}`}>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Your name"
                  className="ob-input ob-input-large"
                  required
                  autoFocus
                />
              </div>

              <div className="ob-spacer" />
              <div className={`ob-actions ${reveal(4)}`}>
                <button
                  type="submit"
                  className="ob-btn ob-btn-primary"
                  disabled={localLoading || !parentName.trim()}
                >
                  {localLoading ? 'Saving...' : "That's me →"}
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
          {renderProgress(2)}
          <div className="ob-screen">
            <button className="ob-back" onClick={() => navigateTo('signup-name', 'right')}>
              ← Back
            </button>
            <div className="ob-spacer-lg" />

            <div className="ob-emoji-anim bounce">👶</div>

            <h1 className="ob-question">
              {typedTitle}
              <span className={`ob-typewriter-cursor ${titleComplete ? 'done' : ''}`} />
            </h1>
            <p className={`ob-question-sub ${reveal(2)}`}>
              What's your little one's name? Nickname totally counts.
            </p>

            {displayError && (
              <div className="ob-error">{displayError}</div>
            )}

            <div className={`ob-field ${reveal(3, true)}`}>
              <input
                type="text"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                placeholder="Baby's name"
                className="ob-input ob-input-large"
                autoFocus
              />
            </div>

            <div className="ob-spacer" />
            <div className={`ob-actions ${reveal(4)}`}>
              <button
                className="ob-btn ob-btn-primary"
                onClick={() => {
                  if (babyName.trim()) {
                    navigateTo('signup-baby-birthday', 'left');
                  }
                }}
                disabled={!babyName.trim()}
              >
                Love that name →
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

            <div className="ob-emoji-anim land">🎂</div>

            <h1 className="ob-question">
              {typedTitle}
              <span className={`ob-typewriter-cursor ${titleComplete ? 'done' : ''}`} />
            </h1>
            <p className={`ob-question-sub ${reveal(2)}`}>
              This is the magic number — it's how I know exactly where {babyName} is in her development.
            </p>

            {displayError && (
              <div className="ob-error">{displayError}</div>
            )}

            <div className={`ob-field ${reveal(3, true)}`}>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="ob-input"
                max={new Date().toISOString().split('T')[0]}
                required
              />

              {birthDate && ageInfo && (
                <div className="ob-age-feedback">
                  That makes {babyName} {ageInfo.ageDisplay} old ✨
                </div>
              )}
            </div>

            <div className="ob-spacer" />
            <div className={`ob-actions ${reveal(4)}`}>
              <button
                className="ob-btn ob-btn-primary"
                onClick={() => {
                  if (birthDate) {
                    navigateTo('signup-early', 'left');
                  }
                }}
                disabled={!birthDate}
              >
                Almost done →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // SIGNUP STEP: EARLY ARRIVAL
  // ═══════════════════════════════════════
  if (view === 'signup-early') {
    // Compute adjusted age feedback when due date is entered
    const adjustedAgeInfo = wasEarly && dueDate ? calculateAge(birthDate, dueDate) : null;

    return (
      <div className="ob-container">
        <div className={`ob-card ${slideClass}`}>
          {renderProgress(4)}
          <div className="ob-screen">
            <button className="ob-back" onClick={() => navigateTo('signup-baby-birthday', 'right')}>
              ← Back
            </button>
            <div className="ob-spacer-lg" />

            <div className="ob-emoji-anim glow">🌟</div>

            <h1 className="ob-question">
              {typedTitle}
              <span className={`ob-typewriter-cursor ${titleComplete ? 'done' : ''}`} />
            </h1>
            <p className={`ob-question-sub ${reveal(2)}`}>
              If {babyName} arrived ahead of schedule, I'll use her due date to give more accurate developmental guidance. No pressure either way.
            </p>

            <div className={`${reveal(3)}`}>
              <div className="ob-option-group">
                <div
                  className={`ob-option ${wasEarly === false ? 'selected' : ''}`}
                  onClick={() => {
                    setWasEarly(false);
                    setDueDate('');
                  }}
                >
                  <div className="ob-option-radio">
                    <div className="ob-option-radio-dot" />
                  </div>
                  <div className="ob-option-text">Nope, right on time</div>
                </div>
                <div
                  className={`ob-option ${wasEarly === true ? 'selected' : ''}`}
                  onClick={() => setWasEarly(true)}
                >
                  <div className="ob-option-radio">
                    <div className="ob-option-radio-dot" />
                  </div>
                  <div className="ob-option-text">Yes, {babyName} was early</div>
                </div>
              </div>

              {/* Due date picker — slides in when "Yes" is selected */}
              <div className={`ob-due-date-reveal ${wasEarly === true ? 'visible' : ''}`}>
                <div style={{ paddingTop: 12 }}>
                  <label className="ob-label" style={{ fontWeight: 600 }}>
                    When was {babyName} originally due?
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="ob-input"
                    min={birthDate}
                  />

                  {adjustedAgeInfo && adjustedAgeInfo.isPremature && (
                    <div className="ob-age-feedback">
                      Got it — I'll use {babyName}'s adjusted age ({adjustedAgeInfo.adjustedAgeDisplay}) for milestones
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="ob-spacer" />
            <div className={`ob-actions ${reveal(4)}`}>
              <button
                className="ob-btn ob-btn-primary"
                onClick={handleAddBaby}
                disabled={localLoading || wasEarly === null || (wasEarly === true && !dueDate)}
              >
                {localLoading ? 'Setting up...' : "Let's go! →"}
              </button>
              <button
                className="ob-skip"
                onClick={() => {
                  setWasEarly(false);
                  setDueDate('');
                  handleAddBaby();
                }}
                disabled={localLoading}
              >
                Skip — {babyName} was on time
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
    const ageMonths = ageInfo?.chronologicalMonths ?? 0;
    const ageWeeks = ageInfo?.chronologicalWeeks ?? 0;
    const ageDisplay = ageInfo?.ageDisplay ?? '';
    const rosieQuote = getRosieQuote(babyName, ageMonths);

    return (
      <div className="ob-container">
        <div className={`ob-card ${slideClass}`}>
          <div className="ob-screen">
            <div className="ob-spacer" />

            <Confetti />

            <div className="ob-emoji-anim party">🎉</div>

            <h1 className="ob-hero-title">
              {typedTitle}
              <span className={`ob-typewriter-cursor ${titleComplete ? 'done' : ''}`} />
            </h1>

            <p className={`ob-hero-subtitle ${reveal(2)}`}>
              RosieAI is ready to help you and {babyName}. I've already got some ideas based on where {babyName} is right now.
            </p>

            {/* Profile celebration card */}
            <div className={`ob-celebration-card ${reveal(3)}`}>
              <div className="ob-celebration-card-name">{babyName}</div>
              <div className="ob-celebration-card-age">
                {ageDisplay} old · Week {ageWeeks + 1}
              </div>
              <div className="ob-celebration-card-divider" />
              <div className="ob-celebration-card-rosie">
                "{rosieQuote}"
              </div>
            </div>

            <div className="ob-spacer" />

            <div className={`ob-actions ${reveal(4)}`}>
              <button
                className="ob-btn ob-btn-primary"
                onClick={onComplete}
              >
                Meet your new home →
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
