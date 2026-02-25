import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BabyProfile, ChatMessage, TimelineEvent, DevelopmentalInfo, GrowthMeasurement, WeatherData, WizardState, QuickLogEventType, WizardButtonOption } from './types';
import { formatTime } from './developmentalData';
import { getChatPrompts, ChatPrompt, generateSessionGreeting } from './reassuranceMessages';
import { useSpeechRecognition } from './useSpeechRecognition';
import { getWizardSteps, getNextSteps, wizardAnswersToEvent, getWizardConfirmation, getWizardEventSummary } from './quickLogWizard';

// Helper to generate UUID (fallback for browsers without crypto.randomUUID)
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Extracted event from the chat API (matches log_event tool output)
interface ExtractedEvent {
  type: 'feed' | 'sleep' | 'diaper';
  feedType?: 'breast' | 'bottle' | 'solid';
  feedSide?: 'left' | 'right' | 'both';
  feedAmount?: number;
  feedDuration?: number;
  sleepType?: 'nap' | 'night';
  sleepDuration?: number;
  diaperType?: 'wet' | 'dirty' | 'both';
  note?: string;
  eventTime?: string;
}

// Logged event confirmation (tied to a message ID)
interface LoggedEventConfirmation {
  messageId: string;
  eventId: string;
  summary: string;
  createdAt: number;
}

// Convert extracted event to a display summary
function summarizeEvent(event: ExtractedEvent): string {
  const parts: string[] = [];
  if (event.type === 'feed') {
    parts.push('Feed');
    if (event.feedType === 'breast' && event.feedSide) parts.push(event.feedSide);
    else if (event.feedType === 'bottle' && event.feedAmount) parts.push(`${event.feedAmount}oz`);
    else if (event.feedType) parts.push(event.feedType);
    if (event.feedDuration) parts.push(`${event.feedDuration}min`);
  } else if (event.type === 'sleep') {
    parts.push(event.sleepType === 'night' ? 'Night sleep' : 'Nap');
    if (event.sleepDuration) parts.push(`${event.sleepDuration}min`);
  } else if (event.type === 'diaper') {
    parts.push(event.diaperType === 'both' ? 'Wet + dirty' : event.diaperType === 'dirty' ? 'Dirty diaper' : 'Wet diaper');
  }
  return parts.join(' · ');
}

// Convert extracted event to TimelineEvent shape for onAddEvent
function mapExtractedEvent(extracted: ExtractedEvent): Omit<TimelineEvent, 'id' | 'timestamp'> {
  const event: Omit<TimelineEvent, 'id' | 'timestamp'> = {
    type: extracted.type,
  };

  if (extracted.type === 'feed') {
    event.feedType = extracted.feedType || 'breast';
    event.feedSide = extracted.feedSide;
    event.feedAmount = extracted.feedAmount;
    event.feedDuration = extracted.feedDuration;
    if (extracted.feedSide && extracted.feedSide !== 'both') {
      event.feedLastSide = extracted.feedSide as 'left' | 'right';
    }
  } else if (extracted.type === 'sleep') {
    event.sleepType = extracted.sleepType || 'nap';
    event.sleepDuration = extracted.sleepDuration;
  } else if (extracted.type === 'diaper') {
    event.diaperType = extracted.diaperType || 'wet';
  }

  if (extracted.note) event.note = extracted.note;

  return event;
}

interface RosieChatProps {
  baby: BabyProfile;
  messages: ChatMessage[];
  onAddMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  onUpdateHistory: (messages: ChatMessage[]) => void;
  onAddEvent?: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => string | void;
  onDeleteEvent?: (eventId: string) => void;
  timeline: TimelineEvent[];
  developmentalInfo: DevelopmentalInfo;
  growthMeasurements?: GrowthMeasurement[];
  weather?: WeatherData | null;
  isOpen: boolean;
  initialMessage?: string;
  parentName?: string;
  onClose: () => void;
}

