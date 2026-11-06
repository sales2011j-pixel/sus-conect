import React from 'react';
import { ASSETS } from '../assets/assets.ts';
import { Specialty } from '../types/index.ts';
import { SpecialtiesGrid } from '../components/SpecialtiesGrid.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Calendar,
  Video,
  FileCheck,
  Shield,
  HeartHandshake,
  Bot,
  ArrowRight,
  Clock,
  Sparkles,
  PhoneCall,
  Check,
} from 'lucide-react';

interface HomeViewProps {
  specialties: Specialty[];
  onSelectSpecialty: (specialtyId: string) => void;
  onOpenAnaChat: () => void;
  onNavigateToBooking: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  specialties,
  onSelectSpecialty,
  onOpenAnaChat,
  onNavigateToBooking,
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();

  return (
    <div className="space-y-0">
      {/* 1. HERO SECTION */}
      <section className="relative bg-gradient-to-b from-[#E6F2FF]/60 via-white to-[#F5F7FA] pt-10 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Col: Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#1E6FB8] bg-white px-3 py-1.5 rounded-full border border-blue-200/60 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#00A884]"></span>
                <span>Inovação em Saúde Pública Digital</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-slate-500 font-medium">Geração Tech 4.0</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-black text-[#0D47A1] tracking-tight leading-[1.15]">
                Aproximando você dos cuidados de saúde com{' '}
                <span className="text-[#00A884]">acolhimento digital.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                O <strong>SUS CONECT</strong> simplifica o agendamento de teleconsultas, orientação preventiva e emissão de documentos demonstrativos com o apoio da assistente virtual <strong>SUS ANA</strong> e um corpo clínico de 90 profissionais credenciados.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  onClick={onNavigateToBooking}
                  className="px-6 py-3.5 bg-[#1E6FB8] hover:bg-[#0D47A1] text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2 group"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Solicitar Teleconsulta</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={onOpenAnaChat}
                  className="px-5 py-3.5 bg-white hover:bg-slate-50 text-[#00A884] hover:text-emerald-700 font-bold rounded-xl text-sm transition-all border border-emerald-200 shadow-2xs cursor-pointer flex items-center gap-2"
                >
                  <Bot className="w-4 h-4 text-[#00A884]" />
                  <span>Falar com a SUS ANA</span>
                </button>

                {!isAuthenticated && (
                  <button
                    onClick={() => openAuthModal('register')}
                    className="px-4 py-3.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Novo por aqui? Cadastre-se
                  </button>
                )}
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-2xl font-black text-slate-900 block tabular-nums">12</span>
                  <span className="text-xs text-slate-500 font-medium">Áreas de Atendimento</span>
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-900 block tabular-nums">90</span>
                  <span className="text-xs text-slate-500 font-medium">Profissionais na Rede</span>
                </div>
                <div>
                  <span className="text-2xl font-black text-[#00A884] block tabular-nums">100%</span>
                  <span className="text-xs text-slate-500 font-medium">Acesso Gratuito</span>
                </div>
              </div>
            </div>

            {/* Right Col: High-Impact Photography Banner */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white group">
                <img
                  src={ASSETS.homepageBanner}
                  alt="Acolhimento humanizado em saúde pública"
                  referrerPolicy="no-referrer"
                  className="w-full h-[440px] object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-6 text-white">
                  <div className="flex items-center gap-2 mb-1.5">
                    <HeartHandshake className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs uppercase font-bold tracking-wider text-emerald-300">
                      Saúde Pública e Humanização
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white/95 leading-snug">
                    "A tecnologia a serviço de quem mais precisa: orientação rápida e acesso digno à saúde."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. COMO FUNCIONA A TELECONSULTA */}
      <section id="como-funciona" className="py-20 bg-white border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-[#1E6FB8] uppercase tracking-wider block mb-2">
              Passo a Passo Simples
            </span>
            <h2 className="text-3xl font-extrabold text-[#0D47A1] tracking-tight">
              Como funciona o atendimento virtual no SUS CONECT
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Três etapas intuitivas para você receber orientação sem enfrentar filas ou deslocamentos desnecessários.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-7 rounded-2xl bg-[#F5F7FA] border border-slate-200/80 hover:border-[#1E6FB8]/30 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#E6F2FF] text-[#1E6FB8] flex items-center justify-center font-black text-lg mb-6 shadow-2xs">
                  01
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Escolha a Área e o Profissional
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Navegue pelas 12 áreas disponíveis, confira os horários dos 90 profissionais credenciados e escolha o melhor dia e turno para você.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center gap-2 text-xs font-semibold text-[#1E6FB8]">
                <Check className="w-4 h-4 text-[#00A884]" />
                <span>Escolha livre do especialista</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-7 rounded-2xl bg-[#F5F7FA] border border-slate-200/80 hover:border-[#1E6FB8]/30 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#E6F2FF] text-[#1E6FB8] flex items-center justify-center font-black text-lg mb-6 shadow-2xs">
                  02
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Confirmação & Sala Virtual Segura
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sua solicitação é confirmada no sistema e notificada à coordenação. Na hora agendada, basta clicar em "Entrar na Sala Virtual" direto pelo navegador.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center gap-2 text-xs font-semibold text-[#1E6FB8]">
                <Video className="w-4 h-4 text-[#00A884]" />
                <span>Vídeo e áudio criptografados</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-7 rounded-2xl bg-[#F5F7FA] border border-slate-200/80 hover:border-[#1E6FB8]/30 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#E6F2FF] text-[#1E6FB8] flex items-center justify-center font-black text-lg mb-6 shadow-2xs">
                  03
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Atestados & Receitas Demonstrativas
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ao concluir a consulta, seus documentos demonstrativos ficam arquivados com número de autenticação para você baixar e imprimir quando quiser.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center gap-2 text-xs font-semibold text-[#1E6FB8]">
                <FileCheck className="w-4 h-4 text-[#00A884]" />
                <span>Download imediato em PDF</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. GRID DAS 12 ÁREAS DE ATENDIMENTO */}
      <SpecialtiesGrid specialties={specialties} onSelectSpecialty={onSelectSpecialty} />

      {/* 4. SEÇÃO SUS ANA COM APRESENTAÇÃO */}
      <section className="py-20 bg-gradient-to-br from-[#0D47A1] to-[#1E6FB8] text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Avatar Column */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative">
                <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl relative">
                  <img
                    src={ASSETS.susAnaAvatar}
                    alt="SUS ANA"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white text-slate-900 px-4 py-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold">Assistente com IA Gemini</span>
                </div>
              </div>
            </div>

            {/* Info Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider bg-white/10 px-3 py-1 rounded-full">
                <span>Atendimento Virtual 24 Horas</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Conheça a SUS ANA, sua assistente para tirar dúvidas e agendar consultas.
              </h2>

              <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                A SUS ANA foi desenvolvida para acolher o cidadão com empatia, orientar sobre quais especialidades procurar de acordo com sintomas cotidianos e explicar passo a passo a utilização da plataforma digital.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-white/10 p-3.5 rounded-xl backdrop-blur-xs border border-white/10">
                  <strong className="text-white block font-bold mb-1">Acolhimento e Triagem:</strong>
                  <span className="text-blue-100">Orientação inicial para escolher entre as 12 especialidades de saúde.</span>
                </div>
                <div className="bg-white/10 p-3.5 rounded-xl backdrop-blur-xs border border-white/10">
                  <strong className="text-white block font-bold mb-1">Alerta de Emergência:</strong>
                  <span className="text-blue-100">Identificação de queixas críticas para encaminhamento imediato ao SAMU 192.</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onOpenAnaChat}
                  className="px-6 py-3.5 bg-white text-[#0D47A1] hover:bg-blue-50 font-black rounded-xl text-sm transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
                >
                  <Bot className="w-4 h-4 text-[#00A884]" />
                  <span>Iniciar Conversa com SUS ANA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRIVACIDADE E HUMANIZAÇÃO */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-50 rounded-3xl p-8 sm:p-12 border border-slate-200/80">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1E6FB8] flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    Sem Burocracia no Cadastro
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Você não precisa digitar CPF, número do Cartão SUS ou comprovante de residência. Basta nome, e-mail e telefone para iniciar o atendimento.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#00A884] flex items-center justify-center shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    Saúde Mental Valorizada
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    A área de Psicologia é estruturada como atendimento profissional especializado para acolher ansiedade, estresse e fornecer suporte psicológico humanizado.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    Turnos Manhã, Tarde e Noite
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Com 90 profissionais credenciados, você encontra horários flexíveis que se adaptam à rotina de quem trabalha ou estuda.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. AVISO INSTITUCIONAL DO PROJETO ACADÊMICO */}
      <section id="projeto-academico" className="py-12 bg-[#F5F7FA] border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Formação Geração Tech 4.0</span>
            <span aria-hidden="true">·</span>
            <span>Projeto Acadêmico</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Sobre o Projeto SUS CONECT
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Este sistema é um projeto acadêmico independente concebido para demonstrar a viabilidade de uma plataforma integrada de teleorientação, inteligência artificial e agendamento de saúde pública. <strong>Não é uma plataforma oficial do SUS ou do Ministério da Saúde.</strong> Todos os dados de profissionais, pacientes e documentos são simulações demonstrativas para avaliação técnica da banca.
          </p>
        </div>
      </section>
    </div>
  );
};
