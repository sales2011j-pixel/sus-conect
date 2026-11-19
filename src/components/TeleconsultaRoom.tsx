import React, { useState, useEffect, useRef } from 'react';
import { Appointment, TeleconsultaSession } from '../types/index.ts';
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
  SwitchCamera,
  ChevronDown,
  Camera,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Sparkles,
  Layers,
  Activity,
  Maximize2,
} from 'lucide-react';

interface TeleconsultaRoomProps {
  appointment: Appointment;
  onClose: () => void;
  onCompleted?: () => void;
  userRole?: 'doctor' | 'patient';
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const TeleconsultaRoom: React.FC<TeleconsultaRoomProps> = ({
  appointment,
  onClose,
  onCompleted,
  userRole = 'patient',
}) => {
  // Mode: Native WebRTC vs Jitsi Meet engine fallback
  const [videoEngine, setVideoEngine] = useState<'webrtc' | 'jitsi'>('webrtc');

  // Media Controls
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Connection & WebRTC States
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerName, setPeerName] = useState(
    userRole === 'doctor' ? appointment.citizenName : appointment.professionalName
  );

  // 10-Minute Server Synchronized Countdown Timer
  // Total limit is 600s (10 min) + any clinical extensions
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [callStarted, setCallStarted] = useState<boolean>(false);
  const [sessionData, setSessionData] = useState<TeleconsultaSession | null>(null);

