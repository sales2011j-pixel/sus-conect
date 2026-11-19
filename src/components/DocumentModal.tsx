import React from 'react';
import { DemonstrativeDocument } from '../types/index.ts';
import { X, Printer, ShieldCheck, Activity, QrCode } from 'lucide-react';

interface DocumentModalProps {
  document: DemonstrativeDocument | null;
  onClose: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ document, onClose }) => {
  if (!document) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden relative animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Action Bar */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-semibold text-emerald-400 tracking-wider">
              Documento Demonstrativo
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-mono text-slate-300">{document.documentNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50 flex justify-center">
          <div className="bg-white w-full max-w-xl p-8 rounded-xl shadow-xs border border-slate-200/80 relative text-slate-800 font-sans">
            {/* Watermark overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden opacity-[0.04]">
              <span className="text-7xl font-extrabold uppercase -rotate-25 tracking-widest text-slate-900 text-center leading-tight">
                Simulação Acadêmica<br />SUS CONECT
              </span>
            </div>

            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E6FB8] flex items-center justify-center text-white">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                    SUS CONECT
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Plataforma de Saúde Digital & Teleconsultas
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold">
                    Formação Geração Tech 4.0 — Simulação Acadêmica
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-900 block">
                  {document.documentNumber}
                </span>
                <span className="text-[11px] text-slate-500">
                  Data: {new Date(document.issuedDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6">
              <h3 className="text-xl font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 inline-block px-8">
                {document.title}
              </h3>
            </div>

            {/* Citizen identification */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 text-xs space-y-1 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Nome do Cidadão:</span>
                <span className="font-bold text-slate-900">{document.citizenName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Área de Atendimento:</span>
                <span className="font-semibold text-slate-800">{document.specialty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Profissional Emissor:</span>
                <span className="font-semibold text-slate-800">{document.doctorName}</span>
              </div>
            </div>

            {/* Main Document Body */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-700 min-h-36">
              {document.content.diagnosisOrSubject && (
                <div className="font-semibold text-slate-900 pb-1 border-b border-slate-100">
                  Assunto / Avaliação: <span className="font-normal">{document.content.diagnosisOrSubject}</span>
                </div>
              )}

              {document.content.items && document.content.items.length > 0 && (
                <div className="space-y-2 py-2">
                  <span className="font-bold text-slate-900 block text-xs">
                    {document.type === 'receita' ? 'Prescrição Posológica Recomendada:' : 'Itens Orientados:'}
                  </span>
                  <ul className="space-y-1.5 pl-4 list-disc text-slate-800">
                    {document.content.items.map((item, idx) => (
                      <li key={idx} className="leading-snug">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="whitespace-pre-line text-slate-700">
                {document.content.bodyText}
              </p>
            </div>

            {/* Signatures & Verification footer */}
            <div className="pt-8 mt-8 border-t border-slate-200 grid grid-cols-2 gap-4 items-end">
              <div className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <QrCode className="w-12 h-12 text-slate-800 p-1 bg-slate-100 rounded-md border border-slate-200" />
                  <div className="text-[10px] text-slate-500 leading-tight">
                    <span className="font-bold text-slate-800 block">Validação Digital</span>
                    <span>Hash: {Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
                    <span className="block text-emerald-600 font-semibold">Assinatura Certificada Demo</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="border-b border-slate-400 w-44 mx-auto mb-1"></div>
                <span className="text-xs font-bold text-slate-900 block">
                  {document.doctorName}
                </span>
                <span className="text-[10px] text-slate-500">
                  {document.specialty} · SUS CONECT
                </span>
              </div>
            </div>

            {/* Academic Notice Banner */}
            <div className="mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{document.content.demonstrativeNotice}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
