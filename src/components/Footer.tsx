import React from 'react';
import { Activity, PhoneCall, AlertTriangle, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-14 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Col 1: Identity & Purpose */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E6FB8] to-[#00A884] flex items-center justify-center text-white">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                SUS <span className="text-[#00A884]">CONECT</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plataforma acadêmica de orientação em saúde, acolhimento digital e solicitação de teleconsultas virtuais, desenvolvida no âmbito da Formação Geração Tech 4.0.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Privacidade simplificada · Sem coleta de dados sensíveis</span>
            </div>
          </div>

          {/* Col 2: Serviços & Áreas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Áreas de Atendimento
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Clínica Geral & Acolhimento Primário</li>
              <li>Cardiologia & Saúde Vascular</li>
              <li>Psicologia & Apoio Emocional (Profissional)</li>
              <li>Ortopedia & Oftalmologia</li>
              <li>Ginecologia & Dermatologia</li>
              <li>Endocrinologia, Neurologia, Otorrino, Uro & Gastro</li>
            </ul>
          </div>

          {/* Col 3: Diretrizes de Emergência */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Em caso de Emergência</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              O SUS CONECT é voltado para orientações eletivas e preventivas. Se houver dor súbita no peito, falta de ar severa, desmaios ou acidentes graves:
            </p>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2.5">
              <PhoneCall className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">Ligue 192 (SAMU)</span>
                <span className="text-[11px] text-amber-300">Atendimento móvel de urgência gratuito 24h</span>
              </div>
            </div>
          </div>

          {/* Col 4: Aviso Acadêmico e Tecnologias */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Informações Acadêmicas
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Desenvolvido com Google AI Studio, Supabase/SQLite persistence, n8n automações e Gemini 3.8 Flash para o agente SUS ANA.
            </p>
            <div className="p-3 rounded-lg bg-slate-800 text-[11px] text-slate-300 border border-slate-700 leading-snug">
              <strong className="text-white block mb-0.5">Nota da Banca Examinadora:</strong>
              Todos os 90 profissionais e documentos são dados demonstrativos fictícios. Não possui vínculo com órgãos governamentais.
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 SUS CONECT · Projeto de Inovação em Saúde Digital · Formação Geração Tech 4.0</p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Desenvolvido com</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            <span>para humanização da saúde pública</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