  // Drawers & In-Call Chat
  const [activeSheet, setActiveSheet] = useState<'none' | 'notes' | 'chat'>('none');
  const [chatInput, setChatInput] = useState('');
  const [roomMessages, setRoomMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: 'Sistema SUS CONECT',
      text: `Conexão segura WebRTC estabelecida para a sala ${appointment.virtualRoomId}. O cronômetro oficial é de 10 minutos.`,
      time: '00:00',
    },
  ]);

  // Clinical Extension Modal
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionReason, setExtensionReason] = useState('');
  const [extending, setExtending] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Video and Stream References
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const isDoctor = userRole === 'doctor';
  const currentUserId = isDoctor ? appointment.professionalId : appointment.citizenId;
  const currentUserName = isDoctor ? appointment.professionalName : appointment.citizenName;

  // Format seconds into MM:SS
  const formatTimer = (totalSec: number) => {
    const m = Math.floor(Math.max(0, totalSec) / 60);
    const s = Math.max(0, totalSec) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 1. Fetch official session state from server to synchronize clock
  const syncServerSession = async () => {
    try {
      const data = await api.getTeleconsultaSession(appointment.id);
      setSessionData(data);
      if (data.startedAt) {
        setCallStarted(true);
        setRemainingSeconds(data.remainingSeconds);
      }
    } catch (e) {
      console.warn('Erro ao sincronizar sessão inicial:', e);
    }
  };

  useEffect(() => {
    syncServerSession();
  }, [appointment.id]);

  // 2. Countdown Timer: 1-second interval tick when call is active
  useEffect(() => {
    if (!callStarted) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoTermination();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [callStarted]);

  // Periodic server clock resync every 15s to prevent clock drift
  useEffect(() => {
    if (!callStarted) return;

    const resyncInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'sync-clock' }));
      }
    }, 15000);

    return () => clearInterval(resyncInterval);
  }, [callStarted]);

  // 3. Initialize Local Camera and Microphone Stream
  const initLocalStream = async (facing: 'user' | 'environment') => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraPermission('denied');
        setPermissionError('Navegador sem suporte a WebRTC de mídia.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      localStreamRef.current = stream;
      setCameraPermission('granted');
      setPermissionError(null);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add or replace tracks in existing PeerConnection
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        stream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            peerConnectionRef.current?.addTrack(track, stream);
          }
        });
      }
    } catch (err: any) {
      console.warn('Falha ao acessar câmera/microfone:', err);
      setCameraPermission('denied');
      setPermissionError(
        err.name === 'NotAllowedError'
          ? 'Permissão negada para câmera/microfone no navegador.'
          : 'Câmera não detectada ou já em uso.'
      );
    }
  };

  useEffect(() => {
    if (cameraOn) {
      initLocalStream(facingMode);
    } else if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraOn, facingMode]);

  // Handle Mute/Unmute audio track
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = micOn));
    }
  }, [micOn]);

  // 4. Setup WebRTC PeerConnection & WebSocket Signaling
  useEffect(() => {
    // Create new RTCPeerConnection
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Create remote MediaStream to receive peer tracks
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      setPeerConnected(true);
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setConnectionStatus('connected');
        setPeerConnected(true);
      } else if (state === 'failed' || state === 'disconnected') {
        setConnectionStatus('reconnecting');
      }
    };

    // WebSocket Signaling on port 3000 /ws/teleconsulta
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/teleconsulta`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      // Join Room
      ws.send(
        JSON.stringify({
          type: 'join',
          appointmentId: appointment.id,
          userId: currentUserId,
          userName: currentUserName,
          role: userRole,
        })
      );
    };

    // Candidate handler: send ICE candidate to peer
    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'webrtc-ice-candidate',
            candidate: event.candidate,
          })
        );
      }
    };

    ws.onmessage = async (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        switch (msg.type) {
          case 'room-state': {
            if (msg.session.startedAt) {
              setCallStarted(true);
              setRemainingSeconds(msg.session.remainingSeconds);
            }
            // If peer already exists in room, initiate offer if doctor
            if (msg.peers && msg.peers.length > 1 && isDoctor) {
              initiateOffer(pc, ws);
            }
            break;
          }

          case 'peer-joined': {
            setPeerConnected(true);
            setPeerName(msg.userName);
            // Doctor creates offer when patient joins
            if (isDoctor) {
              initiateOffer(pc, ws);
            }
            break;
          }

          case 'peer-left': {
            setPeerConnected(false);
            break;
          }

          case 'call-started': {
            setCallStarted(true);
            setRemainingSeconds(msg.remainingSeconds || 600);
            if (!isDoctor) {
              setPeerConnected(true);
            }
            break;
          }

          case 'clock-sync': {
            if (msg.remainingSeconds !== undefined) {
              setRemainingSeconds(msg.remainingSeconds);
            }
            if (msg.status === 'concluido') {
              handleAutoTermination();
            }
            break;
          }

          case 'webrtc-offer': {
            if (pc.signalingState !== 'closed') {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              // Attach local tracks before answering
              if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => {
                  pc.addTrack(track, localStreamRef.current!);
                });
              }
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              ws.send(
                JSON.stringify({
                  type: 'webrtc-answer',
                  sdp: answer,
                })
              );
            }
            break;
          }

          case 'webrtc-answer': {
            if (pc.signalingState !== 'closed') {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            }
            break;
          }

          case 'webrtc-ice-candidate': {
            if (msg.candidate && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
              } catch (e) {
                console.warn('Erro ao adicionar ICE candidate:', e);
              }
            }
            break;
          }

          case 'call-extended': {
            setRemainingSeconds((prev) => prev + (msg.additionalMinutes || 5) * 60);
            alert(`Atenção: O profissional autorizou uma extensão clínica de +${msg.additionalMinutes || 5} minutos.`);
            break;
          }

          case 'call-ended': {
            handleAutoTermination();
            break;
          }

          case 'chat-message': {
            setRoomMessages((prev) => [
              ...prev,
              {
                sender: msg.sender,
                text: msg.text,
                time: msg.time,
              },
            ]);
            break;
          }
        }
      } catch (err) {
        console.error('Erro na mensagem WebSocket WebRTC:', err);
      }
    };

    ws.onerror = () => setConnectionStatus('disconnected');
    ws.onclose = () => setConnectionStatus('disconnected');

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (pc.signalingState !== 'closed') {
        pc.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [appointment.id]);

  // Helper to create and send WebRTC offer
  const initiateOffer = async (pc: RTCPeerConnection, ws: WebSocket) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      ws.send(
        JSON.stringify({
          type: 'webrtc-offer',
          sdp: offer,
        })
      );
    } catch (e) {
      console.warn('Falha ao gerar oferta WebRTC:', e);
    }
  };

  // Doctor Action: Start Consultation (triggers 10:00 countdown on server)
  const handleStartConsultation = async () => {
    try {
      const session = await api.startTeleconsulta(appointment.id);
      setCallStarted(true);
      setRemainingSeconds(session.remainingSeconds || 600);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'doctor-start',
            appointmentId: appointment.id,
          })
        );
      }
    } catch (e: any) {
      alert(e.message || 'Erro ao iniciar consulta.');
    }
  };

  // Automatic Call Termination at 00:00 (Mandatory 10-minute constraint)
  const handleAutoTermination = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    try {
      await api.finishTeleconsulta(
        appointment.id,
        600 - remainingSeconds,
        'Consulta encerrada automaticamente pelo cronômetro de 10 minutos.'
      );

      // Auto-issue demonstrative document
      await api.createDocument({
        citizenId: appointment.citizenId,
        citizenName: appointment.citizenName,
        title: `Declaração de Teleatendimento — ${appointment.specialtyName}`,
        type: 'atestado',
        issuedDate: new Date().toISOString().split('T')[0],
        doctorName: appointment.professionalName,
        specialty: appointment.specialtyName,
        content: {
          diagnosisOrSubject: `Teleconsulta WebRTC de ${appointment.specialtyName}`,
          bodyText: `Atesto para fins acadêmicos que ${appointment.citizenName} participou da teleconsulta médica em tempo real com áudio e vídeo sob protocolo WebRTC com duração regulamentar de 10 minutos.`,
          demonstrativeNotice: 'Documento gerado automaticamente para a banca da Formação Geração Tech 4.0.',
        },
      });

      if (onCompleted) onCompleted();
      onClose();
    } catch (e) {
      console.error('Erro ao finalizar consulta:', e);
      onClose();
    }
  };

  // Doctor Action: Clinical Extension Request (+5 min)
  const handleAuthorizeExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionReason.trim()) {
      alert('Justificativa clínica obrigatória.');
      return;
    }
    setExtending(true);
    try {
      const session = await api.extendTeleconsulta(appointment.id, extensionReason, 5);
      setRemainingSeconds(session.remainingSeconds);
      setShowExtensionModal(false);
      setExtensionReason('');
      alert('Extensão clínica de +5 minutos autorizada e auditada com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao autorizar extensão.');
    } finally {
      setExtending(false);
    }
  };

  // Manual End Consultation
  const handleManualEnd = async () => {
    const confirmMsg = isDoctor
      ? 'Deseja encerrar o atendimento agora e emitir a declaração com receita demonstrativa?'
      : 'Deseja sair da teleconsulta?';
    if (!confirm(confirmMsg)) return;

    setCompleting(true);
    try {
      await api.finishTeleconsulta(
        appointment.id,
        600 - remainingSeconds,
        `Consulta finalizada manualmente por ${currentUserName}.`
      );

      await api.createDocument({
        citizenId: appointment.citizenId,
        citizenName: appointment.citizenName,
        title: `Declaração de Teleatendimento — ${appointment.specialtyName}`,
        type: 'atestado',
        issuedDate: new Date().toISOString().split('T')[0],
        doctorName: appointment.professionalName,
        specialty: appointment.specialtyName,
        content: {
          diagnosisOrSubject: `Teleconsulta em Vídeo — ${appointment.specialtyName}`,
          bodyText: `Atesto para fins acadêmicos que ${appointment.citizenName} compareceu à teleconsulta médica virtual realizada em tempo real no dia ${new Date().toLocaleDateString('pt-BR')}.`,
          demonstrativeNotice: 'Documento expedido para avaliação da banca na Formação Geração Tech 4.0.',
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

  // Toggle Camera Facing Mode
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Send In-Call Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const timeStr = formatTimer(remainingSeconds);
    const msgPayload = {
      type: 'chat-message',
      sender: currentUserName,
      text: chatInput.trim(),
      time: timeStr,
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msgPayload));
    }

    setRoomMessages((prev) => [
      ...prev,
      {
        sender: 'Você',
        text: chatInput.trim(),
        time: timeStr,
      },
    ]);
    setChatInput('');
  };

  // Timer Condition: Under 2 minutes (120 seconds) turns RED & FLASHES!
  const isFinalTwoMinutes = callStarted && remainingSeconds <= 120 && remainingSeconds > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-white select-none">
      {/* 1. Header Bar: Identity, 10-Min Timer, Controls */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-800/80 z-20">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-full bg-[#1E6FB8] flex items-center justify-center shrink-0">
            <VideoIcon className="w-4 h-4 text-white" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white truncate">
                {isDoctor ? `Paciente: ${appointment.citizenName}` : appointment.professionalName}
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  peerConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
                title={peerConnected ? 'Par Conectado via WebRTC' : 'Aguardando Conexão do Par'}
              ></span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {appointment.specialtyName} · WebRTC P2P Criptografado
            </p>
          </div>
        </div>

        {/* Center / Right: 10-Minute Countdown Timer Widget */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Synchronized 10-Minute Countdown Display */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold tabular-nums transition-all ${
              isFinalTwoMinutes
                ? 'bg-rose-600/90 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-600/40'
                : callStarted
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isFinalTwoMinutes ? 'text-white' : 'text-[#00A884]'}`} />
            <span>{callStarted ? formatTimer(remainingSeconds) : '10:00 (Pausado)'}</span>
            {isFinalTwoMinutes && (
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider hidden sm:inline ml-1 text-white">
                2 Min Finais
              </span>
            )}
          </div>

          {/* Clinical Extension Button (Doctor Only) */}
          {isDoctor && callStarted && (
            <button
              onClick={() => setShowExtensionModal(true)}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded-lg cursor-pointer hidden sm:flex items-center gap-1"
              title="Solicitar Extensão Clínica Excepcional (+5 min)"
            >
              <PlusCircle className="w-3 h-3" />
              <span>+5 min</span>
            </button>
          )}

          {/* Engine Selector Toggle (WebRTC Native vs Jitsi Meet) */}
          <button
            onClick={() => setVideoEngine(videoEngine === 'webrtc' ? 'jitsi' : 'webrtc')}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-medium border border-slate-700 cursor-pointer hidden md:flex items-center gap-1"
            title="Alternar Motor de Vídeo"
          >
            <Layers className="w-3 h-3 text-[#1E6FB8]" />
            <span>{videoEngine === 'webrtc' ? 'WebRTC Nativo' : 'Jitsi Meet'}</span>
          </button>

          {/* End Call Button */}
          <button
            onClick={handleManualEnd}
            disabled={completing}
            className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Encerrar consulta"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Video Stage */}
      <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden">
        {videoEngine === 'jitsi' ? (
          // Jitsi Meet External Iframe Integration Mode
          <iframe
            src={`https://meet.jit.si/${appointment.virtualRoomId}#userInfo.displayName="${encodeURIComponent(
              currentUserName
            )}"&config.startWithAudioMuted=false&config.prejoinPageEnabled=false`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
            title="Jitsi Meet Teleconsulta SUS CONECT"
          />
        ) : (
          // Native WebRTC Peer-to-Peer Engine
          <>
            {/* Remote Peer Video Stream (Fills primary canvas) */}
            <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${peerConnected ? 'block' : 'hidden'}`}
              />

              {/* Waiting For Peer Placeholder */}
              {!peerConnected && (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                    <VideoIcon className="w-8 h-8 text-slate-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">
                      {isDoctor ? 'Aguardando o paciente entrar...' : 'Conectando ao profissional de saúde...'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {isDoctor
                        ? 'O paciente está na sala de espera ou conectando a câmera. Quando ambos estiverem prontos, a transmissão de áudio e vídeo iniciará.'
                        : 'Aguarde o profissional autorizar o fluxo de áudio e vídeo em tempo real.'}
                    </p>
                  </div>

                  {/* Doctor Start Button (when not started) */}
                  {isDoctor && !callStarted && (
                    <button
                      onClick={handleStartConsultation}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer flex items-center gap-2 animate-bounce"
                    >
                      <VideoIcon className="w-4 h-4" />
                      <span>INICIAR ATENDIMENTO (ATIVAR 10 MINUTOS)</span>
                    </button>
                  )}
                </div>
              )}

              {/* Remote Peer Name Badge */}
              <div className="absolute top-4 left-4 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-[11px] font-semibold text-white flex items-center gap-2 shadow-lg z-10">
                <span className={`w-2 h-2 rounded-full ${peerConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span>{peerName}</span>
              </div>
            </div>

            {/* Local Selfie Camera View (Picture-in-Picture window) */}
            <div className="absolute top-4 right-4 sm:bottom-28 sm:right-6 w-28 h-40 sm:w-44 sm:h-60 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/30 shadow-2xl z-10">
              {cameraPermission === 'granted' && cameraOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-2 text-center text-slate-400 text-[10px]">
                  <Camera className="w-5 h-5 text-slate-500 mb-1" />
                  <span>{cameraOn ? 'Permissão pendente' : 'Câmera desligada'}</span>
                </div>
              )}

              <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-slate-950/80 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] text-white text-center truncate">
                Você ({currentUserName.split(' ')[0]})
              </div>
            </div>
          </>
        )}

        {/* Camera Permission Alert Banner if denied */}
        {cameraPermission === 'denied' && (
          <div className="absolute top-16 left-4 right-4 bg-amber-500/90 backdrop-blur-md p-3 rounded-2xl text-slate-950 text-xs shadow-xl flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
              <span className="text-[11px] font-medium leading-tight">{permissionError}</span>
            </div>
            <button
              onClick={() => initLocalStream(facingMode)}
              className="px-2.5 py-1 bg-slate-950 text-white rounded-lg text-[10px] font-bold shrink-0 ml-2 cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Tentar</span>
            </button>
          </div>
        )}

        {/* 3. Mobile Thumb Controls Strip */}
        <div className="absolute bottom-6 left-0 right-0 px-4 flex items-center justify-center z-20">
          <div className="bg-slate-900/95 backdrop-blur-xl px-4 py-2.5 rounded-full border border-slate-700/80 shadow-2xl flex items-center gap-3">
            {/* Mic Toggle */}
            <button
              onClick={() => setMicOn(!micOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer ${
                micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
              }`}
              title={micOn ? 'Desativar Microfone' : 'Ativar Microfone'}
            >
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={() => setCameraOn(!cameraOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer ${
                cameraOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
              }`}
              title={cameraOn ? 'Desligar Câmera' : 'Ligar Câmera'}
            >
              {cameraOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Flip Camera (Front/Rear) for Mobile */}
            <button
              onClick={handleToggleFacingMode}
              disabled={!cameraOn || cameraPermission !== 'granted'}
              className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer disabled:opacity-40"
              title="Alternar Câmera Frontal / Traseira"
            >
              <SwitchCamera className="w-5 h-5 text-emerald-400" />
            </button>

            {/* Open Notes Drawer */}
            <button
              onClick={() => setActiveSheet(activeSheet === 'notes' ? 'none' : 'notes')}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer ${
                activeSheet === 'notes' ? 'bg-[#1E6FB8] text-white' : 'bg-slate-800 text-slate-300'
              }`}
              title="Prontuário e Motivo da Consulta"
            >
              <FileText className="w-5 h-5" />
            </button>

            {/* Open Chat Drawer */}
            <button
              onClick={() => setActiveSheet(activeSheet === 'chat' ? 'none' : 'chat')}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer relative ${
                activeSheet === 'chat' ? 'bg-[#1E6FB8] text-white' : 'bg-slate-800 text-slate-300'
              }`}
              title="Mensagens da Consulta"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#00A884]"></span>
            </button>

            {/* End Call Button */}
            <button
              onClick={handleManualEnd}
              className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-lg shadow-rose-600/30"
              title="Encerrar Consulta"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Slide-up Drawer Sheet for Notes or Chat */}
      {activeSheet !== 'none' && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-slate-900/98 backdrop-blur-2xl rounded-t-3xl border-t border-slate-700 shadow-2xl max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="pt-3 pb-1 flex justify-center cursor-pointer" onClick={() => setActiveSheet('none')}>
            <div className="w-10 h-1.5 bg-slate-600 rounded-full"></div>
          </div>

          <div className="px-5 py-2 flex items-center justify-between border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              {activeSheet === 'notes' ? (
                <>
                  <FileText className="w-4 h-4 text-[#1E6FB8]" />
                  <span>Prontuário & Informações do Atendimento</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 text-[#00A884]" />
                  <span>Mensagens Seguras da Teleconsulta</span>
                </>
              )}
            </h4>
            <button
              onClick={() => setActiveSheet('none')}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
            {activeSheet === 'notes' ? (
              <div className="space-y-3.5">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Motivo Informado pelo Cidadão
                  </span>
                  <p className="text-slate-100 text-xs leading-relaxed">
                    {appointment.reason || 'Consulta preventiva e acompanhamento clínico.'}
                  </p>
                </div>

                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Identificação dos Participantes
                  </span>
                  <p className="text-slate-100 font-bold">Médico: {appointment.professionalName}</p>
                  <p className="text-slate-100 font-bold">Paciente: {appointment.citizenName}</p>
                  <p className="text-slate-400 text-[11px]">Especialidade: {appointment.specialtyName}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    O tempo de atendimento é regulado pelo servidor em 10 minutos. Ao término, a Declaração de Teleatendimento é expedida automaticamente.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-72 justify-between">
                <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                  {roomMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                        m.sender === 'Você'
                          ? 'bg-[#1E6FB8] text-white ml-auto rounded-tr-xs'
                          : 'bg-slate-800 text-slate-200 mr-auto border border-slate-700 rounded-tl-xs'
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
                    placeholder="Escreva uma mensagem..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#1E6FB8]"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-[#1E6FB8] hover:bg-[#0D47A1] text-white rounded-xl cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Clinical Extension Modal (Doctor Only) */}
      {showExtensionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 text-slate-900 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-700">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold">Autorização de Extensão Clínica (+5 min)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              O limite de 10 minutos é uma regra operacional padrão. Para situações que exijam aprofundamento clínico, o médico pode conceder +5 minutos adicionais. Este procedimento será auditado no sistema.
            </p>

            <form onSubmit={handleAuthorizeExtension} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Justificativa Clínica Obrigatória
                </label>
                <textarea
                  rows={3}
                  required
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Ex: Necessidade de esclarecimento de sintomas atípicos e orientação de conduta profilática..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#1E6FB8]"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtensionModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={extending}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {extending ? 'Autorizando...' : 'Confirmar Extensão (+5 min)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
