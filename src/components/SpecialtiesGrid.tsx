import React from 'react';
import { Specialty } from '../types/index.ts';
import {
  Stethoscope,
  HeartPulse,
  Bone,
  Eye,
  Sparkles,
  Activity,
  Scale,
  Brain,
  Ear,
  ShieldCheck,
  Layers,
  Smile,
  ArrowRight,
  Users,
} from 'lucide-react';

interface SpecialtiesGridProps {
  specialties: Specialty[];
  onSelectSpecialty: (specialtyId: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Stethoscope: <Stethoscope className="w-5 h-5" />,
  HeartPulse: <HeartPulse className="w-5 h-5" />,
  Bone: <Bone className="w-5 h-5" />,
  Eye: <Eye className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  Activity: <Activity className="w-5 h-5" />,
  Scale: <Scale className="w-5 h-5" />,
  Brain: <Brain className="w-5 h-5" />,
  Ear: <Ear className="w-5 h-5" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />,
  Smile: <Smile className="w-5 h-5" />,
};

export const SpecialtiesGrid: React.FC<SpecialtiesGridProps> = ({ specialties, onSelectSpecialty }) => {
  return (
    <section id="areas-atendimento" className="py-16 bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#1E6FB8] uppercase tracking-wider mb-2">
            <span>Cuidados Especializados</span>
            <span aria-hidden="true">·</span>
            <span>12 Áreas Estruturadas</span>
          </div>
          <h2 className="text-3xl font-extrabold text-[#0D47A1] tracking-tight sm:text-4xl">
            Áreas de Atendimento e Teleorientação
          </h2>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Selecione uma das 12 áreas disponíveis para conhecer o corpo clínico com 90 profissionais credenciados e solicitar sua teleconsulta virtual gratuita.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {specialties.map((spec) => {
            const isMentalHealth = spec.category === 'atendimento_profissional';
            const icon = iconMap[spec.iconName] || <Activity className="w-5 h-5" />;

            return (
              <div
                key={spec.id}
                className={`bg-white rounded-2xl p-6 border transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                  isMentalHealth
                    ? 'border-emerald-300 ring-1 ring-emerald-100 hover:border-emerald-400'
                    : 'border-slate-200 hover:border-[#1E6FB8]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        isMentalHealth
                          ? 'bg-emerald-50 text-[#00A884]'
                          : 'bg-[#E6F2FF] text-[#1E6FB8]'
                      }`}
                    >
                      {icon}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="tabular-nums font-semibold">{spec.professionalCount}</span>
                      <span>profissionais</span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1E6FB8] transition-colors">
                      {spec.name}
                    </h3>
                    {isMentalHealth && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm inline-block mt-1">
                        Área de Atendimento Profissional
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-6">
                    {spec.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Teleconsulta Virtual
                  </span>
                  <button
                    onClick={() => onSelectSpecialty(spec.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E6FB8] hover:text-[#0D47A1] transition-colors cursor-pointer group"
                  >
                    <span>Solicitar</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
