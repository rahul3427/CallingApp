import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  Send, Trash2, Heart, Download, LogOut, Bell, BellOff, Check, CheckCheck,
  Smile, MoreVertical, Image, X
} from 'lucide-react';
import './App.css';

// Safe browser polyfill for simple-peer
if (typeof window !== 'undefined' && typeof window.global === 'undefined') {
  window.global = window;
}

// Dynamically determine the backend URL based on Environment
const SOCKET_URL = import.meta.env.VITE_DEV_SERVER === 'true' || window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : '/';

const socket = io(SOCKET_URL, { autoConnect: false });

// ─── USERS ───────────────────────────────────────────────────────────
const USERS = ['Jesika', 'David'];

// ─── SYNTHESIZED SOUND GENERATORS (Web Audio API) ───────────────────
const playMessageSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) { /* noop */ }
};

const playHeartbeatSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.frequency.setValueAtTime(90, now);
    osc1.frequency.exponentialRampToValueAtTime(55, now + 0.12);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc1.connect(gain1); gain1.connect(audioCtx.destination);
    osc1.start(now); osc1.stop(now + 0.12);
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.frequency.setValueAtTime(90, now + 0.16);
    osc2.frequency.exponentialRampToValueAtTime(55, now + 0.32);
    gain2.gain.setValueAtTime(0.4, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    osc2.connect(gain2); gain2.connect(audioCtx.destination);
    osc2.start(now + 0.16); osc2.stop(now + 0.32);
  } catch (e) { /* noop */ }
};

const startIncomingRingtone = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playChirp = () => {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(1250, now + 0.18);
      osc.frequency.setValueAtTime(750, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(1250, now + 0.40);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.48);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.5);
    };
    playChirp();
    const intervalId = setInterval(playChirp, 1400);
    return { stop: () => { clearInterval(intervalId); audioCtx.close(); } };
  } catch (e) { return { stop: () => {} }; }
};

const startOutgoingRingtone = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playRingback = () => {
      const now = audioCtx.currentTime;
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gain.gain.setValueAtTime(0.15, now + 1.5);
      gain.gain.linearRampToValueAtTime(0, now + 1.7);
      osc1.connect(gain); osc2.connect(gain); gain.connect(audioCtx.destination);
      osc1.start(now); osc2.start(now);
      osc1.stop(now + 1.8); osc2.stop(now + 1.8);
    };
    playRingback();
    const intervalId = setInterval(playRingback, 4000);
    return { stop: () => { clearInterval(intervalId); audioCtx.close(); } };
  } catch (e) { return { stop: () => {} }; }
};

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys & Emotion',
    tabIcon: '😀',
    emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😋','😛','😜','🤪','😎','🤓','🧐','😏','😒','😞','😔','🥺','😢','😭','😤','😠','😡','🤯','😳','🥵','🥶','😱','🥱','😴','🫠','🙄']
  },
  {
    name: 'Love & Hearts',
    tabIcon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❤️‍🔥','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💋']
  },
  {
    name: 'Gestures & Hands',
    tabIcon: '👍',
    emojis: ['👍','👎','👊','✊','🤛','🤜','🤞','✌️','🤟','🤘','👌','🤌','👋','✋','🤚','🖐️','🖖','👏','🙌','🙏','💪','✍️','🤝']
  },
  {
    name: 'Fun & Celebration',
    tabIcon: '🎉',
    emojis: ['🔥','✨','⭐','🌟','🎉','🎊','🎈','🎁','🎂','💎','👑','🔮','🧿','🧸','🍀','🌈','🪐','⚡','🍔','🍕','🍻','☕','🚀']
  }
];

