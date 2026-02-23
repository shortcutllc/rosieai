import React, { useState, useRef, useEffect, useMemo } from 'react';
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
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [chatAreaHeight, setChatAreaHeight] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);

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

  // Measure available viewport space so the chat area (empty state or conversation)
  // fits exactly within the visible viewport — input always on screen
  useEffect(() => {
    const measure = () => {
      if (chatAreaRef.current) {
        const top = chatAreaRef.current.getBoundingClientRect().top;
        const available = window.innerHeight - top - 8;
        setChatAreaHeight(Math.max(available, 300));
      }
    };
    // Measure after a tick so layout is settled
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [messages.length, isTyping]);

  // Staggered entrance animation — trigger after mount
  useEffect(() => {
    const timer = setTimeout(() => setHasEnteredView(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Only scroll to bottom when new messages are added, not on initial mount
  const prevMessageCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      scrollToBottom();
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

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
      // Small delay to simulate response time
      await new Promise(resolve => setTimeout(resolve, 500));
      return generateFallbackResponse(userMessage);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    const userMsg: ChatMessage = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      role: 'user',
      content: userMessage,
    };

    const updatedMessages = [...messages, userMsg];
    onUpdateHistory(updatedMessages);

    // Generate AI response
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
    // Focus the input after setting the question
    const inputEl = document.querySelector('.rosie-chat-input') as HTMLInputElement;
    inputEl?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (content: string) => {
    // Simple markdown-like rendering
    return content.split('\n\n').map((paragraph, i) => {
      // Handle bullet points
      if (paragraph.includes('\n•') || paragraph.startsWith('•')) {
        const items = paragraph.split('\n').filter(line => line.trim());
        return (
          <div key={i}>
            {items.map((item, j) => {
              if (item.startsWith('•')) {
                return <p key={j} style={{ marginLeft: '8px' }}>{item}</p>;
              }
              // Handle bold text with **
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

      // Handle bold text with **
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
    // Re-trigger entrance animation
    setTimeout(() => setHasEnteredView(true), 100);
  };

  return (
    <div ref={chatAreaRef} className="rosie-chat" style={chatAreaHeight ? { height: chatAreaHeight } : undefined}>
      {/* Chat header — shows "New Chat" when there are messages */}
      {messages.length > 0 && (
        <div className="rosie-chat-header">
          <div className="rosie-chat-header-info">
            <span className="rosie-chat-header-count">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
          </div>
          <button
            className="rosie-chat-new-btn"
            onClick={handleNewChat}
            disabled={isTyping}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </button>
        </div>
      )}

      {messages.length === 0 && !isTyping ? (
        /* ── Empty state — greeting + suggestions + input all in one flow ── */
        <div className="rosie-chat-empty-state">
          {/* Greeting — compact, top-aligned */}
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

          {/* Suggestions — compact cards */}
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

          {/* Input — always visible at bottom of empty state */}
          <div className="rosie-chat-input-area">
            <div className="rosie-chat-input-wrapper">
              <input
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
      ) : (
        /* ── Active conversation — messages + input ── */
        <>
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

          {/* Input — pinned to bottom during conversation */}
          <div className="rosie-chat-input-area">
            <div className="rosie-chat-input-wrapper">
              <input
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
        </>
      )}
    </div>
  );
};

export default RosieChat;
