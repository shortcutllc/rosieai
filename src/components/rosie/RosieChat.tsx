import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BabyProfile, ChatMessage, TimelineEvent, DevelopmentalInfo, GrowthMeasurement, WeatherData } from './types';
import { formatTime } from './developmentalData';
import { getChatPrompts, ChatPrompt } from './reassuranceMessages';
import { useSpeechRecognition } from './useSpeechRecognition';

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

  const handleNewChat = () => {
    onUpdateHistory([]);
    setInput('');
    setHasEnteredView(false);
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
            {/* Greeting */}
            <div className={`rosie-chat-greeting ${hasEnteredView ? 'entered' : ''}`}>
              <div className="rosie-chat-greeting-avatar">
                <img src="/rosie-icon.svg" alt="Rosie" className="rosie-chat-greeting-logo" />
              </div>
              <div className="rosie-chat-greeting-text">
                <span className="rosie-chat-greeting-hey">Hey there</span>
                <span className="rosie-chat-greeting-sub">
                  I know all about {baby.name} at {developmentalInfo.ageDisplay}. What's on your mind?
                </span>
              </div>
            </div>

            {/* Suggestions */}
            <div className="rosie-chat-suggestions">
              <div className={`rosie-chat-suggestions-header ${hasEnteredView ? 'entered' : ''}`}>
                Try asking
              </div>
              <div className="rosie-chat-suggestions-list">
                {contextualPrompts.slice(0, 4).map((prompt, index) => (
                  <button
                    key={prompt.question}
                    className={`rosie-chat-suggestion ${hasEnteredView ? 'entered' : ''}`}
                    style={{ transitionDelay: hasEnteredView ? `${150 + index * 80}ms` : '0ms' }}
                    onClick={() => handleSuggestionClick(prompt.question)}
                  >
                    <span className="rosie-chat-suggestion-icon">
                      {prompt.trigger === 'sleep_issue' ? '🌙' :
                       prompt.trigger === 'feeding_question' ? '🍼' :
                       prompt.trigger === 'developmental' ? '🧠' :
                       prompt.trigger === 'leap' ? '🌊' : '💬'}
                    </span>
                    <span className="rosie-chat-suggestion-text">{prompt.question}</span>
                    <span className="rosie-chat-suggestion-arrow">›</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rosie-chat-messages">
            {messages.map(message => {
              const eventConfirmations = loggedEvents.filter(e => e.messageId === message.id);
              return (
                <React.Fragment key={message.id}>
                  <div className={`rosie-chat-message ${message.role}`}>
                    {renderMessage(message.content)}
                    <div className="rosie-chat-message-time">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
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
