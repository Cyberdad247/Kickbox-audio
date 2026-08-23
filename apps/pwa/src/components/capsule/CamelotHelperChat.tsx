'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { speak } from '../../lib/voice';

export interface GuideTopic {
  id: string;
  title: string;
  icon: string;
  kidFriendlyExplanation: string;
  realWorldAnalogy: string;
  tryItPrompt: string;
  quickQuestions: string[];
}

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: 'round-table',
    title: 'What is Camelot-OS?',
    icon: '🏰',
    kidFriendlyExplanation:
      'Imagine you own a high-tech castle where you are the boss (the Sovereign). Instead of regular computer programs that can spy on you or break things, you have robot helpers (Knights) who work for you safely inside their own little rooms!',
    realWorldAnalogy:
      '🎮 Think of it like a Minecraft base where you have personal golems guarding your chests and building stuff only when you tell them to.',
    tryItPrompt: 'How do I start using my castle?',
    quickQuestions: [
      'Who is the Sovereign?',
      'Why is it safer than other apps?',
      'What can I build here?',
    ],
  },
  {
    id: 'avatar-knight',
    title: 'Your Avatar Knight',
    icon: '⚔️',
    kidFriendlyExplanation:
      'Your Avatar Knight is your personal guide and buddy! You can dress them up with cool neon armor, pick their sigil (like a Dragon or Sword), and give them voice commands. They listen to you and help you run things.',
    realWorldAnalogy:
      '🦸 Like choosing your custom superhero costume in a game and giving them special voice powers!',
    tryItPrompt: 'Tell me how to customize my Knight armor',
    quickQuestions: [
      'How do I change my Knight’s color?',
      'Can my Knight talk back to me?',
      'What do the different Knights do?',
    ],
  },
  {
    id: 'cartridges-pills',
    title: 'Cartridges & Ecosystem Pills',
    icon: '💾',
    kidFriendlyExplanation:
      'Cartridges and Pills are like game cartridges for a Nintendo Switch. When you pop one into a slot on the Tactical Table, it gives your computer a new superpower—like checking your business stats, making music, or organizing notes!',
    realWorldAnalogy:
      '🕹️ Like snapping a Mario Kart cartridge into your console, but for super smart robot tools!',
    tryItPrompt: 'What happens when I slot a Pill?',
    quickQuestions: [
      'What is an Ecosystem Pill?',
      'Can a Pill break my computer?',
      'How many Pills can I use at once?',
    ],
  },
  {
    id: 'bifrost-voice',
    title: 'Voice & The Bifröst Bridge',
    icon: '🎙️',
    kidFriendlyExplanation:
      'The Bifröst is a super-fast magical audio bridge (like a high-tech walkie-talkie). When you push the mic button and talk, your words fly across the bridge so your Knight and helper apps can understand what you want in a split second.',
    realWorldAnalogy:
      '⚡ Like pressing the button on a walkie-talkie to talk to your best friend across the street instantly!',
    tryItPrompt: 'How do I talk to my Knight?',
    quickQuestions: [
      'How does Push-to-Talk work?',
      'What does the little radar mean?',
      'What if my internet goes down?',
    ],
  },
  {
    id: 'gideon-receipts',
    title: 'Gideon Receipts & Consent',
    icon: '📜',
    kidFriendlyExplanation:
      'Every time a robot helper wants to do something big, it prints a digital receipt with a secret stamp (Gideon Receipt). It asks for your permission first (Excalibur Consent), so nothing ever happens without you saying YES!',
    realWorldAnalogy:
      '🧾 Like getting a hall pass signed by your teacher so everyone knows you are allowed in the library.',
    tryItPrompt: 'Why do I have to give consent?',
    quickQuestions: [
      'What is a Gideon Receipt?',
      'What does the Excalibur button do?',
      'Why is consent important?',
    ],
  },
];

interface Position {
  x: number;
  y: number;
}

