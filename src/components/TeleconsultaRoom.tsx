import React, { useState, useEffect, useRef } from 'react';
import { Appointment } from '../types/index.ts';
import { ASSETS } from '../assets/assets.ts';
import { api } from '../services/api.ts';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Clock,
  ShieldCheck,
  FileText,
  Send,
  MessageCircle,
} from 'lucide-react';

interface TeleconsultaRoomProps {
  appointment: Appointment;
  onClose: () => void;
  onCompleted?: () => void;
}

export const TeleconsultaRoom: React.FC<TeleconsultaRoomProps> = ({
  appointment,
  onClose,
  onCompleted,
}) => {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [seconds, setSeconds] = useState(128); // start at 02:08 into consultation
  const [activeTab, setActiveTab] = useState<'notes' | 'chat'>('notes');
  const [chatInput, setChatInput] = useState('');
  const [roomMessages, setRoomMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: appointment.professionalName,
      text: `Olá ${appointment.citizenName}! Seja bem-vindo(a) à nossa teleconsulta no SUS CONECT. Estou revisando seu histórico de sintomas.`,
      time: '02:00',
    },
    {
      sender: 'Você',
      text: `Olá Dr(a)., muito obrigado. Estou me sentindo melhor, mas queria checar as orientações.`,
      time: '02:04',
    },
  ]);
  const [completing, setCompleting] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Attempt local camera
    if (cameraOn && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          // Camera permission denied or not available; fallback to graphic
        });
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraOn]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg = {
      sender: 'Você',
      text: chatInput.trim(),
      time: formatTimer(seconds),
    };
    setRoomMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    // Doctor simulated quick reaction
    setTimeout(() => {
      setRoomMessages((prev) => [
        ...prev,
        {
          sender: appointment.professionalName,
          text: 'Compreendido. Vou registrar isso no prontuário e incluir nas orientações pós-consulta.',
          time: formatTimer(seconds + 4),
        },
      ]);
    }, 1500);
  };

  const handleFinishConsultation = async () => {
    if (!confirm('Deseja concluir esta teleconsulta e emitir a declaração de atendimento demonstrativa?')) {
      return;
    }
    setCompleting(true);
    try {
      // 1. Update appointment status to completed
      await api.updateAppointmentStatus(appointment.id, 'concluido', 'Teleconsulta realizada com êxito via sala digital.');

      // 2. Generate demonstrative medical certificate document
      await api.createDocument({
        citizenId: appointment.citizenId,
        citizenName: appointment.citizenName,
        title: `Declaração de Teleatendimento — ${appointment.specialtyName}`,
        type: 'atestado',
        issuedDate: new Date().toISOString().split('T')[0],
        doctorName: appointment.professionalName,
        specialty: appointment.specialtyName,
        content: {
          diagnosisOrSubject: `Atendimento de ${appointment.specialtyName}`,
          bodyText: `Atesto para fins acadêmicos e demonstrativos que ${appointment.citizenName} participou da teleconsulta virtual na data de hoje (${new Date().toLocaleDateString('pt-BR')}), recebendo orientações clínicas e plano de cuidado preventivo.`,
          demonstrativeNotice: 'Documento expedido via SUS CONECT para apresentação acadêmica na Formação Geração Tech 4.0.',
        },
      });

      if (onCompleted) onCompleted();
      onClose();
    } catch (e) {
      console.error(e);
      onClose();
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-white">
      {/* Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1E6FB8] flex items-center justify-center text-white">
            <VideoIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">
                Sala Virtual de Teleconsulta
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Transmissão Segura
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {appointment.professionalName} · {appointment.specialtyName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-[#00A884]" />
            <span className="font-mono tabular-nums">{formatTimer(seconds)}</span>
          </div>

          <button
            onClick={handleFinishConsultation}
            disabled={completing}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>{completing ? 'Finalizando...' : 'Encerrar Consulta'}</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video Canvas Area */}
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-4">
          {/* Main Professional Stream */}
          <div className="relative w-full h-full max-w-4xl max-h-[70vh] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
            <img
              src={ASSETS.teleconsultaIllustration}
              alt="Transmissão Teleconsulta"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {/* Overlay badge with doctor name */}
            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{appointment.professionalName} (Em atendimento)</span>
            </div>
          </div>

          {/* Citizen Self View Pip (Picture-in-Picture) */}
          <div className="absolute bottom-8 right-8 w-44 h-32 rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-2xl">
            {cameraOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 text-xs">
                <VideoOff className="w-5 h-5 mb-1" />
                <span>Câmera desativada</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-slate-950/70 px-2 py-0.5 rounded text-[10px] text-white">
              Você ({appointment.citizenName})
            </div>
          </div>

          {/* Bottom Call Controls Strip */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-slate-800 shadow-xl">
            <button
              onClick={() => setMicOn(!micOn)}
              className={`p-3 rounded-xl transition-colors cursor-pointer ${
                micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
              title={micOn ? 'Desativar microfone' : 'Ativar microfone'}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setCameraOn(!cameraOn)}
              className={`p-3 rounded-xl transition-colors cursor-pointer ${
                cameraOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
              title={cameraOn ? 'Desativar vídeo' : 'Ativar vídeo'}
            >
              {cameraOn ? <VideoIcon className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>

            <div className="h-6 w-px bg-slate-800 mx-1"></div>

            <button
              onClick={handleFinishConsultation}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Concluir</span>
            </button>
          </div>
        </div>

        {/* Right Sidebar: Notes & In-Call Chat */}
        <div className="w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-72 lg:h-full">
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'notes'
                  ? 'text-white border-b-2 border-[#1E6FB8] bg-slate-800/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Prontuário & Motivo</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'chat'
                  ? 'text-white border-b-2 border-[#1E6FB8] bg-slate-800/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Mensagens</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'notes' ? (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Motivo da Solicitação
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    {appointment.reason || 'Atendimento preventivo de rotina.'}
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Dados do Profissional
                  </span>
                  <p className="text-slate-200 font-medium">
                    {appointment.professionalName}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    {appointment.specialtyName} · Teleorientação Acolhedora
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    Ao encerrar o atendimento, uma Declaração de Comparecimento será gerada e ficará disponível em seus documentos.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {roomMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl text-xs ${
                        m.sender === 'Você'
                          ? 'bg-[#1E6FB8] text-white ml-6'
                          : 'bg-slate-800 text-slate-200 mr-6 border border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-white/70 mb-1">
                        <span className="font-semibold">{m.sender}</span>
                        <span>{m.time}</span>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="pt-3 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Escreva para o profissional..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#1E6FB8]"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-[#1E6FB8] text-white rounded-lg hover:bg-[#0D47A1] cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
