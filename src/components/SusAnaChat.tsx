import React, { useState, useRef, useEffect } from 'react';
import { ASSETS } from '../assets/assets.ts';
import { api } from '../services/api.ts';
import { ChatMessage } from '../types/index.ts';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertTriangle,
  X,
  MessageSquare,
} from 'lucide-react';

interface SusAnaChatProps {
  isFloating?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onNavigateToBooking?: () => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_welcome',
    sender: 'ana',
    text: 'Olá! Sou a SUS ANA, sua assistente virtual no SUS CONECT. Estou aqui para te acolher, explicar nossas 12 áreas de atendimento e te ajudar a solicitar uma teleconsulta com nossos 90 profissionais. Como posso te orientar hoje?',
    timestamp: 'Agora',
    suggestions: [
      'Como funciona a teleconsulta?',
      'Como agendar com um médico?',
      'Área de Psicologia e saúde mental',
      'Onde vejo minhas receitas e atestados?',
    ],
  },
];

export const SusAnaChat: React.FC<SusAnaChatProps> = ({
  isFloating = false,
  isOpen = true,
  onClose,
  onNavigateToBooking,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error', e);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const userText = (textToSend || input).trim();
    if (!userText || loading) return;

    const userMessage: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await api.sendChatMessage(userText, historyPayload);

      const anaMessage: ChatMessage = {
        id: 'ana_' + Date.now(),
        sender: 'ana',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        suggestions: res.suggestions,
      };

      setMessages((prev) => [...prev, anaMessage]);
      speakText(res.reply);
    } catch (err: any) {
      const fallbackMsg: ChatMessage = {
        id: 'err_' + Date.now(),
        sender: 'ana',
        text: 'Tive uma breve oscilação de conexão, mas você pode agendar sua teleconsulta diretamente pelo painel ou me fazer outra pergunta!',
        timestamp: 'Agora',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setMessages(INITIAL_MESSAGES);
  };

  if (isFloating && !isOpen) return null;

  const content = (
    <div className={`flex flex-col h-full bg-white ${isFloating ? 'rounded-2xl shadow-2xl border border-slate-200 overflow-hidden' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E6FB8] to-[#0D47A1] p-4 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={ASSETS.susAnaAvatar}
              alt="Enfermeira SUS ANA"
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm tracking-tight">SUS ANA</h3>
              <span className="text-[10px] font-semibold bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded-sm">
                IA Gemini 3.8
              </span>
            </div>
            <p className="text-[11px] text-blue-100">
              Orientação em Saúde & Acolhimento Humanizado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            title={voiceEnabled ? 'Desativar voz sintetizada' : 'Ativar voz sintetizada'}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={handleReset}
            title="Reiniciar conversa"
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {isFloating && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Emergency Notice */}
      <div className="bg-amber-50 border-b border-amber-200/80 px-3.5 py-2 text-[11px] text-amber-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Em caso de dor aguda no peito ou falta de ar grave, acione o SAMU 192.</span>
        </div>
        {onNavigateToBooking && (
          <button
            onClick={onNavigateToBooking}
            className="text-[11px] font-bold text-[#1E6FB8] hover:underline cursor-pointer ml-2 whitespace-nowrap"
          >
            Agendar Consulta
          </button>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 min-h-60 max-h-[460px]">
        {messages.map((msg) => {
          const isAna = msg.sender === 'ana';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAna ? 'items-start' : 'items-end'}`}
            >
              <div className="flex items-start gap-2 max-w-[85%]">
                {isAna && (
                  <div className="w-7 h-7 rounded-full bg-[#E6F2FF] text-[#1E6FB8] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div
                    className={`rounded-2xl p-3.5 text-xs leading-relaxed ${
                      isAna
                        ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/80 rounded-tl-xs'
                        : 'bg-[#1E6FB8] text-white shadow-2xs rounded-tr-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block px-1">
                    {msg.timestamp}
                  </span>
                </div>
                {!isAna && (
                  <div className="w-7 h-7 rounded-full bg-[#0D47A1] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Suggestions chips */}
              {isAna && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
                  {msg.suggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sug)}
                      className="text-[11px] font-medium bg-white text-slate-700 hover:text-[#1E6FB8] hover:border-[#1E6FB8] px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer text-left"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-2 ml-9">
            <Sparkles className="w-3.5 h-3.5 text-[#00A884] animate-spin" />
            <span className="text-slate-500 text-[11px]">SUS ANA está digitando sua orientação...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tire dúvidas sobre sintomas, teleconsultas ou áreas de saúde..."
          disabled={loading}
          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8] disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 bg-[#1E6FB8] hover:bg-[#0D47A1] text-white rounded-xl transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );

  if (isFloating) {
    return (
      <div className="fixed inset-x-2 bottom-20 sm:bottom-6 sm:right-6 sm:left-auto sm:w-96 z-50 h-[78vh] sm:h-[540px] max-h-[90vh]">
        {content}
      </div>
    );
  }

  return content;
};

export const SusAnaChatFloatingButton: React.FC<{ onClick: () => void; isOpen: boolean }> = ({
  onClick,
  isOpen,
}) => {
  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-30 flex items-center gap-2 sm:gap-2.5 bg-gradient-to-r from-[#1E6FB8] to-[#00A884] text-white px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-103 transition-all cursor-pointer group"
    >
      <div className="relative">
        <img
          src={ASSETS.susAnaAvatar}
          alt="SUS ANA"
          referrerPolicy="no-referrer"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-white"
        />
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full"></span>
      </div>
      <div className="text-left pr-1">
        <span className="text-xs font-bold block leading-tight">SUS ANA</span>
        <span className="text-[10px] text-white/90 hidden sm:inline">Orientação & Agendamento</span>
        <span className="text-[10px] text-emerald-200 sm:hidden">Online</span>
      </div>
      <MessageSquare className="w-4 h-4 text-white/90 group-hover:translate-x-0.5 transition-transform hidden sm:inline" />
    </button>
  );
};
