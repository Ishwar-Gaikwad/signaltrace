import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Smartphone,
  Check,
  Copy,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { sendCitizenBotMessage } from '../services/api';

const SAMPLE_VIRAL_RUMORS = [
  {
    label: '🚨 Chamoli M7.2 Earthquake',
    text: 'MASSIVE 7.2 Richter earthquake just hit Chamoli Uttarakhand! Entire towns flattened and hundreds feared dead. Please pray!'
  },
  {
    label: '🌊 Teesta River Flood',
    text: 'Water levels have crossed danger marks on the Teesta River near Domohani Jalpaiguri. Flood waters are entering farm fields!'
  },
  {
    label: '🌉 Suketi Bridge Collapse',
    text: 'Cloudburst in Mandi: The Suketi highway bridge has collapsed into the river AND hospitals are in total darkness!'
  },
  {
    label: '🌀 Paradip Cyclone Evacuation',
    text: 'EVACUATE NOW: Government Red Alert order in place for Paradip coast right now. Cyclone Sagar will hit Paradip directly tonight!'
  }
];

export const CitizenBotSimulator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState('whatsapp'); // 'whatsapp' | 'sms'
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      channel: 'whatsapp',
      text: `🚨 *SIGNALTRACE DISASTER HELPLINE (112 / NDMA)*

Namaste! 👋 I am your 24/7 automated emergency fact-checking assistant.

Forward any suspicious WhatsApp forward, disaster rumor, or SMS alert here. I will cross-examine it against official bulletins from USGS, GDACS, and national disaster agencies.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      channel,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const result = await sendCitizenBotMessage(text, channel);

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        channel,
        text: result.botReply,
        status: result.overallStatus,
        atomicResults: result.atomicResults,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        channel,
        text: `⚠️ *SignalTrace Helpline Error*: Unable to verify at this moment (${err.message}). In an immediate life-safety emergency, please dial 112 or NDMA at 1078 directly.`,
        status: 'Error',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        channel,
        text: `🚨 *SIGNALTRACE DISASTER HELPLINE*\n\nHistory cleared. Ready to check your next disaster post or emergency rumor!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.75rem 1.2rem',
          borderRadius: '9999px',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.86rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4), 0 2px 6px rgba(0,0,0,0.5)',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        aria-label="Citizen Helpline WhatsApp and SMS Simulator"
      >
        <div style={{ position: 'relative' }}>
          <Smartphone size={18} />
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#38bdf8',
              boxShadow: '0 0 6px #38bdf8'
            }}
          />
        </div>
        <span>{isOpen ? 'Close Helpline Bot' : '📱 Citizen WhatsApp / SMS Bot'}</span>
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            width: '400px',
            maxWidth: 'calc(100vw - 32px)',
            height: '560px',
            maxHeight: 'calc(100vh - 120px)',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            overflow: 'hidden',
            background: '#0b1320',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.75), 0 0 25px rgba(16, 185, 129, 0.15)',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: channel === 'whatsapp' ? '#075e54' : '#1e293b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'background 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}
              >
                {channel === 'whatsapp' ? '💬' : '📱'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>SignalTrace Citizen Line</span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      background: 'rgba(255, 255, 255, 0.25)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}
                  >
                    112 / 1078
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                  <span>Active Grounding (USGS • GDACS • NDMA)</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={handleReset}
                title="Clear conversation"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Channel Selector Bar */}
          <div
            style={{
              padding: '0.4rem 0.85rem',
              background: '#040711',
              borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem'
            }}
          >
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Simulation Channel:</span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: channel === 'whatsapp' ? '1px solid #10b981' : '1px solid transparent',
                  background: channel === 'whatsapp' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: channel === 'whatsapp' ? '#34d399' : 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.7rem'
                }}
              >
                WhatsApp (Formatted)
              </button>
              <button
                type="button"
                onClick={() => setChannel('sms')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: channel === 'sms' ? '1px solid #38bdf8' : '1px solid transparent',
                  background: channel === 'sms' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: channel === 'sms' ? '#38bdf8' : 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.7rem'
                }}
              >
                SMS (Low-Bandwidth)
              </button>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div
            style={{
              padding: '0.45rem 0.75rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.05))',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              display: 'flex',
              gap: '0.4rem'
            }}
          >
            {SAMPLE_VIRAL_RUMORS.map((rumor, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(rumor.text)}
                disabled={isLoading}
                style={{
                  padding: '3px 8px',
                  borderRadius: '999px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  color: 'var(--text-secondary, #cbd5e1)',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {rumor.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div
            style={{
              flex: 1,
              padding: '0.85rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              background: '#070d19'
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                <div
                  style={{
                    maxWidth: '92%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background:
                      msg.sender === 'user'
                        ? '#056162'
                        : '#111c30',
                    border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#f8fafc',
                    fontSize: '0.77rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: msg.channel === 'sms' && msg.sender === 'bot' ? 'var(--font-mono, monospace)' : 'inherit',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                  }}
                >
                  {msg.text}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    marginTop: '3px',
                    fontSize: '0.62rem',
                    color: '#64748b',
                    padding: '0 4px'
                  }}
                >
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'bot' && (
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.text, idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedIndex === idx ? '#34d399' : '#64748b',
                        cursor: 'pointer',
                        padding: '0 2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                      title="Copy response"
                    >
                      {copiedIndex === idx ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 0.85rem',
                  background: '#111c30',
                  borderRadius: '12px 12px 12px 2px',
                  maxWidth: '85%',
                  fontSize: '0.74rem',
                  color: '#94a3b8'
                }}
              >
                <Sparkles size={14} style={{ color: '#38bdf8', animation: 'spin 2s linear infinite' }} />
                <span>Checking official USGS, GDACS & NDMA bulletins...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '0.65rem 0.85rem',
              background: '#0b1320',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={channel === 'whatsapp' ? 'Paste WhatsApp forward to check...' : 'Type disaster alert to verify...'}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '0.55rem 0.8rem',
                borderRadius: '8px',
                background: '#040711',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#f8fafc',
                fontSize: '0.78rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: inputMessage.trim() ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                color: inputMessage.trim() ? '#ffffff' : '#64748b',
                border: 'none',
                cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease'
              }}
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default CitizenBotSimulator;