// ─── DISGUISE ERROR PAGE ─────────────────────────────────────────────
function ErrorPage({ onUnlock }) {
  const clickCountRef = useRef(0);
  const timerRef = useRef(null);
  const [glitch, setGlitch] = useState(false);

  const handleSecretClick = () => {
    clickCountRef.current += 1;
    if (clickCountRef.current >= 15) {
      onUnlock();
      return;
    }
    // Subtle glitch hint after 10 clicks
    if (clickCountRef.current >= 10) {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 120);
    }
    // Reset counter if no click within 5 seconds
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { clickCountRef.current = 0; }, 5000);
  };

  return (
    <div className="error-page" onClick={handleSecretClick}>
      <div className={`error-content ${glitch ? 'glitch' : ''}`}>
        <div className="error-icon-wrap">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="35" stroke="#d93025" strokeWidth="2" fill="none"/>
            <path d="M36 20v22" stroke="#d93025" strokeWidth="3.5" strokeLinecap="round"/>
            <circle cx="36" cy="50" r="2.5" fill="#d93025"/>
          </svg>
        </div>
        <h1 className="error-title">Your connection is not private</h1>
        <p className="error-code">NET::ERR_CERT_AUTHORITY_INVALID</p>
        <div className="error-warning-box">
          <p>Attackers might be trying to steal your information from this site (for example, passwords, messages, or credit cards).</p>
        </div>
        <div className="error-url-bar">
          <span className="error-lock-icon">🔓</span>
          <span className="error-url-text">Not secure · This site's certificate is not trusted</span>
        </div>
        <div className="error-buttons">
          <button className="error-btn-back" onClick={(e) => { e.stopPropagation(); window.history.back(); }}>← Back to safety</button>
          <button className="error-btn-advanced" onClick={(e) => e.stopPropagation()}>Advanced</button>
        </div>
        <p className="error-detail-text">
          This server could not prove that it is secure; its security certificate is not trusted by your computer's operating system. This may be caused by a misconfiguration or an attacker intercepting your connection.
        </p>
        <p className="error-code-small">Error Code: <span>SSL_ERROR_RX_RECORD_TOO_LONG · 0x00000005</span></p>
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ────────────────────────────────────────────────────
function LoginScreen({ onLogin, loginError }) {
  const [selected, setSelected] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selected) return;
    onLogin(selected);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-heart-icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <defs>
              <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff6b9d"/>
                <stop offset="100%" stopColor="#ff0844"/>
              </linearGradient>
            </defs>
            <path d="M28 46s-18-11-18-24a11 11 0 0 1 18-8.5A11 11 0 0 1 46 22c0 13-18 24-18 24z" fill="url(#hg)"/>
          </svg>
        </div>

        <h1 className="login-title">Welcome Back 💕</h1>
        <p className="login-subtitle">Select who you are to enter the private room</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="user-picklist">
            {USERS.map((user) => (
              <button
                key={user}
                type="button"
                className={`user-pick-btn ${selected === user ? 'selected' : ''}`}
                onClick={() => setSelected(user)}
              >
                <div className="user-avatar-pick">
                  {user.slice(0, 1)}
                </div>
                <span className="user-pick-name">{user}</span>
                <div className={`user-pick-check ${selected === user ? 'visible' : ''}`}>✓</div>
              </button>
            ))}
          </div>

          {loginError && <div className="login-error">{loginError}</div>}

          <button
            type="submit"
            className="login-submit-btn"
            disabled={!selected}
          >
            Enter Room →
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────
function App() {
  // Disguise state
  const [appUnlocked, setAppUnlocked] = useState(false);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nickname, setNickname] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Room state
  const [me, setMe] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [floatingHearts, setFloatingHearts] = useState([]);
  
  // Calling state
  const [localStream, setLocalStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callType, setCallType] = useState('audio');
  const [isCalling, setIsCalling] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // App & Notification states
  const [bellGranted, setBellGranted] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [heartPulseTrigger, setHeartPulseTrigger] = useState(false);

  // Emoji picker states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState(0);

  // Image preview state
  const [imagePreview, setImagePreview] = useState(null);

  // Dropdown states
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Refs
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const connectionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const ringtoneRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiBtnRef = useRef(null);
  const chatInputRef = useRef(null);
  const moreMenuRef = useRef(null);
  const moreMenuBtnRef = useRef(null);
  const imageInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [chatMessages]);

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        setBellGranted(permission === 'granted');
      });
    }
  };

  const triggerHeartsBurst = () => {
    const burst = Array.from({ length: 16 }).map(() => ({
      id: `heart-${Date.now()}-${Math.random()}`,
      left: Math.random() * 85 + 5,
      scale: Math.random() * 0.7 + 0.6,
      delay: Math.random() * 0.6,
      duration: Math.random() * 1.5 + 2.0
    }));
    setFloatingHearts((prev) => [...prev, ...burst]);
  };

  const removeHeart = (id) => {
    setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && 
          emojiBtnRef.current && !emojiBtnRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target) &&
          moreMenuBtnRef.current && !moreMenuBtnRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const insertEmoji = (emoji) => {
    setTextInput((prev) => prev + emoji);
    setTimeout(() => chatInputRef.current?.focus(), 10);
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if ('Notification' in window) setBellGranted(Notification.permission === 'granted');
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!isAuthenticated) return;
    socket.connect();

    socket.on('me', (id) => setMe(id));
    socket.on('user-list', (users) => setActiveUsers(users));

    socket.on('receive-message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
      if (document.hidden && !msg.isSystem) {
        playMessageSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Message from ${msg.sender}`, {
            body: msg.isHeart ? '💖 [Heart Pulse]' : (msg.isImage ? '📷 [Photo]' : msg.text),
            icon: '/icon.svg',
            tag: 'viberoom-new-msg'
          });
        }
      } else if (!msg.isSystem && msg.sender !== nickname) {
        playMessageSound();
      }
    });

    socket.on('receive-heart', (data) => {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      playHeartbeatSound();
      triggerHeartsBurst();
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`${data.sender} sent you a Heartbeat!`, {
          body: 'Tap to return the love 💖',
          icon: '/icon.svg',
          tag: 'viberoom-heart'
        });
      }
    });

    socket.on('chat-cleared', (systemMsg) => setChatMessages([systemMsg]));

    socket.on('callUser', (data) => {
      if (connectionRef.current || receivingCall || callAccepted) return;
      setReceivingCall(true);
      setCaller(data.from);
      setCallerName(data.name);
      setCallerSignal(data.signal);
      setCallType(data.type);
      ringtoneRef.current = startIncomingRingtone();
      if (navigator.vibrate) navigator.vibrate([500, 500, 500, 500, 500]);
    });

    socket.on('callAccepted', (data) => {
      setCallAccepted(true);
      setIsCalling(false);
      setPartnerId(data.from);
      if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
      if (connectionRef.current) connectionRef.current.signal(data.signal);
    });

    socket.on('callEnded', () => cleanupCallStates());
    socket.on('disconnect', () => cleanupCallStates());

    return () => {
      socket.off('me'); socket.off('user-list'); socket.off('receive-message');
      socket.off('receive-heart'); socket.off('chat-cleared'); socket.off('callUser');
      socket.off('callAccepted'); socket.off('callEnded'); socket.off('disconnect');
    };
  }, [isAuthenticated, nickname]);

  useEffect(() => {
    if (callAccepted && !callEnded) {
      setCallDuration(0);
      durationIntervalRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
    } else {
      if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null; }
    }
    return () => { if (durationIntervalRef.current) clearInterval(durationIntervalRef.current); };
  }, [callAccepted, callEnded]);

  const cleanupCallStates = () => {
    setCallAccepted(false); setReceivingCall(false); setCallEnded(false);
    setIsCalling(false); setPartnerId(''); setCallDuration(0);
    setIsMuted(false); setIsCamOff(false);
    if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
    if (navigator.vibrate) navigator.vibrate(0);
    if (connectionRef.current) {
      try { connectionRef.current.destroy(); } catch (e) {}
      connectionRef.current = null;
    }
    if (localStream) { localStream.getTracks().forEach((t) => t.stop()); setLocalStream(null); }
  };

  // Login: pick a name
  const handleLogin = (selectedUser) => {
    setLoginError('');
    socket.connect();
    socket.emit('join-room', { nickname: selectedUser, password: 'DIRECT_ACCESS' });

    socket.once('join-success', (data) => {
      setIsAuthenticated(true);
      setNickname(selectedUser);
      setChatMessages(data.chatHistory || []);
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((p) => setBellGranted(p === 'granted'));
      }
    });

    socket.once('join-error', (errMsg) => {
      setLoginError(errMsg);
      socket.disconnect();
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    socket.emit('send-message', { text: textInput, isHeart: false });
    setTextInput('');
  };

  const handleSendHeart = () => {
    setHeartPulseTrigger(true);
    setTimeout(() => setHeartPulseTrigger(false), 600);
    if (navigator.vibrate) navigator.vibrate([100]);
    triggerHeartsBurst();
    playHeartbeatSound();
    socket.emit('send-heart');
    socket.emit('send-message', { text: '💖 Sent a heartbeat!', isHeart: true });
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear chat history for everyone?')) {
      socket.emit('clear-chat');
    }
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // ─── Image Sharing ─────────────────────────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview({ url: ev.target.result, name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendImage = () => {
    if (!imagePreview) return;
    socket.emit('send-message', {
      text: '',
      isHeart: false,
      isImage: true,
      imageData: imagePreview.url,
      imageName: imagePreview.name
    });
    setImagePreview(null);
  };

  // Call functions
  const initiateCall = (type) => {
    cleanupCallStates();
    setCallType(type);
    const partner = activeUsers.find(u => u.id !== socket.id);
    if (!partner) { alert('No partner is online in this room right now to call!'); return; }
    setPartnerId(partner.id);
    setIsCalling(true);
    ringtoneRef.current = startOutgoingRingtone();
    navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
      .then((stream) => {
        setLocalStream(stream);
        if (type === 'video' && localVideo.current) localVideo.current.srcObject = stream;
        const peer = new Peer({ initiator: true, trickle: false, stream });
        peer.on('signal', (signalData) => socket.emit('callUser', { to: partner.id, signalData, type }));
        peer.on('stream', (remoteStream) => { if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream; });
        peer.on('close', () => cleanupCallStates());
        peer.on('error', () => cleanupCallStates());
        connectionRef.current = peer;
      })
      .catch(() => { alert('Could not access camera or microphone. Please check permissions!'); cleanupCallStates(); });
  };

  const acceptIncomingCall = () => {
    if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
    if (navigator.vibrate) navigator.vibrate(0);
    setCallAccepted(true);
    setReceivingCall(false);
    navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' })
      .then((stream) => {
        setLocalStream(stream);
        if (callType === 'video' && localVideo.current) localVideo.current.srcObject = stream;
        const peer = new Peer({ initiator: false, trickle: false, stream });
        peer.on('signal', (signalData) => socket.emit('answerCall', { signal: signalData, to: caller }));
        peer.on('stream', (remoteStream) => { if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream; });
        peer.on('close', () => cleanupCallStates());
        peer.on('error', () => cleanupCallStates());
        peer.signal(callerSignal);
        connectionRef.current = peer;
      })
      .catch(() => { alert('Could not access camera or microphone to answer!'); declineIncomingCall(); });
  };

  const declineIncomingCall = () => { socket.emit('endCall', { to: caller }); cleanupCallStates(); };
  const endActiveCall = () => { socket.emit('endCall', { to: partnerId || caller }); cleanupCallStates(); };

  const toggleMuteMicrophone = () => {
    if (localStream) { localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; }); setIsMuted(!isMuted); }
  };
  const toggleCameraStream = () => {
    if (localStream) { localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; }); setIsCamOff(!isCamOff); }
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    return `${mins.toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;
  };

  const handleLogout = () => { cleanupCallStates(); socket.disconnect(); setIsAuthenticated(false); setNickname(''); };

  useEffect(() => {
    if (localVideo.current && localStream && callType === 'video') {
      localVideo.current.srcObject = localStream;
    }
  }, [localStream, callType, callAccepted, isCalling]);

  // ─── RENDER: DISGUISE PAGE ────────────────────────────────────────
  if (!appUnlocked) {
    return <ErrorPage onUnlock={() => setAppUnlocked(true)} />;
  }

  // ─── RENDER: LOGIN ────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} loginError={loginError} />;
  }

  // ─── RENDER: CHAT APP ─────────────────────────────────────────────
  const otherUsers = activeUsers.filter(u => u.id !== socket.id);
  const isPartnerOnline = otherUsers.length > 0;
  const partnerNameString = otherUsers.map(u => u.nickname).join(', ');

  return (
    <div className="app-container">
      
      {/* Floating Hearts Layer */}
      <div className="hearts-overlay">
        {floatingHearts.map((heart) => (
          <span 
            key={heart.id}
            className="floating-heart"
            style={{
              '--float-left': `${heart.left}%`,
              '--float-delay': `${heart.delay}s`,
              '--float-duration': `${heart.duration}s`,
              transform: `scale(${heart.scale})`
            }}
            onAnimationEnd={() => removeHeart(heart.id)}
          >
            💖
          </span>
        ))}
      </div>

      <div className="chat-screen">
        
        {/* Chat Header */}
        <header className="chat-header">
          <div className="header-user-info">
            <div className="room-avatar-couple">
              <span>{nickname.slice(0,1)}</span>
            </div>
            <div className="room-details">
              <h3>Private Room 💕</h3>
              <div className="room-status">
                <span className={`status-dot ${isPartnerOnline ? 'online' : ''}`}></span>
                <span>{isPartnerOnline ? `${partnerNameString} is here ✨` : 'Waiting for partner...'}</span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button className="header-btn btn-call" onClick={() => initiateCall('audio')} disabled={!isPartnerOnline} title="Audio Call">
              <Phone size={20} />
            </button>
            <button className="header-btn btn-call-video" onClick={() => initiateCall('video')} disabled={!isPartnerOnline} title="Video Call">
              <Video size={20} />
            </button>
            <div className="more-menu-container">
              <button ref={moreMenuBtnRef} className={`header-btn ${showMoreMenu ? 'active' : ''}`} onClick={() => setShowMoreMenu(!showMoreMenu)} title="More Options">
                <MoreVertical size={20} />
              </button>
              {showMoreMenu && (
                <div className="header-dropdown-menu" ref={moreMenuRef}>
                  {isInstallable && (
                    <button className="dropdown-item btn-install" onClick={() => { handleInstallApp(); setShowMoreMenu(false); }}>
                      <Download size={18} /><span>Install App</span>
                    </button>
                  )}
                  <button className="dropdown-item" onClick={() => { requestNotificationPermission(); setShowMoreMenu(false); }}>
                    {bellGranted ? <Bell size={18} style={{ color: 'var(--wa-green)' }} /> : <BellOff size={18} />}
                    <span>Notifications</span>
                  </button>
                  <button className="dropdown-item" onClick={() => { handleClearChat(); setShowMoreMenu(false); }}>
                    <Trash2 size={18} /><span>Clear Chat</span>
                  </button>
                  <button className="dropdown-item" onClick={() => { handleLogout(); setShowMoreMenu(false); }}>
                    <LogOut size={18} /><span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="messages-container">
          {chatMessages.length === 0 ? (
            <div className="message-bubble system">No messages yet. Say hello! 💕</div>
          ) : (
            chatMessages.map((msg) => {
              if (msg.isSystem) {
                return <div key={msg.id} className="message-bubble system">{msg.text}</div>;
              }

              if (msg.isHeart) {
                const isSentByMe = msg.sender === nickname;
                return (
                  <div key={msg.id} className={`message-bubble heart-bubble ${isSentByMe ? 'sent' : 'received'}`}>
                    <div className="big-heart-container">
                      <div className="big-pulse-heart">💖</div>
                      <span className="heart-sender-label">{isSentByMe ? 'You' : msg.sender} sent a heartbeat</span>
                    </div>
                  </div>
                );
              }

              if (msg.isImage) {
                const isSentByMe = msg.sender === nickname;
                return (
                  <div key={msg.id} className={`message-bubble ${isSentByMe ? 'sent' : 'received'} image-bubble`}>
                    <span className="msg-sender">{isSentByMe ? 'You' : msg.sender}</span>
                    <img
                      src={msg.imageData}
                      alt={msg.imageName || 'Shared image'}
                      className="chat-image"
                      onClick={() => window.open(msg.imageData, '_blank')}
                    />
                    <span className="msg-meta">
                      {msg.timestamp}
                      {isSentByMe && <span className="tick-icon">{isPartnerOnline ? <CheckCheck size={13} /> : <Check size={13} />}</span>}
                    </span>
                  </div>
                );
              }

              const isSentByMe = msg.sender === nickname;
              return (
                <div key={msg.id} className={`message-bubble ${isSentByMe ? 'sent' : 'received'}`}>
                  <span className="msg-sender">{isSentByMe ? 'You' : msg.sender}</span>
                  <span className="msg-text">{msg.text}</span>
                  <span className="msg-meta">
                    {msg.timestamp}
                    {isSentByMe && (
                      <span className="tick-icon">{isPartnerOnline ? <CheckCheck size={13} /> : <Check size={13} />}</span>
                    )}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image preview modal */}
        {imagePreview && (
          <div className="image-preview-overlay">
            <div className="image-preview-card">
              <div className="image-preview-header">
                <span>Send Photo</span>
                <button className="img-preview-close" onClick={() => setImagePreview(null)}><X size={18} /></button>
              </div>
              <img src={imagePreview.url} alt="preview" className="image-preview-img" />
              <button className="image-send-btn" onClick={handleSendImage}>
                <Send size={18} /> Send
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <footer className="chat-input-bar">
          <button
            className={`btn-heart-pulse ${heartPulseTrigger ? 'pulse-anim' : ''}`}
            onClick={handleSendHeart}
            title="Send Heart!"
          >
            <Heart size={22} fill="currentColor" />
          </button>

          <div className="emoji-picker-container" ref={emojiPickerRef}>
            <button
              type="button"
              className={`btn-emoji-toggle ${showEmojiPicker ? 'active' : ''}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              ref={emojiBtnRef}
              title="Add Emoji"
            >
              <Smile size={22} />
            </button>
            {showEmojiPicker && (
              <div className="emoji-picker-popover">
                <div className="emoji-picker-tabs">
                  {EMOJI_CATEGORIES.map((cat, idx) => (
                    <button key={cat.name} type="button" className={`emoji-tab-btn ${activeEmojiTab === idx ? 'active' : ''}`} onClick={() => setActiveEmojiTab(idx)}>
                      {cat.tabIcon}
                    </button>
                  ))}
                </div>
                <div className="emoji-picker-title">{EMOJI_CATEGORIES[activeEmojiTab].name}</div>
                <div className="emoji-picker-grid">
                  {EMOJI_CATEGORIES[activeEmojiTab].emojis.map((emoji) => (
                    <button key={emoji} type="button" className="emoji-item" onClick={() => insertEmoji(emoji)}>{emoji}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <input type="file" accept="image/*" ref={imageInputRef} style={{ display: 'none' }} onChange={handleImageSelect} />
          <button type="button" className="btn-image-attach" onClick={() => imageInputRef.current?.click()} title="Share Image">
            <Image size={22} />
          </button>

          <form onSubmit={handleSendMessage} className="chat-form">
            <input
              type="text"
              placeholder="Type a message..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="chat-input"
              ref={chatInputRef}
            />
            <button type="submit" className="btn-send" disabled={!textInput.trim()}>
              <Send size={18} />
            </button>
          </form>
        </footer>
      </div>

      {/* Incoming Call Overlay */}
      {receivingCall && (
        <div className="call-overlay">
          <div className="calling-user-info">
            <div className="calling-avatar">{callerName.slice(0, 2).toUpperCase()}</div>
            <h2>{callerName}</h2>
            <div className="call-type-tag">Incoming {callType === 'video' ? 'Video Call' : 'Voice Call'}</div>
          </div>
          <div className="ringing-pulse-animation">{callType === 'video' ? <Video size={36} /> : <Phone size={36} />}</div>
          <div className="call-actions">
            <button className="btn-call-action accept" onClick={acceptIncomingCall}>{callType === 'video' ? <Video size={24} /> : <Phone size={24} />}</button>
            <button className="btn-call-action decline" onClick={declineIncomingCall}><PhoneOff size={24} /></button>
          </div>
        </div>
      )}

      {/* Outgoing Call Overlay */}
      {isCalling && (
        <div className="call-overlay">
          <div className="calling-user-info">
            <div className="calling-avatar">{otherUsers[0]?.nickname.slice(0, 2).toUpperCase()}</div>
            <h2>Calling {otherUsers[0]?.nickname}</h2>
            <div className="call-type-tag">Ringing {callType === 'video' ? 'Video' : 'Voice'}...</div>
          </div>
          <div className="ringing-pulse-animation" style={{ backgroundColor: 'var(--accent-hover)' }}>{callType === 'video' ? <Video size={36} /> : <Phone size={36} />}</div>
          <div className="call-actions">
            <button className="btn-call-action decline" onClick={endActiveCall} style={{ width: '100%', maxWidth: '120px', borderRadius: '16px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Active Call Overlay */}
      {(callAccepted && !callEnded) && (
        <div className="active-call-overlay">
          {callType === 'video' ? (
            <div className="video-canvas-container">
              <video className="remote-video-frame" ref={remoteVideo} autoPlay playsInline />
              {!isCamOff && <video className="local-video-pip" ref={localVideo} autoPlay playsInline muted />}
            </div>
          ) : (
            <div className="audio-call-ui">
              <div className="calling-avatar" style={{ width: '140px', height: '140px', fontSize: '3.5rem' }}>
                {otherUsers[0]?.nickname.slice(0, 2).toUpperCase()}
              </div>
              <h2>{otherUsers[0]?.nickname}</h2>
              <div className="active-call-timer">{formatTimer(callDuration)}</div>
              <div className="audio-waves-container">
                {[...Array(6)].map((_, i) => <span key={i} className="audio-bar" />)}
              </div>
            </div>
          )}
          <div className="active-call-controls">
            <button className={`btn-control ${isMuted ? 'mute-active' : ''}`} onClick={toggleMuteMicrophone} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <button className="btn-control active-danger" onClick={endActiveCall} title="End Call"><PhoneOff size={22} /></button>
            {callType === 'video' && (
              <button className={`btn-control ${isCamOff ? 'mute-active' : ''}`} onClick={toggleCameraStream} title={isCamOff ? 'Cam On' : 'Cam Off'}>
                {isCamOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
