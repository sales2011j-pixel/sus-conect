import React, { useState, useEffect, useRef } from 'react';
import { Appointment } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  SwitchCamera,
  Clock,
  Calendar,
  ShieldCheck,
  CheckCircle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Volume2,
  AlertCircle,
  X,
} from 'lucide-react';

interface WaitingRoomProps {
  appointment: Appointment;
  onEnterCall: () => void;
  onClose: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  appointment,
  onEnterCall,
  onClose,
}) => {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [doctorStarted, setDoctorStarted] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Camera & Microphone for hardware diagnostic test
  const startPreview = async (facing: 'user' | 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraPermission('denied');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      streamRef.current = stream;
      setCameraPermission('granted');

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Audio Level Analyzer for real mic responsiveness test
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMeter = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
            }
            animFrameRef.current = requestAnimationFrame(updateMeter);
          };
          updateMeter();
        }
      } catch (audioErr) {
        console.warn('AudioContext não suportado para medição:', audioErr);
      }
    } catch (err: any) {
      console.warn('Permissão de mídia não concedida na sala de espera:', err);
      setCameraPermission('denied');
    }
  };

  useEffect(() => {
    if (cameraOn) {
      startPreview(facingMode);
    } else if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [cameraOn, facingMode]);

  // Handle Mute/Unmute audio track
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = micOn;
      });
    }
  }, [micOn]);

  // Poll consultation status to detect when doctor clicks "INICIAR CONSULTA"
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setCheckingSession(true);
        const session = await api.getTeleconsultaSession(appointment.id);
        if (session.status === 'em_andamento' || session.startedAt) {
          setDoctorStarted(true);
        }
      } catch (err) {
        // quiet fallback
      } finally {
        setCheckingSession(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2500);
    return () => clearInterval(interval);
  }, [appointment.id]);

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#1E6FB8] to-[#0D47A1] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Clock className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Sala de Espera Virtual
              </span>
              <h3 className="text-base font-black">Aguardando Início do Atendimento</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Status Alert Banner */}
          {doctorStarted ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-900 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-600 animate-ping"></div>
                <div>
                  <h4 className="text-xs font-bold">O médico iniciou sua consulta!</h4>
                  <p className="text-[11px] text-emerald-700">
                    O cronômetro de 10 minutos já está ativo. Entre na sala agora.
                  </p>
                </div>
              </div>
              <button
                onClick={onEnterCall}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <span>Entrar Agora</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-[#0D47A1] flex items-center gap-3">
              <RefreshCw className={`w-5 h-5 text-[#1E6FB8] shrink-0 ${checkingSession ? 'animate-spin' : ''}`} />
              <div className="text-xs">
                <span className="font-bold block">
                  Aguardando {appointment.professionalName} autorizar o início...
                </span>
                <span className="text-[11px] text-blue-700">
                  Respeite o horário agendado ({appointment.time}). Assim que o profissional iniciar a chamada, o botão de entrada ficará disponível instantaneamente.
                </span>
              </div>
            </div>
          )}

          {/* Appointment Information Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-[#1E6FB8] uppercase tracking-wider">
                {appointment.specialtyName}
              </span>
              <span className="font-mono text-slate-500 font-semibold">
                ID: {appointment.id}
              </span>
            </div>

            <h4 className="text-sm font-bold text-slate-900">
              Profissional: {appointment.professionalName}
            </h4>

            <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(appointment.date).toLocaleDateString('pt-BR')}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {appointment.time}
              </span>
            </div>

            <div className="text-[11px] text-slate-600 pt-1">
              <strong className="text-slate-800">Paciente:</strong> {appointment.citizenName}
            </div>
          </div>

          {/* Hardware Camera & Mic Test Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00A884]" />
                <span>Teste de Câmera e Microfone</span>
              </h5>
              <span className="text-[11px] text-slate-400">
                {cameraPermission === 'granted' ? 'Dispositivos detectados' : 'Aguardando autorização'}
              </span>
            </div>

            {/* Video preview container */}
            <div className="relative aspect-video rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
              {cameraPermission === 'granted' && cameraOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              ) : (
                <div className="text-center p-4 text-slate-400 space-y-2">
                  <VideoOff className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">
                    {cameraPermission === 'denied'
                      ? 'Permissão de câmera não concedida. Clique em "Tentar Novamente".'
                      : 'Câmera desativada no momento.'}
                  </p>
                  {cameraPermission === 'denied' && (
                    <button
                      onClick={() => startPreview(facingMode)}
                      className="px-3 py-1.5 bg-[#1E6FB8] text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Tentar Novamente
                    </button>
                  )}
                </div>
              )}

              {/* Hardware Toggles Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    onClick={() => setMicOn(!micOn)}
                    className={`p-2 rounded-xl backdrop-blur-md transition-colors cursor-pointer ${
                      micOn ? 'bg-slate-900/80 text-white hover:bg-slate-900' : 'bg-rose-600 text-white'
                    }`}
                    title={micOn ? 'Desativar Microfone' : 'Ativar Microfone'}
                  >
                    {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setCameraOn(!cameraOn)}
                    className={`p-2 rounded-xl backdrop-blur-md transition-colors cursor-pointer ${
                      cameraOn ? 'bg-slate-900/80 text-white hover:bg-slate-900' : 'bg-rose-600 text-white'
                    }`}
                    title={cameraOn ? 'Desligar Câmera' : 'Ligar Câmera'}
                  >
                    {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleToggleFacingMode}
                    className="p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-md transition-colors cursor-pointer"
                    title="Alternar Câmera (Frontal / Traseira)"
                  >
                    <SwitchCamera className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>

                {/* Mic Volume Level Meter Bar */}
                <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700/80 pointer-events-auto">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${audioLevel}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300">{audioLevel}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onEnterCall}
              className={`flex-1 py-3.5 px-4 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                doctorStarted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-bounce'
                  : 'bg-[#1E6FB8] hover:bg-[#0D47A1] text-white'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>{doctorStarted ? 'Entrar na Teleconsulta (Chamada Ativa)' : 'Conectar à Sala de Vídeo'}</span>
            </button>

            <button
              onClick={onClose}
              className="py-3.5 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Voltar ao Painel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
