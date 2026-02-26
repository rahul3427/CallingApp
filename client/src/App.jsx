import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import { Phone, PhoneOff, Mic, MicOff, Lock } from 'lucide-react';
import './App.css';

// Dynamically determine the backend URL based on Environment
const SOCKET_URL = import.meta.env.VITE_DEV_SERVER === 'true' || window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : '/';
const socket = io(SOCKET_URL);
const APP_PASSWORD = "RahulMayuri"; 

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  const [me, setMe] = useState('');
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const remoteAudio = useRef();
  const connectionRef = useRef();

  const leaveCall = (reload = true) => {
    setCallEnded(true);
    setReceivingCall(false);
    setCallAccepted(false);
    
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    
    if (reload) {
        window.location.reload(); 
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error);
      });

    socket.on('me', (id) => setMe(id));

    socket.on('callUser', (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    socket.on('callEnded', () => {
      leaveCall(false); 
    });

    return () => {
      socket.off('me');
      socket.off('callUser');
      socket.off('callEnded');
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === APP_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  };

  const callPartner = () => {
    const peer = new Peer({
      initiator: true, 
      trickle: false, 
      stream: stream
    });

    peer.on('signal', (data) => {
      socket.emit('callUser', { signalData: data, from: me });
    });

    peer.on('stream', (remoteStream) => {
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = remoteStream;
      }
    });

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    setReceivingCall(false);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    });

    peer.on('signal', (data) => {
      socket.emit('answerCall', { signal: data, to: caller });
    });

    peer.on('stream', (remoteStream) => {
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = remoteStream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const declineCall = () => {
    setReceivingCall(false);
  }

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <div className="login-panel">
          <div className="lock-icon">
            <Lock size={40} />
          </div>
          <h2>Private Connection</h2>
          <p>Please enter the passphrase to connect to the signaling server.</p>
          <form onSubmit={handleLogin} className="login-form">
            <input 
              type="password" 
              placeholder="Passphrase" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className={passwordError ? "input-error" : ""}
              autoFocus
            />
            {passwordError && <span className="error-text">Incorrect passphrase</span>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Enter</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Sonar</h1>
        <p>Private Peer-to-Peer Voice Calling</p>
      </header>

      {!callAccepted && !receivingCall && (
        <div className="panel" style={{ alignItems: 'center', textAlign: 'center' }}>
          <h2>Ready to Connect</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Click below to instantly ring the other active partner.
          </p>
          <button 
            className="btn btn-success" 
            onClick={callPartner}
            disabled={!stream}
            style={{ width: '80%', padding: '1rem' }}
          >
            <Phone size={24} style={{ marginRight: '10px' }} /> 
            <span style={{ fontSize: '1.2rem' }}>Call Partner</span>
          </button>
        </div>
      )}

      {receivingCall && !callAccepted && (
        <div className="panel incoming-call">
          <div className="ringing-animation">
            <Phone size={32} />
          </div>
          <h3>Incoming Call</h3>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Your partner is calling you</p>
          <div className="actions">
            <button className="btn btn-success" onClick={answerCall}>
              <Phone size={20} /> Answer
            </button>
            <button className="btn btn-danger" onClick={declineCall}>
              <PhoneOff size={20} /> Decline
            </button>
          </div>
        </div>
      )}

      {callAccepted && !callEnded && (
        <div className="panel active-call-panel">
          <div className="active-call-ui">
            <h3>Call Active</h3>
            <div className="audio-waves">
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
            </div>
            <p style={{ color: 'var(--success-color)', fontWeight: '500' }}>Connected securely</p>
          </div>
          <div className="actions">
            <button 
              className={`btn ${isMuted ? 'btn-danger' : 'btn-primary'}`} 
              onClick={toggleMute}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button className="btn btn-danger" onClick={leaveCall}>
              <PhoneOff size={20} /> End Call
            </button>
          </div>
        </div>
      )}

      <audio playsInline ref={remoteAudio} autoPlay />
    </div>
  );
}

export default App;
