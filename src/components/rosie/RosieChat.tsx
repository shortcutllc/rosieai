import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BabyProfile, ChatMessage, TimelineEvent, DevelopmentalInfo, GrowthMeasurement, WeatherData } from './types';
import { formatTime } from './developmentalData';
import { getChatPrompts, ChatPrompt } from './reassuranceMessages';

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

interface RosieChatProps {
  baby: BabyProfile;
  messages: ChatMessage[];
  onAddMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  onUpdateHistory: (messages: ChatMessage[]) => void;
  timeline: TimelineEvent[];
  developmentalInfo: DevelopmentalInfo;
  growthMeasurements?: GrowthMeasurement[];
  weather?: WeatherData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RosieChat: React.FC<RosieChatProps> = ({
  baby,
  messages,
  onAddMessage,
  onUpdateHistory,
  timeline,
  developmentalInfo,
  growthMeasurements,
  weather,
  isOpen,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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
    return getChatPrompts(babyAgeWeeks);
  }, [babyAgeWeeks]);

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
  const callClaudeAPI = async (userMessage: string): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          baby: {
            name: baby.name,
            birthDate: baby.birthDate,
            gender: baby.gender,
            birthWeight: baby.birthWeight,
            weightUnit: baby.weightUnit,
          },
          timeline,
          developmentalInfo,
          chatHistory: messages.map(m => ({ role: m.role, content: m.content })),
          growthMeasurements,
          weather: weather || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      return data.message;
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
  const generateResponse = async (userMessage: string): Promise<string> => {
    try {
      return await callClaudeAPI(userMessage);
    } catch (error) {
      console.warn('Claude API failed, using fallback response');
      await new Promise(resolve => setTimeout(resolve, 500));
      return generateFallbackResponse(userMessage);
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
      const response = await generateResponse(userMessage);

      const assistantMsg: ChatMessage = {
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        role: 'assistant',
        content: response,
      };

      onUpdateHistory([...updatedMessages, assistantMsg]);
    } catch (error) {
      console.error('Error generating response:', error);
    } finally {
      setIsTyping(false);
    }
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

  const renderMessage = (content: string) => {
    return content.split('\n\n').map((paragraph, i) => {
      if (paragraph.includes('\n•') || paragraph.startsWith('•')) {
        const items = paragraph.split('\n').filter(line => line.trim());
        return (
          <div key={i}>
            {items.map((item, j) => {
              if (item.startsWith('•')) {
                return <p key={j} style={{ marginLeft: '8px' }}>{item}</p>;
              }
              const parts = item.split(/\*\*(.*?)\*\*/g);
              return (
                <p key={j}>
                  {parts.map((part, k) =>
                    k % 2 === 1 ? <strong key={k}>{part}</strong> : part
                  )}
                </p>
              );
            })}
          </div>
        );
      }

      const parts = paragraph.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i}>
          {parts.map((part, k) =>
            k % 2 === 1 ? <strong key={k}>{part}</strong> : part
          )}
        </p>
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
          <span>Ask Rosie</span>
        </div>
        <button
          className="rosie-chat-new-btn"
          onClick={handleNewChat}
          disabled={isTyping || messages.length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New
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
            {messages.map(message => (
              <div
                key={message.id}
                className={`rosie-chat-message ${message.role}`}
              >
                {renderMessage(message.content)}
                <div className="rosie-chat-message-time">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            ))}

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
            placeholder={`Ask about ${baby.name}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
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
        </div>
      </div>
    </div>
  );
};

export default RosieChat;