export const RosieChat: React.FC<RosieChatProps> = ({
  baby,
  messages,
  onAddMessage,
  onUpdateHistory,
  onAddEvent,
  onDeleteEvent,
  timeline,
  developmentalInfo,
  growthMeasurements,
  weather,
  isOpen,
  initialMessage,
  parentName,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loggedEvents, setLoggedEvents] = useState<LoggedEventConfirmation[]>([]);

  // Speech recognition for voice input
  const { isListening, transcript, interimTranscript, isSupported: speechSupported, startListening, stopListening } = useSpeechRecognition();

  // When speech transcript finalizes, append to input
  useEffect(() => {
    if (transcript) {
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    }
  }, [transcript]);

  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // controls CSS class for animation
  const [shouldRender, setShouldRender] = useState(false); // controls DOM presence

  // Typewriter state for greeting animation
  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterDone, setTypewriterDone] = useState(false);

  // Quick log wizard state
  const [wizardState, setWizardState] = useState<WizardState | null>(null);
  const [remainingWizardSteps, setRemainingWizardSteps] = useState<import('./types').WizardStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate baby's age in weeks
  const babyAgeWeeks = useMemo(() => {
    const birth = new Date(baby.birthDate);
    const now = new Date();
    return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 7));
  }, [baby.birthDate]);

  // Get contextual chat prompts based on baby's age and current state
  const contextualPrompts = useMemo((): ChatPrompt[] => {
    return getChatPrompts(babyAgeWeeks, baby.name);
  }, [babyAgeWeeks, baby.name]);

  // Personalized greeting — always shown in chat empty state
  const sessionGreeting = useMemo(() => {
    const hour = new Date().getHours();
    return generateSessionGreeting(
      parentName,
      baby.name,
      developmentalInfo.ageDisplay,
      weather ? { condition: weather.condition, temperature: weather.temperature } : null,
      hour,
      babyAgeWeeks
    );
  }, [parentName, baby.name, developmentalInfo.ageDisplay, weather, babyAgeWeeks]);

  // Handle open/close animation lifecycle
  useEffect(() => {
    if (isOpen) {

      // Mount, then animate in on next frame
      setShouldRender(true);
      document.body.style.overflow = 'hidden'; // lock body scroll
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      // Animate out, then unmount after transition
      setIsVisible(false);
      document.body.style.overflow = '';
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 350); // match exit animation duration
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Staggered entrance animation for empty state — trigger after overlay is visible
  useEffect(() => {
    if (isVisible && messages.length === 0) {
      const timer = setTimeout(() => setHasEnteredView(true), 200);
      return () => clearTimeout(timer);
    }
  }, [isVisible, messages.length]);

  // Typewriter effect for greeting — character by character with punctuation pauses
  useEffect(() => {
    if (!hasEnteredView || messages.length > 0) return;

    const text = sessionGreeting.greeting;
    let i = 0;
    let cancelled = false;
    setTypewriterText('');
    setTypewriterDone(false);

    const tick = () => {
      if (cancelled || i >= text.length) {
        if (!cancelled) setTypewriterDone(true);
        return;
      }
      i++;
      setTypewriterText(text.slice(0, i));
      const char = text[i - 1];
      const delay = char === '.' || char === '!' || char === '?' ? 300
        : char === ',' ? 150
        : char === '\u2014' || char === '-' ? 200
        : 40;
      setTimeout(tick, delay);
    };

    // Start after heart entrance animation (600ms bounce + small buffer)
    const startTimer = setTimeout(tick, 800);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
    };
  }, [hasEnteredView, messages.length, sessionGreeting.greeting]);

  // Handle initial message from "Is This Normal?" cards — pre-fill input
  const initialMessageHandled = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isVisible && initialMessage && initialMessage !== initialMessageHandled.current) {
      initialMessageHandled.current = initialMessage;
      setInput(initialMessage);
    }
    if (!isOpen) {
      initialMessageHandled.current = undefined;
    }
  }, [isVisible, initialMessage, isOpen]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Only scroll to bottom when new messages are added
  const prevMessageCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      scrollToBottom();
    }
    prevMessageCount.current = messages.length;
  }, [messages, scrollToBottom]);

  // Call the Claude API via Netlify function
  const callClaudeAPI = async (userMessage: string): Promise<{ message: string; events?: ExtractedEvent[] }> => {
    try {
      // Strip lone surrogates that produce invalid JSON (causes API 400 errors)
      const sanitizeJson = (str: string) => str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: sanitizeJson(JSON.stringify({
          message: userMessage,
          baby: {
            name: baby.name,
            birthDate: baby.birthDate,
            gender: baby.gender,
            birthWeight: baby.birthWeight,
            weightUnit: baby.weightUnit,
            catchUpData: baby.catchUpData,
          },
          timeline,
          developmentalInfo,
          chatHistory: messages.map(m => ({ role: m.role, content: m.content })),
          growthMeasurements,
          weather: weather || undefined,
        })),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      return { message: data.message, events: data.events };
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  };

  // Fallback mock response if API fails
  const generateFallbackResponse = (userMessage: string): string => {
    const { weekNumber, ageDisplay, sleepInfo, feedingInfo, whatToExpect } = developmentalInfo;
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('sleep') || lowerMessage.includes('nap') || lowerMessage.includes('tired')) {
      return `At ${ageDisplay}, ${baby.name}'s sleep is still developing. Here's what's typical for week ${weekNumber}:

• **Total sleep:** ${sleepInfo.totalSleep}
• **Night sleep:** ${sleepInfo.nightSleep}
• **Wake windows:** ${sleepInfo.wakeWindow}
• **Naps:** ${sleepInfo.napCount}

Would you like more specific tips?`;
    }

    if (lowerMessage.includes('feed') || lowerMessage.includes('eat') || lowerMessage.includes('hungry')) {
      return `Here's what's typical for feeding at ${ageDisplay}:

• **Frequency:** ${feedingInfo.frequency}
${feedingInfo.amount ? `• **Amount:** ${feedingInfo.amount}` : ''}

${feedingInfo.notes.slice(0, 2).map(note => `• ${note}`).join('\n')}

Is there something specific about feeding that's concerning you?`;
    }

    return `At ${ageDisplay} (week ${weekNumber}), here's some context about ${baby.name}:

${whatToExpect.slice(0, 3).map(item => `• ${item}`).join('\n')}

**Sleep:** ${sleepInfo.totalSleep} total
**Feeding:** ${feedingInfo.frequency}

Could you tell me more about what you're experiencing?`;
  };

  // Generate AI response - try Claude API first, fallback to mock
  const generateResponse = async (userMessage: string): Promise<{ message: string; events?: ExtractedEvent[] }> => {
    try {
      return await callClaudeAPI(userMessage);
    } catch (error) {
      console.warn('Claude API failed, using fallback response');
      await new Promise(resolve => setTimeout(resolve, 500));
      return { message: generateFallbackResponse(userMessage) };
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      role: 'user',
      content: userMessage,
    };

    const updatedMessages = [...messages, userMsg];
    onUpdateHistory(updatedMessages);

    setIsTyping(true);
    try {
      const { message: responseText, events } = await generateResponse(userMessage);

      const assistantMsgId = generateUUID();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        timestamp: new Date().toISOString(),
        role: 'assistant',
        content: responseText,
      };

      // Process extracted events (if any) — create timeline events
      if (events && events.length > 0 && onAddEvent) {
        for (const extracted of events) {
          const eventData = mapExtractedEvent(extracted);
          const eventId = onAddEvent(eventData);
          if (eventId) {
            setLoggedEvents(prev => [...prev, {
              messageId: assistantMsgId,
              eventId,
              summary: summarizeEvent(extracted),
              createdAt: Date.now(),
            }]);
          }
        }
      }

      onUpdateHistory([...updatedMessages, assistantMsg]);
    } catch (error) {
      console.error('Error generating response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Undo a logged event
  const handleUndoEvent = (eventId: string) => {
    onDeleteEvent?.(eventId);
    setLoggedEvents(prev => prev.filter(e => e.eventId !== eventId));
  };

  const handleSuggestionClick = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render inline formatting (bold, italic)
  const renderInline = (text: string, keyPrefix: string) => {
    // Handle **bold** markers
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, k) =>
      k % 2 === 1 ? <strong key={`${keyPrefix}-${k}`}>{part}</strong> : part
    );
  };

  // Render a single line, detecting headers, bullets, dashes
  const renderLine = (line: string, key: string): React.ReactNode => {
    const trimmed = line.trim();

    // Headers: ###, ##, # → render as bold text (strip the hashtags)
    const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      return (
        <p key={key} style={{ fontWeight: 600 }}>
          {renderInline(headerMatch[2], key)}
        </p>
      );
    }

    // Bullet points: • or - at start of line
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      const bulletText = trimmed.replace(/^[•\-]\s*/, '');
      return (
        <p key={key} style={{ marginLeft: '8px' }}>
          {'• '}{renderInline(bulletText, key)}
        </p>
      );
    }

    // Regular text with inline formatting
    return (
      <p key={key}>
        {renderInline(trimmed, key)}
      </p>
    );
  };

  const renderMessage = (content: string) => {
    // Split on double newlines for paragraph breaks
    return content.split('\n\n').map((paragraph, i) => {
      const lines = paragraph.split('\n').filter(line => line.trim());

      if (lines.length === 1) {
        return renderLine(lines[0], `p-${i}`);
      }

      // Multiple lines in a paragraph — render each
      return (
        <div key={`p-${i}`}>
          {lines.map((line, j) => renderLine(line, `p-${i}-${j}`))}
        </div>
      );
    });
  };

  // Compute "last event" details for the stacked action list
  const lastEventInfo = useMemo(() => {
    const formatTimeAgo = (ts: string): string => {
      const diff = Date.now() - new Date(ts).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ${mins % 60}m ago`;
      return `${Math.floor(hours / 24)}d ago`;
    };

    const sortedTimeline = [...timeline].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const lastFeed = sortedTimeline.find(e => e.type === 'feed');
    const lastSleep = sortedTimeline.find(e => e.type === 'sleep');
    const lastDiaper = sortedTimeline.find(e => e.type === 'diaper');

    const feedDetail = lastFeed
      ? `Last: ${formatTimeAgo(lastFeed.timestamp)} — ${
          lastFeed.feedType === 'bottle' ? `Bottle${lastFeed.feedAmount ? `, ${lastFeed.feedAmount}oz` : ''}`
          : lastFeed.feedType === 'breast' ? `Breast${lastFeed.feedSide ? `, ${lastFeed.feedSide}` : ''}`
          : lastFeed.feedType === 'solid' ? 'Solid food' : 'Feed'
        }`
      : 'No feeds logged yet';

    const sleepDetail = lastSleep
      ? `Last: ${formatTimeAgo(lastSleep.timestamp)} — ${
          lastSleep.sleepType === 'nap' ? 'Nap' : 'Night'
        }${lastSleep.sleepDuration ? `, ${lastSleep.sleepDuration >= 60 ? Math.floor(lastSleep.sleepDuration / 60) + 'h ' : ''}${lastSleep.sleepDuration % 60}min` : ''}`
      : 'No sleep logged yet';

    const diaperDetail = lastDiaper
      ? `Last: ${formatTimeAgo(lastDiaper.timestamp)} — ${
          lastDiaper.diaperType === 'both' ? 'Wet + dirty'
          : lastDiaper.diaperType === 'dirty' ? 'Dirty' : 'Wet'
        }`
      : 'No diapers logged yet';

    return { feedDetail, sleepDetail, diaperDetail };
  }, [timeline]);

  // ── Quick Log Wizard — chat-native conversational logging ──

  const startWizard = (eventType: QuickLogEventType) => {
    const steps = getWizardSteps(eventType);
    const firstStep = steps[0];

    const newState: WizardState = {
      eventType,
      currentStepIndex: 0,
      answers: {},
      steps,
      isComplete: false,
    };
    setWizardState(newState);
    setRemainingWizardSteps([]);

    // Add Rosie's first question as a message with buttons
    const assistantMsg: ChatMessage = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      role: 'assistant',
      content: firstStep.question,
      metadata: {
        isWizardMessage: true,
        wizardButtons: firstStep.options,
        wizardStepField: firstStep.field,
      },
    };

    onUpdateHistory([...messages, assistantMsg]);
  };

  const handleWizardButton = (option: WizardButtonOption, stepField: string) => {
    if (!wizardState) return;

    // 1. Add user's selection as a message
    const userMsg: ChatMessage = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      role: 'user',
      content: option.label,
      metadata: { isWizardUserResponse: true },
    };

    // 2. Update answers
    const updatedAnswers = { ...wizardState.answers, [stepField]: option.value };

    // 3. Check remaining queued steps first, then get next steps
    let nextSteps = remainingWizardSteps.length > 0
      ? remainingWizardSteps
      : getNextSteps(wizardState.eventType, updatedAnswers, stepField);

    if (nextSteps.length > 0) {
      const nextStep = nextSteps[0];
      const remaining = nextSteps.slice(1);

      const assistantMsg: ChatMessage = {
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        role: 'assistant',
        content: nextStep.question,
        metadata: {
          isWizardMessage: true,
          wizardButtons: nextStep.options,
          wizardStepField: nextStep.field,
        },
      };

      setWizardState({
        ...wizardState,
        currentStepIndex: wizardState.currentStepIndex + 1,
        answers: updatedAnswers,
      });
      setRemainingWizardSteps(remaining);

      onUpdateHistory([...messages, userMsg, assistantMsg]);
    } else {
      // Wizard complete — create the event
      const confirmation = getWizardConfirmation(wizardState.eventType, updatedAnswers);
      const summary = getWizardEventSummary(wizardState.eventType, updatedAnswers);
      const eventData = wizardAnswersToEvent(wizardState.eventType, updatedAnswers);

      const confirmMsg: ChatMessage = {
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        role: 'assistant',
        content: confirmation,
      };

      // Create the timeline event
      if (onAddEvent) {
        const eventId = onAddEvent(eventData as Omit<TimelineEvent, 'id' | 'timestamp'>);
        if (eventId) {
          setLoggedEvents(prev => [...prev, {
            messageId: confirmMsg.id,
            eventId,
            summary,
            createdAt: Date.now(),
          }]);
        }
      }

      setWizardState(null);
      setRemainingWizardSteps([]);
      onUpdateHistory([...messages, userMsg, confirmMsg]);
    }
  };

  const handleNewChat = () => {
    onUpdateHistory([]);
    setInput('');
    setWizardState(null);
    setRemainingWizardSteps([]);
    setHasEnteredView(false);
    setTypewriterDone(false);
    setTypewriterText('');
    setTimeout(() => setHasEnteredView(true), 100);
  };

  if (!shouldRender) return null;

  return (
    <div className={`rosie-chat-overlay ${isVisible ? 'open' : ''}`}>
      {/* ── Fullscreen header — back, title, new chat ── */}
      <div className="rosie-chat-topbar">
        <button className="rosie-chat-back" onClick={onClose} aria-label="Close chat">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="rosie-chat-topbar-title">
          <img src="/rosie-icon.svg" alt="" className="rosie-chat-topbar-logo" />
          <span>Ask RosieAI</span>
        </div>
        <button
          className="rosie-chat-new-btn"
          onClick={handleNewChat}
          disabled={isTyping || messages.length === 0}
          aria-label="New chat"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      </div>

      {/* ── Body — empty state or messages ── */}
      <div className="rosie-chat-body">
        {messages.length === 0 && !isTyping ? (
          <div className="rosie-chat-empty-state">
            {/* Greeting — living heart + typewriter */}
            <div className={`rosie-chat-greeting-v2 ${hasEnteredView ? 'entered' : ''}`}>
              <div className="rosie-chat-heart">💜</div>
              <div className="rosie-chat-greeting-text-v2">
                <span className="rosie-chat-greeting-typewriter">
                  {typewriterText}
                  {!typewriterDone && <span className="rosie-chat-cursor">|</span>}
                </span>
                <span className={`rosie-chat-greeting-sub-v2 ${typewriterDone ? 'visible' : ''}`}>
                  {sessionGreeting.subtext}
                </span>
              </div>
            </div>

            {/* Stacked action list — separate log actions with category colors */}
            <div className={`rosie-chat-action-list ${hasEnteredView ? 'entered' : ''}`}>
              <button className="rosie-chat-action-row" onClick={() => startWizard('feed')}>
                <div className="rosie-chat-action-icon rosie-chat-action-icon-feed">
                  <span>🍼</span>
                </div>
                <div className="rosie-chat-action-content">
                  <span className="rosie-chat-action-name">Log a feed</span>
                  <span className="rosie-chat-action-detail">{lastEventInfo.feedDetail}</span>
                </div>
                <span className="rosie-chat-action-chevron">›</span>
              </button>
              <button className="rosie-chat-action-row" onClick={() => startWizard('sleep')}>
                <div className="rosie-chat-action-icon rosie-chat-action-icon-sleep">
                  <span>💤</span>
                </div>
                <div className="rosie-chat-action-content">
                  <span className="rosie-chat-action-name">Log sleep</span>
                  <span className="rosie-chat-action-detail">{lastEventInfo.sleepDetail}</span>
                </div>
                <span className="rosie-chat-action-chevron">›</span>
              </button>
              <button className="rosie-chat-action-row" onClick={() => startWizard('diaper')}>
                <div className="rosie-chat-action-icon rosie-chat-action-icon-diaper">
                  <span>🧷</span>
                </div>
                <div className="rosie-chat-action-content">
                  <span className="rosie-chat-action-name">Log a diaper</span>
                  <span className="rosie-chat-action-detail">{lastEventInfo.diaperDetail}</span>
                </div>
                <span className="rosie-chat-action-chevron">›</span>
              </button>
            </div>

            {/* "Or ask Rosie" divider + ghost text suggestions */}
            <div className={`rosie-chat-divider ${hasEnteredView ? 'entered' : ''}`}>
              Or ask Rosie
            </div>
            <div className="rosie-chat-ghost-list">
              {[
                `How's ${baby.name} sleeping this week?`,
                `I'm feeling overwhelmed today`,
                `log 4oz bottle at 4pm`,
                `What should ${baby.name} be doing this week?`,
                ...contextualPrompts.slice(0, 1).map(p => p.question),
              ].slice(0, 5).map((suggestion, index) => (
                <button
                  key={suggestion}
                  className={`rosie-chat-ghost-item ${hasEnteredView ? 'entered' : ''}`}
                  style={{ transitionDelay: hasEnteredView ? `${300 + index * 60}ms` : '0ms' }}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  &ldquo;{suggestion}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rosie-chat-messages">
            {messages.map(message => {
              const eventConfirmations = loggedEvents.filter(e => e.messageId === message.id);
              return (
                <React.Fragment key={message.id}>
                  <div className={`rosie-chat-message ${message.role}${message.metadata?.isWizardUserResponse ? ' wizard-response' : ''}`}>
                    {renderMessage(message.content)}
                    <div className="rosie-chat-message-time">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                  {/* Wizard action buttons — below assistant message */}
                  {message.metadata?.wizardButtons && (
                    <div className="rosie-chat-wizard-buttons">
                      {message.metadata.wizardButtons.map(opt => {
                        const isAnswered = wizardState
                          ? wizardState.answers[message.metadata!.wizardStepField!] !== undefined
                          : true; // no wizard = all answered (completed)
                        const isSelected = wizardState
                          ? wizardState.answers[message.metadata!.wizardStepField!] === opt.value
                          : false;
                        return (
                          <button
                            key={opt.value}
                            className={`rosie-chat-wizard-btn${isSelected ? ' selected' : ''}`}
                            onClick={() => handleWizardButton(opt, message.metadata!.wizardStepField!)}
                            disabled={isAnswered}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {eventConfirmations.map(conf => {
                    const canUndo = Date.now() - conf.createdAt < 30000;
                    return (
                      <div key={conf.eventId} className="rosie-chat-event-card">
                        <span className="rosie-chat-event-check">✓</span>
                        <span className="rosie-chat-event-summary">Logged: {conf.summary}</span>
                        {canUndo && (
                          <button
                            className="rosie-chat-event-undo"
                            onClick={() => handleUndoEvent(conf.eventId)}
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {isTyping && (
              <div className="rosie-chat-typing">
                <div className="rosie-chat-typing-dot" />
                <div className="rosie-chat-typing-dot" />
                <div className="rosie-chat-typing-dot" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input — always pinned to bottom ── */}
      <div className="rosie-chat-input-area">
        <div className="rosie-chat-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="rosie-chat-input"
            placeholder={isListening && interimTranscript ? interimTranscript : `Ask about ${baby.name}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          {!input.trim() && speechSupported && !isTyping ? (
            <button
              className={`rosie-chat-mic ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              aria-label={isListening ? 'Stop recording' : 'Voice input'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="1" width="6" height="13" rx="3" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="20" x2="12" y2="24" />
              </svg>
            </button>
          ) : (
            <button
              className="rosie-chat-send"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RosieChat;
