import { useEffect, useRef } from 'react';

const formatTime = (date) =>
  date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="chat-window" role="log" aria-live="polite" aria-label="Conversation">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`chat-msg ${msg.role}`}
        >
          {/* Avatar */}
          <div className="chat-msg-avatar" aria-hidden="true">
            {msg.role === 'ai' ? '🩺' : '👤'}
          </div>

          <div>
            {/* Bubble */}
            <div className="chat-msg-bubble">{msg.content}</div>
            {/* Timestamp */}
            <div className="chat-msg-time">{formatTime(msg.timestamp)}</div>
          </div>
        </div>
      ))}

      {/* AI typing indicator */}
      {isLoading && (
        <div className="typing-indicator">
          <div className="chat-msg-avatar" aria-hidden="true">🩺</div>
          <div className="typing-dots" aria-label="AI is thinking">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
        </div>
      )}

      {/* Invisible anchor for auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
}