export function CamelotHelperChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<GuideTopic | null>(null);
  const [messages, setMessages] = useState<
    Array<{ sender: 'bot' | 'user'; text: string; time: string }>
  >([
    {
      sender: 'bot',
      text: '👋 Hey there, Sovereign! I am Merlin Jr., your friendly castle helper. You can drag me anywhere on screen! Click any topic below or ask me anything—I explain everything in simple, super-fun terms!',
      time: 'Just now',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Movable Position State
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
    pointerId?: number;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    hasMoved: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const getDimensions = useCallback(
    (openState: boolean, minState: boolean) => {
      if (!openState) {
        return { width: 56, height: 56 };
      }
      const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const w = Math.min(winWidth - 32, 380);
      const h = minState ? 64 : Math.min(typeof window !== 'undefined' ? window.innerHeight * 0.85 : 540, 540);
      return { width: w, height: h };
    },
    [],
  );

  const clampPosition = useCallback(
    (pos: Position, openState: boolean, minState: boolean): Position => {
      if (typeof window === 'undefined') return pos;
      const { width, height } = getDimensions(openState, minState);
      const minX = 12;
      const maxX = Math.max(minX, window.innerWidth - width - 12);
      const minY = 12;
      const maxY = Math.max(minY, window.innerHeight - height - 12);

      return {
        x: Math.min(Math.max(minX, pos.x), maxX),
        y: Math.min(Math.max(minY, pos.y), maxY),
      };
    },
    [getDimensions],
  );

  // Initialize position from localStorage or default to bottom-right
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem('koa.merlin_chat_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(clampPosition(parsed, isOpen, isMinimized));
          return;
        }
      }
    } catch {}

    const { width, height } = getDimensions(isOpen, isMinimized);
    const initialPos = {
      x: Math.max(16, window.innerWidth - width - 24),
      y: Math.max(16, window.innerHeight - height - 24),
    };
    setPosition(initialPos);
  }, [clampPosition, getDimensions, isOpen, isMinimized]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => (prev ? clampPosition(prev, isOpen, isMinimized) : null));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition, isOpen, isMinimized]);

  // Adjust clamped position when opening, closing, or minimizing
  useEffect(() => {
    setPosition((prev) => {
      if (!prev) return null;
      return clampPosition(prev, isOpen, isMinimized);
    });
  }, [isOpen, isMinimized, clampPosition]);

  // Window-level mouse move and mouse up listeners for smooth, fast dragging
  useEffect(() => {
    if (!isDragging) return;

    const onGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      if (!dragRef.current.hasMoved && Math.hypot(dx, dy) > 4) {
        dragRef.current.hasMoved = true;
      }

      if (dragRef.current.hasMoved) {
        const rawX = dragRef.current.initialX + dx;
        const rawY = dragRef.current.initialY + dy;
        const clamped = clampPosition({ x: rawX, y: rawY }, isOpen, isMinimized);
        setPosition(clamped);
      }
    };

    const onGlobalMouseUp = () => {
      setIsDragging(false);
      if (dragRef.current.hasMoved) {
        setPosition((currentPos) => {
          if (currentPos) {
            try {
              localStorage.setItem('koa.merlin_chat_pos', JSON.stringify(currentPos));
            } catch {}
          }
          return currentPos;
        });
      }
    };

    window.addEventListener('mousemove', onGlobalMouseMove, { passive: true });
    window.addEventListener('mouseup', onGlobalMouseUp);
    window.addEventListener('pointermove', onGlobalMouseMove as any, { passive: true });
    window.addEventListener('pointerup', onGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
      window.removeEventListener('pointermove', onGlobalMouseMove as any);
      window.removeEventListener('pointerup', onGlobalMouseUp);
    };
  }, [isDragging, clampPosition, isOpen, isMinimized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Reset to default bottom-right position
  const handleResetPosition = () => {
    if (typeof window === 'undefined') return;
    const { width, height } = getDimensions(isOpen, isMinimized);
    const defaultPos = {
      x: Math.max(16, window.innerWidth - width - 24),
      y: Math.max(16, window.innerHeight - height - 24),
    };
    setPosition(defaultPos);
    try {
      localStorage.setItem('koa.merlin_chat_pos', JSON.stringify(defaultPos));
    } catch {}
  };

  // Generic Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with main button (left click / touch)
    if (e.button !== 0) return;

    const currentX = position?.x ?? (window.innerWidth - 56 - 24);
    const currentY = position?.y ?? (window.innerHeight - 56 - 24);

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
      hasMoved: false,
      pointerId: e.pointerId,
    };

    setIsDragging(true);
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (!dragRef.current.hasMoved && Math.hypot(dx, dy) > 4) {
      dragRef.current.hasMoved = true;
    }

    if (dragRef.current.hasMoved) {
      const rawX = dragRef.current.initialX + dx;
      const rawY = dragRef.current.initialY + dy;
      const clamped = clampPosition({ x: rawX, y: rawY }, isOpen, isMinimized);
      setPosition(clamped);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}

    if (dragRef.current.hasMoved && position) {
      try {
        localStorage.setItem('koa.merlin_chat_pos', JSON.stringify(position));
      } catch {}
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsgs = [...messages, { sender: 'user' as const, text: query, time: timeStr }];
    setMessages(newMsgs);
    setInputVal('');
    setIsThinking(true);

    // Simple Kid-Friendly Knowledge Engine
    setTimeout(() => {
      let reply = '';
      const lower = query.toLowerCase();

      if (lower.includes('sovereign') || lower.includes('boss') || lower.includes('who am i')) {
        reply =
          '👑 You are the Sovereign! That means you are the ruler of this entire digital castle. No robot or computer program can do anything without your permission!';
      } else if (lower.includes('knight') || lower.includes('avatar') || lower.includes('armor')) {
        reply =
          '⚔️ Your Avatar Knight is like your superhero helper! You can click "Knight Profile" or "The Armory" to change their armor, pick a Dragon or Sword sigil, and pick glowing neon colors!';
      } else if (lower.includes('pill') || lower.includes('cartridge') || lower.includes('game')) {
        reply =
          '💾 Pills and Cartridges are like mini game discs with superpowers. You drag and drop them into the Tactical Table to give your castle new abilities (like tracking tasks or smart chatting)!';
      } else if (
        lower.includes('talk') ||
        lower.includes('voice') ||
        lower.includes('mic') ||
        lower.includes('bifrost')
      ) {
        reply =
          '🎙️ Just tap the microphone icon (Push-to-Talk) on the Avatar HUD or at the bottom bar. Say something like "Status report" and your Knight will listen and answer!';
      } else if (
        lower.includes('receipt') ||
        lower.includes('gideon') ||
        lower.includes('consent') ||
        lower.includes('excalibur')
      ) {
        reply =
          '📜 A Gideon Receipt is like a signed digital hall pass. It proves that what the computer did was 100% safe and approved by you!';
      } else if (
        lower.includes('offline') ||
        lower.includes('internet') ||
        lower.includes('radar')
      ) {
        reply =
          '🛡️ Even if your Wi-Fi stops working, Camelot-OS saves all your stuff safely right inside your browser! The spinning radar searches for your bridge until it connects again.';
      } else if (lower.includes('move') || lower.includes('drag') || lower.includes('position')) {
        reply =
          '🧭 You can drag me anywhere! Grab my glowing header (or my floating bubble) to reposition me wherever is most comfortable for your workflow.';
      } else if (lower.includes('start') || lower.includes('how do i') || lower.includes('help')) {
        reply =
          '🚀 Easy 3-step start: 1) Pick your Knight avatar in the Armory. 2) Tap the microphone to say hello. 3) Slot an Ecosystem Pill in the Tactical Table to activate your workspace!';
      } else {
        reply = `✨ Great question! In simple words: Camelot-OS is a private, super-safe digital playground where your data stays 100% yours. You command friendly robot Knights with your voice, slot smart Pills like game cartridges, and approve every action with your Excalibur consent!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsThinking(false);

      if (speechEnabled) {
        speak(reply.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, ''));
      }
    }, 600);
  };

  const handleSelectTopic = (topic: GuideTopic) => {
    setSelectedTopic(topic);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedExplanation = `🏰 **${topic.title}**\n\n${topic.kidFriendlyExplanation}\n\n💡 *Analogy*: ${topic.realWorldAnalogy}`;

    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: `Explain: ${topic.title}`, time: timeStr },
      { sender: 'bot', text: formattedExplanation, time: timeStr },
    ]);

    if (speechEnabled) {
      speak(`${topic.title}. ${topic.kidFriendlyExplanation}`);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
        right: position ? undefined : '24px',
        bottom: position ? undefined : '24px',
      }}
      className={`fixed z-50 select-none touch-none ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
    >
      {/* ── FLOATING HELPER BUBBLE (COLLAPSED & MOVABLE) ── */}
      {!isOpen && (
        <div className="relative group">
          {/* Notification Glow & Tooltip */}
          {hasUnread && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#00F0FF] text-[9px] font-bold text-black items-center justify-center">
                !
              </span>
            </span>
          )}

          <button
            type="button"
            id="camelot-helper-bubble-btn"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => {
              handlePointerUp(e);
              if (!dragRef.current.hasMoved) {
                setIsOpen(true);
                setHasUnread(false);
              }
            }}
            onPointerCancel={handlePointerUp}
            className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#00F0FF] bg-gradient-to-tr from-[#0F0C20] via-[#1E1435] to-[#0A0A14] text-2xl text-white backdrop-blur-xl transition-transform duration-200 active:scale-95 cursor-grab ${
              isDragging
                ? 'cursor-grabbing scale-110 shadow-[0_0_40px_rgba(0,240,255,0.7)] border-[#FFD700]'
                : 'shadow-[0_0_30px_rgba(0,240,255,0.4)] hover:scale-110 hover:border-[#FFD700] hover:shadow-[0_0_35px_rgba(255,215,0,0.5)]'
            }`}
            aria-label="Drag or Tap to Open Merlin Jr. Helper Chatbot"
            title="Drag anywhere or tap to open Merlin Jr."
          >
            <span className="animate-bounce text-2xl pointer-events-none">🧙‍♂️</span>
          </button>

          {/* Hover Hint Bubble */}
          <div className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap rounded-xl border border-[#00F0FF]/30 bg-black/90 px-3 py-1.5 font-mono text-xs text-white shadow-lg backdrop-blur-md">
            <span>✨ Drag anywhere or tap for Merlin Jr. Guide!</span>
          </div>
        </div>
      )}

      {/* ── OPEN HELPER CHAT WINDOW (MOVABLE VIA HEADER) ── */}
      {isOpen && (
        <div
          id="camelot-helper-chat-panel"
          className={`flex flex-col overflow-hidden rounded-3xl border-2 border-[#00F0FF]/60 bg-[#0A0A16]/95 text-white shadow-[0_0_50px_rgba(0,240,255,0.3)] backdrop-blur-2xl transition-all duration-200 ${
            isMinimized ? 'h-16 w-80' : 'h-[540px] w-[340px] sm:w-[380px] max-h-[85vh]'
          } ${isDragging ? 'shadow-[0_0_60px_rgba(255,215,0,0.4)] border-[#FFD700]' : ''}`}
        >
          {/* Draggable Header */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={handleResetPosition}
            title="Drag to move Merlin Jr. (Double-click to reset position)"
            className={`flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#180F30] via-[#0E1528] to-[#0A0A14] px-3.5 py-2.5 cursor-grab select-none ${
              isDragging ? 'cursor-grabbing bg-[#251648]' : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2 pointer-events-none">
              {/* Drag Handle Grip Icon */}
              <span className="text-white/40 text-xs font-mono tracking-tighter" title="Drag Handle">
                ⠿
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#FFD700] bg-black/60 text-lg shadow-[0_0_12px_rgba(255,215,0,0.3)]">
                🧙‍♂️
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white">
                    Merlin Jr. Helper
                  </h3>
                  <span className="rounded bg-emerald-400/20 px-1 py-0.2 font-mono text-[7px] font-bold text-emerald-300">
                    MOVABLE
                  </span>
                </div>
                <p className="font-mono text-[8.5px] text-[#00F0FF]">
                  Drag to move • Simple Castle Guide
                </p>
              </div>
            </div>

            {/* Window Controls (Stop Propagation so clicks do not trigger drag) */}
            <div
              className="flex items-center gap-1 font-mono text-xs"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Reset Position Button */}
              <button
                type="button"
                onClick={handleResetPosition}
                title="Reset to bottom-right corner"
                className="rounded-lg p-1.5 bg-white/5 text-white/50 hover:text-[#00F0FF] hover:bg-white/10 transition-all text-[11px]"
              >
                ⌖
              </button>

              {/* Audio Read-Aloud Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !speechEnabled;
                  setSpeechEnabled(next);
                  speak(next ? 'Voice narration turned on!' : 'Voice narration muted.');
                }}
                title={speechEnabled ? 'Mute Voice' : 'Enable Voice Read-Aloud'}
                className={`rounded-lg p-1.5 transition-all text-xs ${
                  speechEnabled
                    ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]'
                    : 'bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                {speechEnabled ? '🔊' : '🔈'}
              </button>

              {/* Minimize Toggle */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded-lg bg-white/5 p-1.5 text-white/60 hover:bg-white/10 hover:text-white text-xs"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? '▢' : '—'}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-white/5 p-1.5 text-white/60 hover:bg-red-500/20 hover:text-red-400 text-xs"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* ── TOPIC ONBOARDING CHIPS (QUICK SHORTCUTS) ── */}
              <div className="border-b border-white/10 bg-black/40 px-3 py-2">
                <div className="mb-1 flex items-center justify-between font-mono text-[9px] text-white/50 uppercase tracking-wider">
                  <span>💡 Easy Topic Guides:</span>
                  <span className="text-[#00F0FF]">Tap to Learn</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {GUIDE_TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => handleSelectTopic(topic)}
                      className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] transition-all ${
                        selectedTopic?.id === topic.id
                          ? 'border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] font-bold'
                          : 'border-white/15 bg-white/5 text-white/70 hover:border-[#00F0FF] hover:text-white'
                      }`}
                    >
                      <span>{topic.icon}</span>
                      <span>{topic.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── CHAT MESSAGE STREAM ── */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                        msg.sender === 'user'
                          ? 'rounded-tr-sm bg-gradient-to-r from-[#00F0FF]/20 to-[#9D4EDD]/30 border border-[#00F0FF]/40 text-white font-medium shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                          : 'rounded-tl-sm bg-[#151028]/90 border border-white/15 text-white/90 shadow-md backdrop-blur-md whitespace-pre-wrap'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="mt-1 font-mono text-[8px] text-white/40 px-1">{msg.time}</span>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-center gap-2 text-white/60 font-mono text-xs">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00F0FF]/20 text-sm animate-spin">
                      ✨
                    </div>
                    <span>Merlin Jr. is preparing a simple explanation...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── QUICK SUGGESTION PILLS ── */}
              {selectedTopic && (
                <div className="border-t border-white/10 bg-[#0D091A] px-3 py-2">
                  <span className="font-mono text-[8px] text-white/50 uppercase tracking-wider block mb-1">
                    Ask about {selectedTopic.title}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedTopic.quickQuestions.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSendMessage(q)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[9px] text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-all text-left"
                      >
                        ❓ {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── INPUT PROMPT BAR ── */}
              <div className="border-t border-white/15 bg-black/70 p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Ask anything (e.g. 'What is a Pill?')..."
                    className="flex-1 rounded-xl border border-white/20 bg-[#120D22] px-3.5 py-2 font-mono text-xs text-white placeholder-white/40 focus:border-[#00F0FF] focus:outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#00F0FF] bg-[#00F0FF]/20 font-bold text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                  >
                    ➤
                  </button>
                </form>
                <div className="mt-1.5 flex items-center justify-between font-mono text-[8px] text-white/40">
                  <span>🔒 100% Local & Safe Knowledge</span>
                  <span>13-Year-Old Level Simplification</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

