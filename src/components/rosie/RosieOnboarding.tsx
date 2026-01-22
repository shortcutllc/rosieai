import React, { useState } from 'react';
import { BabyProfile } from './types';

interface RosieOnboardingProps {
  onComplete: (profile: BabyProfile) => void;
  onSignIn?: () => void;
}

type OnboardingStep = 'welcome' | 'baby-info' | 'expectations' | 'ready';

export const RosieOnboarding: React.FC<RosieOnboardingProps> = ({ onComplete, onSignIn }) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthWeight, setBirthWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb');
  const [gender, setGender] = useState<'boy' | 'girl' | 'other'>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = () => {
    if (!name.trim() || !birthDate) return;

    setIsSubmitting(true);

    // Small delay for visual feedback
    setTimeout(() => {
      onComplete({
        name: name.trim(),
        birthDate: birthDate,
        gender: gender,
        birthWeight: birthWeight ? parseFloat(birthWeight) : undefined,
        weightUnit: weightUnit,
      });
    }, 300);
  };

  // Calculate max date (today) and min date (3 years ago for toddlers)
  const today = new Date().toISOString().split('T')[0];
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const minDate = threeYearsAgo.toISOString().split('T')[0];

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="rosie-onboarding-step">
            <div className="rosie-onboarding-logo">
              <img src="/rosie-icon.svg" alt="Rosie" className="rosie-onboarding-logo-img" />
            </div>
            <h1 className="rosie-onboarding-title">Rosie</h1>
            <p className="rosie-onboarding-subtitle">
              Calm technology for chaotic moments
            </p>
            <div className="rosie-onboarding-welcome-points">
              <div className="rosie-onboarding-point">
                <span className="rosie-onboarding-point-icon">🌙</span>
                <span>Track feeds, sleep, and diapers</span>
              </div>
              <div className="rosie-onboarding-point">
                <span className="rosie-onboarding-point-icon">💭</span>
                <span>Get answers to your questions</span>
              </div>
              <div className="rosie-onboarding-point">
                <span className="rosie-onboarding-point-icon">🧠</span>
                <span>Understand developmental leaps</span>
              </div>
            </div>
            <div className="rosie-onboarding-actions-welcome">
              <button
                className="rosie-btn-primary"
                onClick={() => setStep('baby-info')}
              >
                Try Without Account
              </button>
              {onSignIn && (
                <button
                  className="rosie-btn-secondary"
                  onClick={onSignIn}
                >
                  Sign In
                </button>
              )}
            </div>
            {onSignIn && (
              <p className="rosie-onboarding-signin-hint">
                Have an account?{' '}
                <button className="rosie-onboarding-link" onClick={onSignIn}>
                  Sign in to sync your data
                </button>
              </p>
            )}
          </div>
        );

      case 'baby-info':
        return (
          <div className="rosie-onboarding-step">
            <div className="rosie-onboarding-progress">
              <div className="rosie-onboarding-progress-fill" style={{ width: '33%' }} />
            </div>
            <h2 className="rosie-onboarding-step-title">Tell me about your baby</h2>
            <p className="rosie-onboarding-step-subtitle">
              This helps me give you age-appropriate information
            </p>

            <div className="rosie-onboarding-form">
              <div className="rosie-onboarding-field">
                <label className="rosie-onboarding-label" htmlFor="baby-name">
                  Baby's name
                </label>
                <input
                  id="baby-name"
                  type="text"
                  className="rosie-input"
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div className="rosie-onboarding-field">
                <label className="rosie-onboarding-label" htmlFor="birth-date">
                  Date of birth
                </label>
                <input
                  id="birth-date"
                  type="date"
                  className="rosie-input"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={today}
                  min={minDate}
                />
              </div>

              <div className="rosie-onboarding-field">
                <label className="rosie-onboarding-label">
                  Gender (optional)
                </label>
                <div className="rosie-onboarding-gender-options">
                  <button
                    type="button"
                    className={`rosie-onboarding-gender-btn ${gender === 'boy' ? 'active' : ''}`}
                    onClick={() => setGender('boy')}
                  >
                    Boy
                  </button>
                  <button
                    type="button"
                    className={`rosie-onboarding-gender-btn ${gender === 'girl' ? 'active' : ''}`}
                    onClick={() => setGender('girl')}
                  >
                    Girl
                  </button>
                  <button
                    type="button"
                    className={`rosie-onboarding-gender-btn ${gender === 'other' ? 'active' : ''}`}
                    onClick={() => setGender('other')}
                  >
                    Skip
                  </button>
                </div>
              </div>

              <div className="rosie-onboarding-field">
                <label className="rosie-onboarding-label" htmlFor="birth-weight">
                  Birth weight (optional)
                </label>
                <div className="rosie-onboarding-weight-input">
                  <input
                    id="birth-weight"
                    type="number"
                    step="0.1"
                    className="rosie-input"
                    placeholder={weightUnit === 'lb' ? '7.5' : '3.4'}
                    value={birthWeight}
                    onChange={(e) => setBirthWeight(e.target.value)}
                  />
                  <div className="rosie-onboarding-unit-toggle">
                    <button
                      type="button"
                      className={`rosie-onboarding-unit-btn ${weightUnit === 'lb' ? 'active' : ''}`}
                      onClick={() => setWeightUnit('lb')}
                    >
                      lb
                    </button>
                    <button
                      type="button"
                      className={`rosie-onboarding-unit-btn ${weightUnit === 'kg' ? 'active' : ''}`}
                      onClick={() => setWeightUnit('kg')}
                    >
                      kg
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rosie-onboarding-actions">
              <button
                className="rosie-btn-secondary"
                onClick={() => setStep('welcome')}
              >
                Back
              </button>
              <button
                className="rosie-btn-primary"
                onClick={() => setStep('expectations')}
                disabled={!name.trim() || !birthDate}
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 'expectations':
        return (
          <div className="rosie-onboarding-step">
            <div className="rosie-onboarding-progress">
              <div className="rosie-onboarding-progress-fill" style={{ width: '66%' }} />
            </div>
            <h2 className="rosie-onboarding-step-title">A few things to know</h2>
            <p className="rosie-onboarding-step-subtitle">
              Before we begin, let's set some expectations
            </p>

            <div className="rosie-onboarding-expectations">
              <div className="rosie-onboarding-expectation">
                <div className="rosie-onboarding-expectation-icon">📊</div>
                <div className="rosie-onboarding-expectation-content">
                  <h4>Tracking is optional</h4>
                  <p>Log what's helpful to you. There's no "right" amount. Skip days guilt-free.</p>
                </div>
              </div>

              <div className="rosie-onboarding-expectation">
                <div className="rosie-onboarding-expectation-icon">🎯</div>
                <div className="rosie-onboarding-expectation-content">
                  <h4>Ranges, not targets</h4>
                  <p>I'll show you what's normal for {name}'s age. "Normal" is wide. Your baby is unique.</p>
                </div>
              </div>

              <div className="rosie-onboarding-expectation">
                <div className="rosie-onboarding-expectation-icon">💚</div>
                <div className="rosie-onboarding-expectation-content">
                  <h4>You know your baby</h4>
                  <p>I'm here to support, not judge. Trust your instincts. You're already doing great.</p>
                </div>
              </div>
            </div>

            <div className="rosie-onboarding-actions">
              <button
                className="rosie-btn-secondary"
                onClick={() => setStep('baby-info')}
              >
                Back
              </button>
              <button
                className="rosie-btn-primary"
                onClick={() => setStep('ready')}
              >
                I'm Ready
              </button>
            </div>
          </div>
        );

      case 'ready':
        return (
          <div className="rosie-onboarding-step rosie-onboarding-ready">
            <div className="rosie-onboarding-progress">
              <div className="rosie-onboarding-progress-fill" style={{ width: '100%' }} />
            </div>
            <div className="rosie-onboarding-ready-icon">🌟</div>
            <h2 className="rosie-onboarding-step-title">Ready to go!</h2>
            <p className="rosie-onboarding-step-subtitle">
              Welcome, {name}'s amazing parent
            </p>

            <div className="rosie-onboarding-ready-message">
              <p>
                Remember: there's no perfect way to do this.
                You're learning together, and that's exactly right.
              </p>
            </div>

            <button
              className="rosie-btn-primary rosie-btn-large"
              onClick={handleComplete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Setting up...' : 'Start Using Rosie'}
            </button>
          </div>
        );
    }
  };

  return (
    <div className="rosie-onboarding">
      <div className="rosie-onboarding-content">
        {renderStep()}
      </div>
    </div>
  );
};

export default RosieOnboarding;
