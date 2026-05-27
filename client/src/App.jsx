import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Lock, 
  Send, Trash2, Heart, Download, Sparkles, LogOut, Bell, BellOff, Check, CheckCheck,
  Smile, MoreVertical
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
  } catch (e) {
    console.error("AudioContext error:", e);
  }
};

const playHeartbeatSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    
    // First beat
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.frequency.setValueAtTime(90, now);
    osc1.frequency.exponentialRampToValueAtTime(55, now + 0.12);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);
    
    // Second beat (after 180ms)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.frequency.setValueAtTime(90, now + 0.16);
    osc2.frequency.exponentialRampToValueAtTime(55, now + 0.32);
    gain2.gain.setValueAtTime(0.4, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.32);
  } catch (e) {
    console.error("AudioContext error:", e);
  }
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
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 0.5);
    };
    
    playChirp();
    const intervalId = setInterval(playChirp, 1400);
    
    return {
      stop: () => {
        clearInterval(intervalId);
        audioCtx.close();
      }
    };
  } catch (e) {
    console.error("AudioContext error:", e);
    return { stop: () => {} };
  }
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
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc1.start(now);
      osc2.start(now);
      
      osc1.stop(now + 1.8);
      osc2.stop(now + 1.8);
    };
    
    playRingback();
    const intervalId = setInterval(playRingback, 4000);
    
    return {
      stop: () => {
        clearInterval(intervalId);
        audioCtx.close();
      }
    };
  } catch (e) {
    console.error("AudioContext error:", e);
    return { stop: () => {} };
  }
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

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Room state
  const [me, setMe] = useState('');
  const [nickname, setNickname] = useState('');
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
  const [callType, setCallType] = useState('audio'); // 'audio' or 'video'
  const [isCalling, setIsCalling] = useState(false); // outbound ring
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

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Request Notification permission
  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        setBellGranted(permission === 'granted');
      });
    }
  };

  // Trigger floating hearts burst
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

  // Cleanup completed heart animations
  const removeHeart = (id) => {
    setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
  };

  // Handle clicking outside the emoji picker & more options dropdown to close them
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Insert emoji helper and restore focus
  const insertEmoji = (emoji) => {
    setTextInput((prev) => prev + emoji);
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 10);
  };

  // Listen for PWA install opportunity
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initial check of Notification permission
    if ('Notification' in window) {
      setBellGranted(Notification.permission === 'granted');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Set up socket listeners after login success
  useEffect(() => {
    if (!isAuthenticated) return;

    socket.connect();

    socket.on('me', (id) => {
      setMe(id);
    });

    socket.on('user-list', (users) => {
      setActiveUsers(users);
    });

    socket.on('receive-message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
      
      // If user is in background, send a web notification
      if (document.hidden && !msg.isSystem) {
        playMessageSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Message from ${msg.sender}`, {
            body: msg.isHeart ? '💖 [Heart Pulse]' : msg.text,
            icon: '/icon.svg',
            tag: 'viberoom-new-msg'
          });
        }
      } else if (!msg.isSystem && msg.sender !== nickname) {
        playMessageSound();
      }
    });

    socket.on('receive-heart', (data) => {
      // Physical vibration: standard double vibration (heartbeat)
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      playHeartbeatSound();
      triggerHeartsBurst();

      // Show background notification
      if (document.hidden) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`${data.sender} sent you a Heartbeat!`, {
            body: 'Tap to return the love 💖',
            icon: '/icon.svg',
            tag: 'viberoom-heart'
          });
        }
      }
    });

    socket.on('chat-cleared', (systemMsg) => {
      setChatMessages([systemMsg]);
    });

    socket.on('callUser', (data) => {
      // Avoid interruption if already in a call
      if (connectionRef.current || receivingCall || callAccepted) {
        return; 
      }
      setReceivingCall(true);
      setCaller(data.from);
      setCallerName(data.name);
      setCallerSignal(data.signal);
      setCallType(data.type);
      
      // Start ringtone sound and trigger phone vibration if allowed
      ringtoneRef.current = startIncomingRingtone();
      if (navigator.vibrate) {
        navigator.vibrate([500, 500, 500, 500, 500]);
      }
    });

    socket.on('callAccepted', (data) => {
      setCallAccepted(true);
      setIsCalling(false);
      setPartnerId(data.from);
      
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
        ringtoneRef.current = null;
      }

      if (connectionRef.current) {
        connectionRef.current.signal(data.signal);
      }
    });

    socket.on('callEnded', () => {
      cleanupCallStates();
    });

    // Handle standard server disconnect / reconnects
    socket.on('disconnect', () => {
      cleanupCallStates();
    });

    return () => {
      socket.off('me');
      socket.off('user-list');
      socket.off('receive-message');
      socket.off('receive-heart');
      socket.off('chat-cleared');
      socket.off('callUser');
      socket.off('callAccepted');
      socket.off('callEnded');
      socket.off('disconnect');
    };
  }, [isAuthenticated, nickname]);

  // Handle active call duration timer
  useEffect(() => {
    if (callAccepted && !callEnded) {
      setCallDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callAccepted, callEnded]);

  // Clean up all local media and calling states
  const cleanupCallStates = () => {
    setCallAccepted(false);
    setReceivingCall(false);
    setCallEnded(false);
    setIsCalling(false);
    setPartnerId('');
    setCallDuration(0);
    setIsMuted(false);
    setIsCamOff(false);

    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
      ringtoneRef.current = null;
    }

    if (navigator.vibrate) {
      navigator.vibrate(0); // Stop vibration
    }

    if (connectionRef.current) {
      try {
        connectionRef.current.destroy();
      } catch (e) {
        console.error(e);
      }
      connectionRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  };

  // Login handler
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!nicknameInput.trim()) {
      setLoginError('Please enter a nickname.');
      return;
    }
    if (!passwordInput) {
      setLoginError('Please enter the passphrase.');
      return;
    }

    setLoginError('');

    // Pre-connect check or request to server
    socket.connect();
    socket.emit('join-room', {
      nickname: nicknameInput,
      password: passwordInput
    });

    socket.once('join-success', (data) => {
      setIsAuthenticated(true);
      setNickname(nicknameInput);
      setChatMessages(data.chatHistory || []);
      
      // Prompt notification permission if default
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setBellGranted(permission === 'granted');
        });
      }
    });

    socket.once('join-error', (errMsg) => {
      setLoginError(errMsg);
      socket.disconnect();
    });
  };

  // Send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    socket.emit('send-message', {
      text: textInput,
      isHeart: false
    });
    setTextInput('');
  };

  // Send Heart pulse
  const handleSendHeart = () => {
    // Pulse animation local trigger
    setHeartPulseTrigger(true);
    setTimeout(() => setHeartPulseTrigger(false), 600);

    // Vibrate local phone
    if (navigator.vibrate) {
      navigator.vibrate([100]);
    }

    // Trigger local animation burst
    triggerHeartsBurst();
    playHeartbeatSound();

    // Emit to other users
    socket.emit('send-heart');

    // Also record it inside chat room
    socket.emit('send-message', {
      text: '💖 Sent a heartbeat!',
      isHeart: true
    });
  };

  // Clear chat
  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear chat history for everyone?")) {
      socket.emit('clear-chat');
    }
  };

  // Forgot email emergency wipe
  const handleForgotEmail = () => {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('forgot-reset');
    setLoginError('Could not find your Google Account. Please contact your Workspace administrator.');
  };

  // Install PWA Handler
  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation decision: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Make an Outbound Call (Audio or Video)
  const initiateCall = (type) => {
    cleanupCallStates(); // Ensure clean starting point
    setCallType(type);

    // Identify call partner (the user who isn't 'me')
    const partner = activeUsers.find(u => u.id !== socket.id);
    if (!partner) {
      alert("No partner is online in this room right now to call!");
      return;
    }
    
    setPartnerId(partner.id);
    setIsCalling(true);
    ringtoneRef.current = startOutgoingRingtone();

    navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: type === 'video' 
    })
    .then((stream) => {
      setLocalStream(stream);
      
      // If video call and localVideo is available, set source
      if (type === 'video' && localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream
      });

      peer.on('signal', (signalData) => {
        console.log("Caller signal created. Sending to partner...");
        socket.emit('callUser', {
          to: partner.id,
          signalData: signalData,
          type: type
        });
      });

      peer.on('stream', (remoteStream) => {
        console.log("Caller received remote stream.");
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = remoteStream;
        }
      });

      peer.on('close', () => {
        cleanupCallStates();
      });

      peer.on('error', (err) => {
        console.error("Peer error:", err);
        cleanupCallStates();
      });

      connectionRef.current = peer;
    })
    .catch((err) => {
      console.error("Failed to access camera/mic:", err);
      alert("Could not access camera or microphone. Please check permissions!");
      cleanupCallStates();
    });
  };

  // Answer an Inbound Call
  const acceptIncomingCall = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
      ringtoneRef.current = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }

    setCallAccepted(true);
    setReceivingCall(false);

    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video'
    })
    .then((stream) => {
      setLocalStream(stream);

      // Bind local video frame
      if (callType === 'video' && localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream
      });

      peer.on('signal', (signalData) => {
        socket.emit('answerCall', {
          signal: signalData,
          to: caller
        });
      });

      peer.on('stream', (remoteStream) => {
        console.log("Answerer received remote stream.");
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = remoteStream;
        }
      });

      peer.on('close', () => {
        cleanupCallStates();
      });

      peer.on('error', (err) => {
        console.error("Peer error:", err);
        cleanupCallStates();
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;
    })
    .catch((err) => {
      console.error("Failed to access camera/mic for answering:", err);
      alert("Could not access camera or microphone to answer!");
      declineIncomingCall();
    });
  };

  // Decline/End Call Handlers
  const declineIncomingCall = () => {
    socket.emit('endCall', { to: caller });
    cleanupCallStates();
  };

  const endActiveCall = () => {
    socket.emit('endCall', { to: partnerId || caller });
    cleanupCallStates();
  };

  // In-call Track controls
  const toggleMuteMicrophone = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCameraStream = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCamOff(!isCamOff);
    }
  };

  // Format timer duration
  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    cleanupCallStates();
    socket.disconnect();
    setIsAuthenticated(false);
    setNickname('');
  };

  // Set up local video element binding when localStream changes in video calls
  useEffect(() => {
    if (localVideo.current && localStream && callType === 'video') {
      localVideo.current.srcObject = localStream;
    }
  }, [localStream, callType, callAccepted, isCalling]);

  // --- RENDERING ROUTINES ---

  // 1. LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="google-login-screen">
        <div className="google-login-card">
          <div className="google-logo">
            {/* Modern Google Gmail Envelope Multi-Colored SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 38" width="48" height="38">
              <path d="M4.5,0 C2,0 0,2 0,4.5 L0,33.5 C0,36 2,38 4.5,38 L10.5,38 L10.5,9 L24,19.5 L37.5,9 L37.5,38 L43.5,38 C46,38 48,36 48,33.5 L48,4.5 C48,2 46,0 43.5,0 L36,0 L24,9 L12,0 L4.5,0 Z" fill="#EA4335" />
              <path d="M0,4.5 L0,33.5 C0,36 2,38 4.5,38 L10.5,38 L10.5,9 L0,4.5 Z" fill="#4285F4" />
              <path d="M48,4.5 L48,33.5 C48,36 46,38 43.5,38 L37.5,38 L37.5,9 L48,4.5 Z" fill="#34A853" />
              <path d="M10.5,9 L24,19.5 L37.5,9 L37.5,0 L36,0 L24,9 L12,0 L10.5,0 L10.5,9 Z" fill="#FBBC05" />
            </svg>
          </div>
          <h1>Sign in</h1>
          <p className="google-subtitle">to continue to workspace</p>
          
          <form onSubmit={handleLoginSubmit} className="google-form">
            <div className="google-input-group">
              <input 
                type="text" 
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                className="google-input"
                maxLength={15}
                required
                autoFocus
                placeholder=" "
                id="username"
              />
              <label htmlFor="username" className="google-label">Username</label>
            </div>
            
            <div className="google-input-group">
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={`google-input ${loginError ? 'google-input-error' : ''}`}
                required
                placeholder=" "
                id="password"
              />
              <label htmlFor="password" className="google-label">Password</label>
            </div>
            
            {loginError && <div className="google-error-msg">{loginError}</div>}
            
            <div className="google-form-footer">
              <span className="google-link" onClick={handleForgotEmail}>Forgot email?</span>
              <button type="submit" className="google-btn-login">
                login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. MAIN APPLICATION (CHAT & CALLS)
  const otherUsers = activeUsers.filter(u => u.id !== socket.id);
  const isPartnerOnline = otherUsers.length > 0;
  const partnerNameString = otherUsers.map(u => u.nickname).join(', ');

  return (
    <div className="app-container">
      
      {/* Dynamic Animated Floating Hearts Layer */}
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
            <div className="room-avatar" style={{ background: 'transparent', boxShadow: 'none' }}>
              {/* Colorful Gmail envelope SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 38" width="30" height="24">
                <path d="M4.5,0 C2,0 0,2 0,4.5 L0,33.5 C0,36 2,38 4.5,38 L10.5,38 L10.5,9 L24,19.5 L37.5,9 L37.5,38 L43.5,38 C46,38 48,36 48,33.5 L48,4.5 C48,2 46,0 43.5,0 L36,0 L24,9 L12,0 L4.5,0 Z" fill="#EA4335" />
                <path d="M0,4.5 L0,33.5 C0,36 2,38 4.5,38 L10.5,38 L10.5,9 L0,4.5 Z" fill="#4285F4" />
                <path d="M48,4.5 L48,33.5 C48,36 46,38 43.5,38 L37.5,38 L37.5,9 L48,4.5 Z" fill="#34A853" />
                <path d="M10.5,9 L24,19.5 L37.5,9 L37.5,0 L36,0 L24,9 L12,0 L10.5,0 L10.5,9 Z" fill="#FBBC05" />
              </svg>
            </div>
            <div className="room-details">
              <h3>Google Meet</h3>
              <div className="room-status">
                <span className="status-dot"></span>
                <span>
                  {isPartnerOnline ? `${partnerNameString} (Online)` : 'Waiting for partner...'}
                </span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            {/* Audio Call Button */}
            <button 
              className="header-btn btn-call" 
              onClick={() => initiateCall('audio')}
              disabled={!isPartnerOnline}
              title={isPartnerOnline ? "Start Audio Call" : "Partner is offline"}
            >
              <Phone size={20} />
            </button>

            {/* Video Call Button */}
            <button 
              className="header-btn btn-call-video" 
              onClick={() => initiateCall('video')}
              disabled={!isPartnerOnline}
              title={isPartnerOnline ? "Start Video Call" : "Partner is offline"}
            >
              <Video size={20} />
            </button>

            {/* More Options Dropdown */}
            <div className="more-menu-container">
              <button
                ref={moreMenuBtnRef}
                className={`header-btn ${showMoreMenu ? 'active' : ''}`}
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                title="More Options"
              >
                <MoreVertical size={20} />
              </button>
              {showMoreMenu && (
                <div className="header-dropdown-menu" ref={moreMenuRef}>
                  {isInstallable && (
                    <button 
                      className="dropdown-item btn-install" 
                      onClick={() => {
                        handleInstallApp();
                        setShowMoreMenu(false);
                      }} 
                      title="Install Google Meet App"
                    >
                      <Download size={18} />
                      <span>Install App</span>
                    </button>
                  )}
                  <button 
                    className="dropdown-item" 
                    onClick={() => {
                      requestNotificationPermission();
                      setShowMoreMenu(false);
                    }}
                    title={bellGranted ? "Notifications Enabled" : "Enable Browser Notifications"}
                  >
                    {bellGranted ? <Bell size={18} style={{ color: 'var(--wa-green)' }} /> : <BellOff size={18} />}
                    <span>Notifications</span>
                  </button>
                  <button 
                    className="dropdown-item" 
                    onClick={() => {
                      handleClearChat();
                      setShowMoreMenu(false);
                    }}
                    title="Clear Chat History"
                  >
                    <Trash2 size={18} />
                    <span>Clear Chat</span>
                  </button>
                  <button 
                    className="dropdown-item" 
                    onClick={() => {
                      handleLogout();
                      setShowMoreMenu(false);
                    }}
                    title="Logout from Workspace"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Chat Messages Log */}
        <div className="messages-container">
          {chatMessages.length === 0 ? (
            <div className="message-bubble system">
              No message history. Start typing below or tap the Heart beat 💖 to say hello!
            </div>
          ) : (
            chatMessages.map((msg) => {
              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="message-bubble system">
                    {msg.text}
                  </div>
                );
              }

              // Custom heart bubble
              if (msg.isHeart) {
                const isSentByMe = msg.sender === nickname;
                return (
                  <div 
                    key={msg.id} 
                    className={`message-bubble heart-bubble ${isSentByMe ? 'sent' : 'received'}`}
                  >
                    <div className="big-heart-container">
                      <div className="big-pulse-heart">💖</div>
                      <span className="heart-sender-label">
                        {isSentByMe ? 'You' : msg.sender} sent a heartbeat
                      </span>
                    </div>
                  </div>
                );
              }

              const isSentByMe = msg.sender === nickname;
              return (
                <div 
                  key={msg.id} 
                  className={`message-bubble ${isSentByMe ? 'sent' : 'received'}`}
                >
                  <span className="msg-sender">{isSentByMe ? 'You' : msg.sender}</span>
                  <span className="msg-text">{msg.text}</span>
                  <span className="msg-meta">
                    {msg.timestamp}
                    {isSentByMe && (
                      <span className="tick-icon">
                        {isPartnerOnline ? <CheckCheck size={13} /> : <Check size={13} />}
                      </span>
                    )}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <footer className="chat-input-bar">
          
          {/* Glowing Heart Haptic Button */}
          <button 
            className={`btn-heart-pulse ${heartPulseTrigger ? 'pulse-anim' : ''}`}
            onClick={handleSendHeart}
            title="Send Heart Haptic Vibration!"
          >
            <Heart size={22} fill="currentColor" />
          </button>

          {/* Emoji Picker Popover Container */}
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
                    <button
                      key={cat.name}
                      type="button"
                      className={`emoji-tab-btn ${activeEmojiTab === idx ? 'active' : ''}`}
                      onClick={() => setActiveEmojiTab(idx)}
                    >
                      {cat.tabIcon}
                    </button>
                  ))}
                </div>
                <div className="emoji-picker-title">
                  {EMOJI_CATEGORIES[activeEmojiTab].name}
                </div>
                <div className="emoji-picker-grid">
                  {EMOJI_CATEGORIES[activeEmojiTab].emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="emoji-item"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="chat-form">
            <input 
              type="text" 
              placeholder="Type a message..." 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="chat-input"
              ref={chatInputRef}
            />
            <button 
              type="submit" 
              className="btn-send"
              disabled={!textInput.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </footer>
      </div>

      {/* --- INBOUND CALL RINGING OVERLAY --- */}
      {receivingCall && (
        <div className="call-overlay">
          <div className="calling-user-info">
            <div className="calling-avatar">
              {callerName.slice(0, 2).toUpperCase()}
            </div>
            <h2>{callerName}</h2>
            <div className="call-type-tag">
              Incoming {callType === 'video' ? 'Video Call' : 'Voice Call'}
            </div>
          </div>

          <div className="ringing-pulse-animation">
            {callType === 'video' ? <Video size={36} /> : <Phone size={36} />}
          </div>

          <div className="call-actions">
            <button className="btn-call-action accept" onClick={acceptIncomingCall}>
              {callType === 'video' ? <Video size={24} /> : <Phone size={24} />}
            </button>
            <button className="btn-call-action decline" onClick={declineIncomingCall}>
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}

      {/* --- OUTBOUND CALL WAITING OVERLAY --- */}
      {isCalling && (
        <div className="call-overlay">
          <div className="calling-user-info">
            <div className="calling-avatar">
              {otherUsers[0]?.nickname.slice(0, 2).toUpperCase()}
            </div>
            <h2>Calling {otherUsers[0]?.nickname}</h2>
            <div className="call-type-tag">
              Ringing {callType === 'video' ? 'Video' : 'Voice'}...
            </div>
          </div>

          <div className="ringing-pulse-animation" style={{ backgroundColor: 'var(--accent-hover)' }}>
            {callType === 'video' ? <Video size={36} /> : <Phone size={36} />}
          </div>

          <div className="call-actions">
            <button className="btn-call-action decline" onClick={endActiveCall} style={{ width: '100%', maxWidth: '120px', borderRadius: '16px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- ACTIVE AUDIO/VIDEO CALL CONSOLE --- */}
      {(callAccepted && !callEnded) && (
        <div className="active-call-overlay">
          
          {callType === 'video' ? (
            // Video Call Display
            <div className="video-canvas-container">
              {/* Remote full screen stream */}
              <video 
                className="remote-video-frame" 
                ref={remoteVideo} 
                autoPlay 
                playsInline 
              />
              
              {/* Local picture-in-picture stream */}
              {!isCamOff && (
                <video 
                  className="local-video-pip" 
                  ref={localVideo} 
                  autoPlay 
                  playsInline 
                  muted 
                />
              )}
            </div>
          ) : (
            // Audio Call Display
            <div className="audio-call-ui">
              <div className="calling-avatar" style={{ width: '140px', height: '140px', fontSize: '3.5rem' }}>
                {otherUsers[0]?.nickname.slice(0, 2).toUpperCase()}
              </div>
              <h2>{otherUsers[0]?.nickname}</h2>
              <div className="active-call-timer">
                {formatTimer(callDuration)}
              </div>
              
              <div className="audio-waves-container">
                <span className="audio-bar"></span>
                <span className="audio-bar"></span>
                <span className="audio-bar"></span>
                <span className="audio-bar"></span>
                <span className="audio-bar"></span>
                <span className="audio-bar"></span>
              </div>
            </div>
          )}

          {/* Active Call Actions Panel */}
          <div className="active-call-controls">
            
            {/* Audio Mute Switch */}
            <button 
              className={`btn-control ${isMuted ? 'mute-active' : ''}`}
              onClick={toggleMuteMicrophone}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* End Call Button */}
            <button 
              className="btn-control active-danger"
              onClick={endActiveCall}
              title="End Call"
            >
              <PhoneOff size={22} />
            </button>

            {/* Video Stop Switch (Only visible for Video call) */}
            {callType === 'video' && (
              <button 
                className={`btn-control ${isCamOff ? 'mute-active' : ''}`}
                onClick={toggleCameraStream}
                title={isCamOff ? "Turn Cam On" : "Turn Cam Off"}
              >
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
