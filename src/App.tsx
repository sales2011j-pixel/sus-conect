import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { HomeView } from './views/HomeView.tsx';
import { CitizenPortal } from './views/CitizenPortal.tsx';
import { AdminPortal } from './views/AdminPortal.tsx';
import { SusAnaChat, SusAnaChatFloatingButton } from './components/SusAnaChat.tsx';
import { Specialty } from './types/index.ts';
import { api } from './services/api.ts';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'citizen' | 'admin'>('home');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [initialBookingSpecialtyId, setInitialBookingSpecialtyId] = useState<string | null>(null);
  const [isAnaFloatingOpen, setIsAnaFloatingOpen] = useState(false);

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const data = await api.getSpecialties();
        setSpecialties(data);
      } catch (err) {
        console.error('Falha ao carregar especialidades:', err);
      }
    };
    fetchSpecialties();
  }, []);

  const handleSelectSpecialtyFromHome = (specialtyId: string) => {
    setInitialBookingSpecialtyId(specialtyId);
    if (!isAuthenticated) {
      openAuthModal('login');
    } else {
      setCurrentView('citizen');
    }
  };

  const handleNavigateToBooking = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
    } else {
      setCurrentView('citizen');
    }
  };

  // If user changes and is admin, stay on admin if chosen, or citizen
  const handleNavigate = (view: 'home' | 'citizen' | 'admin') => {
    if (view === 'admin' && user?.role !== 'admin') {
      alert('Acesso restrito à Coordenação Geral (Administrador). Utilize o botão "Demo Admin" no menu para demonstração acadêmica.');
      return;
    }
    if (view === 'citizen' && !isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-slate-800">
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAnaChat={() => setIsAnaFloatingOpen(true)}
      />

      <main className="flex-1">
        {currentView === 'home' && (
          <HomeView
            specialties={specialties}
            onSelectSpecialty={handleSelectSpecialtyFromHome}
            onOpenAnaChat={() => setIsAnaFloatingOpen(true)}
            onNavigateToBooking={handleNavigateToBooking}
          />
        )}

        {currentView === 'citizen' && (
          <CitizenPortal
            specialties={specialties}
            initialSpecialtyId={initialBookingSpecialtyId}
          />
        )}

        {currentView === 'admin' && (
          <AdminPortal specialties={specialties} />
        )}
      </main>

      <Footer />

      {/* Authentication Modal */}
      <AuthModal />

      {/* Floating AI Assistant SUS ANA */}
      <SusAnaChatFloatingButton
        isOpen={isAnaFloatingOpen}
        onClick={() => setIsAnaFloatingOpen(true)}
      />

      <SusAnaChat
        isFloating={true}
        isOpen={isAnaFloatingOpen}
        onClose={() => setIsAnaFloatingOpen(false)}
        onNavigateToBooking={() => {
          setIsAnaFloatingOpen(false);
          handleNavigateToBooking();
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
