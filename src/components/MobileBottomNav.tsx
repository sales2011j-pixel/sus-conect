import React from 'react';
import { Home, Stethoscope, CalendarPlus, Bot, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface MobileBottomNavProps {
  currentView: 'home' | 'citizen' | 'admin';
  activeCitizenTab?: string;
  onNavigate: (view: 'home' | 'citizen' | 'admin') => void;
  onOpenBooking: () => void;
  onOpenAna: () => void;
  onOpenSpecialties: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenBooking,
  onOpenAna,
  onOpenSpecialties,
}) => {
  const { user, isAuthenticated } = useAuth();

  const isAdmin = user?.role === 'admin';

  return (
    <nav
      aria-label="Navegação inferior mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-safe"
    >
      <div className="grid grid-cols-5 items-center h-16 px-1">
        {/* 1. Início */}
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-colors cursor-pointer ${
            currentView === 'home'
              ? 'text-[#1E6FB8] font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" strokeWidth={currentView === 'home' ? 2.4 : 1.8} />
          <span className="text-[10px] tracking-tight leading-none">Início</span>
        </button>

        {/* 2. Áreas de Atendimento */}
        <button
          onClick={onOpenSpecialties}
          className="flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer"
        >
          <Stethoscope className="w-5 h-5 mb-0.5" strokeWidth={1.8} />
          <span className="text-[10px] tracking-tight leading-none">12 Áreas</span>
        </button>

        {/* 3. Agendar (Destaque Central) */}
        <button
          onClick={onOpenBooking}
          className="flex flex-col items-center justify-center -mt-4 transition-transform active:scale-95 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#1E6FB8] to-[#00A884] text-white flex items-center justify-center shadow-md shadow-[#1E6FB8]/30 border-2 border-white">
            <CalendarPlus className="w-6 h-6 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-[10px] font-bold text-[#1E6FB8] tracking-tight mt-1 leading-none">
            Agendar
          </span>
        </button>

        {/* 4. SUS ANA (Chat IA) */}
        <button
          onClick={onOpenAna}
          className="flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] text-slate-500 hover:text-emerald-700 font-medium transition-colors cursor-pointer relative"
        >
          <div className="relative">
            <Bot className="w-5 h-5 mb-0.5 text-[#00A884]" strokeWidth={2.2} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white"></span>
          </div>
          <span className="text-[10px] tracking-tight leading-none text-[#00A884] font-bold">SUS ANA</span>
        </button>

        {/* 5. Painel / Perfil */}
        <button
          onClick={() => {
            if (isAdmin) {
              onNavigate('admin');
            } else {
              onNavigate('citizen');
            }
          }}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-colors cursor-pointer ${
            currentView === 'citizen' || currentView === 'admin'
              ? 'text-[#1E6FB8] font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          {isAdmin ? (
            <Shield className="w-5 h-5 mb-0.5 text-indigo-600" strokeWidth={2.2} />
          ) : (
            <User className="w-5 h-5 mb-0.5" strokeWidth={currentView === 'citizen' ? 2.4 : 1.8} />
          )}
          <span className="text-[10px] tracking-tight leading-none">
            {isAdmin ? 'Coordenação' : isAuthenticated ? 'Consultas' : 'Entrar'}
          </span>
        </button>
      </div>
    </nav>
  );
};
