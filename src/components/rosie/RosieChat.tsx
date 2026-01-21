import React, { useState, useRef, useEffect } from 'react';
import { BabyProfile, ChatMessage, TimelineEvent, DevelopmentalInfo, GrowthMeasurement } from './types';
import { formatTime } from './developmentalData';

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
}

const quickQuestions = [
  'Is this normal?',
  'Sleep help',
  'Feeding tips',
  'Why so fussy?',
];

export const RosieChat: React.FC<RosieChatProps> = ({
  baby,
  messages,
  onAddMessage,
  onUpdateHistory,
  timeline,
  developmentalInfo,
  growthMeasurements,
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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

  const handleQuickQuestion = (question: string) => {
    setInput(question);
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

  return (
    <div className="rosie-chat">
      {/* Input Area - Always visible at top */}
      <div className="rosie-chat-input-area">
        <div className="rosie-chat-input-header">
          <span>💬</span>
          <span>Ask me anything about {baby.name}</span>
        </div>
        <div className="rosie-chat-input-wrapper">
          <input
            type="text"
            className="rosie-chat-input"
            placeholder={`Why is ${baby.name} waking every 2 hours?`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button
            className="rosie-chat-send"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
          >
            Send
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="rosie-chat-messages">
        {messages.length === 0 && !isTyping && (
          <div className="rosie-empty">
            <div className="rosie-empty-icon">💭</div>
            <div className="rosie-empty-title">Hi! I'm Rosie</div>
            <div className="rosie-empty-text">
              I know {baby.name} is {developmentalInfo.ageDisplay}. Ask me anything about sleep, feeding, development, or what's normal at this age.
            </div>
          </div>
        )}

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

      {/* Quick Questions */}
      {messages.length === 0 && (
        <div className="rosie-chat-quick">
          {quickQuestions.map(question => (
            <button
              key={question}
              className="rosie-chat-quick-btn"
              onClick={() => handleQuickQuestion(question)}
            >
              {question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RosieChat;
