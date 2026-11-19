import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Activity, User as UserIcon, Shield, LogOut, Menu, X, Heart, PhoneCall } from 'lucide-react';

interface HeaderProps {
  currentView: 'home' | 'citizen' | 'admin';
  onNavigate: (view: 'home' | 'citizen' | 'admin') => void;
  onOpenAnaChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenAnaChat,
}) => {
  const { user, isAuthenticated, logout, openAuthModal, switchDemoUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: 'home' | 'citizen' | 'admin') => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Academic Banner - Compact on mobile */}
      <div className="bg-[#0D47A1] text-white text-[11px] sm:text-xs py-1 px-3 sm:px-4 text-center truncate">
        <span className="font-semibold">Geração Tech 4.0</span>
        <span className="mx-1.5 text-white/50">·</span>
        <span>Projeto Acadêmico Independente SUS CONECT</span>
        <span className="hidden sm:inline mx-1.5 text-white/50">·</span>
        <span className="hidden sm:inline text-emerald-300 font-semibold">Sem vínculo governamental oficial</span>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 sm:gap-8 h-14 sm:h-18">
          {/* Zone 1: Single text element wordmark with clean icon */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2 text-left group focus-visible:outline-hidden cursor-pointer shrink-0 min-h-[44px]"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#1E6FB8] to-[#0D47A1] flex items-center justify-center text-white shadow-xs group-hover:scale-102 transition-transform">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.4} />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl font-extrabold tracking-tight text-[#0D47A1] flex items-center gap-1 leading-tight">
                SUS <span className="text-[#00A884]">CONECT</span>
              </span>
              <span className="text-[9px] sm:text-[11px] font-medium text-slate-500 tracking-wider uppercase">
                Saúde Digital
              </span>
            </div>
          </button>

          {/* Zone 2: Desktop nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              onClick={() => handleNavClick('home')}
              className={`hover:text-[#1E6FB8] transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'home' ? 'text-[#1E6FB8] font-bold border-b-2 border-[#1E6FB8] py-1' : ''
              }`}
            >
              Início
            </button>
            <a
              href="#areas-atendimento"
              onClick={(e) => {
                if (currentView !== 'home') {
                  e.preventDefault();
                  handleNavClick('home');
                  setTimeout(() => {
                    document.getElementById('areas-atendimento')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }
              }}
              className="hover:text-[#1E6FB8] transition-colors whitespace-nowrap"
            >
              Áreas de Atendimento
            </a>
            <a
              href="#como-funciona"
              onClick={(e) => {
                if (currentView !== 'home') {
                  e.preventDefault();
                  handleNavClick('home');
                  setTimeout(() => {
                    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }
              }}
              className="hover:text-[#1E6FB8] transition-colors whitespace-nowrap"
            >
              Como Funciona
            </a>
            <button
              onClick={onOpenAnaChat}
              className="text-[#00A884] font-semibold hover:text-emerald-700 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <span>Assistente SUS ANA</span>
            </button>
            <a
              href="#projeto-academico"
              onClick={(e) => {
                if (currentView !== 'home') {
                  e.preventDefault();
                  handleNavClick('home');
                  setTimeout(() => {
                    document.getElementById('projeto-academico')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }
              }}
              className="hover:text-[#1E6FB8] transition-colors whitespace-nowrap text-slate-500"
            >
              Sobre o Projeto
            </a>
          </nav>

          {/* Zone 3: Actions & Mobile Triggers */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {user.role === 'admin' ? (
                  <button
                    onClick={() => handleNavClick(currentView === 'admin' ? 'home' : 'admin')}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200 min-h-[40px]"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{currentView === 'admin' ? 'Ver Início' : 'Coordenação'}</span>
                    <span className="sm:hidden font-bold">Admin</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleNavClick(currentView === 'citizen' ? 'home' : 'citizen')}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200 min-h-[40px]"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{currentView === 'citizen' ? 'Ver Início' : 'Meu Painel'}</span>
                    <span className="sm:hidden font-bold">Painel</span>
                  </button>
                )}

                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-36">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {user.role === 'admin' ? 'Administrador' : 'Cidadão'}
                  </span>
                </div>

                <button
                  onClick={logout}
                  title="Encerrar Sessão"
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 hover:text-[#1E6FB8] transition-colors whitespace-nowrap cursor-pointer min-h-[40px]"
                >
                  Entrar
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white bg-[#1E6FB8] hover:bg-[#0D47A1] rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs min-h-[40px]"
                >
                  Cadastrar
                </button>
              </div>
            )}

            {/* Quick Demo Switcher - Responsive on desktop/tablet */}
            <div className="hidden sm:flex items-center border-l border-slate-200 pl-2 gap-1 text-slate-400 text-xs">
              <button
                onClick={() => {
                  switchDemoUser('citizen');
                  handleNavClick('citizen');
                }}
                title="Acesso Rápido para a Banca: Cidadão Demo"
                className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                Demo Cidadão
              </button>
              <button
                onClick={() => {
                  switchDemoUser('admin');
                  handleNavClick('admin');
                }}
                title="Acesso Rápido para a Banca: Médico Demo (Agenda Diária)"
                className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer border border-emerald-200"
              >
                Demo Médico
              </button>
              <button
                onClick={() => {
                  switchDemoUser('admin');
                  handleNavClick('admin');
                }}
                title="Acesso Rápido para a Banca: Coordenação Demo"
                className="px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
              >
                Demo Admin
              </button>
            </div>

            {/* Mobile Drawer Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Abrir menu mobile"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu (Sliding down from top bar) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 shadow-xl px-4 py-4 space-y-4 animate-in slide-in-from-top-4 duration-200">
          {/* Quick Demo Switcher for Evaluation Committee on Mobile */}
          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#0D47A1]">Acesso Demo para a Banca:</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  switchDemoUser('citizen');
                  handleNavClick('citizen');
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-white text-[#1E6FB8] rounded-md border border-blue-200 shadow-2xs cursor-pointer"
              >
                Cidadão
              </button>
              <button
                onClick={() => {
                  switchDemoUser('admin');
                  handleNavClick('admin');
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-md shadow-2xs cursor-pointer"
              >
                Médico
              </button>
              <button
                onClick={() => {
                  switchDemoUser('admin');
                  handleNavClick('admin');
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 text-white rounded-md shadow-2xs cursor-pointer"
              >
                Admin
              </button>
            </div>
          </div>

          {/* Mobile Nav Links */}
          <div className="space-y-1 text-sm font-medium">
            <button
              onClick={() => handleNavClick('home')}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-100 text-slate-800 font-semibold cursor-pointer"
            >
              Início
            </button>
            <a
              href="#areas-atendimento"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-lg hover:bg-slate-100 text-slate-800 font-semibold"
            >
              12 Áreas de Atendimento
            </a>
            <a
              href="#como-funciona"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-lg hover:bg-slate-100 text-slate-800 font-semibold"
            >
              Como Funciona a Teleconsulta
            </a>
            <button
              onClick={() => {
                onOpenAnaChat();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2.5 px-3 rounded-lg bg-emerald-50 text-emerald-800 font-bold cursor-pointer flex items-center justify-between"
            >
              <span>Assistente SUS ANA (IA)</span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">Online</span>
            </button>
            <a
              href="#projeto-academico"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-lg hover:bg-slate-100 text-slate-500 text-xs"
            >
              Sobre o Projeto Acadêmico
            </a>
          </div>

          {/* Emergency SAMU Quick Call on Mobile */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div>
              <span className="font-bold block">Emergência Médica?</span>
              <span className="text-[10px] text-amber-700">Ligue imediatamente para o SAMU</span>
            </div>
            <a
              href="tel:192"
              className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg flex items-center gap-1 text-xs"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>192</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
