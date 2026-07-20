import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Phone, 
  PhoneOff, 
  MessageSquare, 
  Camera, 
  Network, 
  Map, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Send, 
  Upload,
  Info,
  Zap
} from 'lucide-react';
import './App.css';

// Web Speech API Types
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface ExtendedWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

const customWindow = window as unknown as ExtendedWindow;

// Types
type TabType = 'calls' | 'whatsapp' | 'cv' | 'graph' | 'map';
type CallState = 'idle' | 'incoming' | 'active' | 'hangup' | 'verdict';

// Mock Digital Arrest call scenarios
const SCENARIOS = [
  {
    name: 'CBI / Customs Drug Scam',
    incomingNumber: '+91 98450 12093 (Spoofed)',
    riskLevel: 'HIGH RISK (94%)',
    tags: ['VOIP Call', 'Non-registered SIM', 'Impersonation ID'],
    dialogue: [
      { speaker: 'scammer', text: 'Hello, this is Inspector Rahul Sharma from the Delhi Customs Cyber Cell.' },
      { speaker: 'user', text: 'Yes, hello? What is this about?' },
      { speaker: 'scammer', text: 'A package sent under your Aadhaar number has been seized at Mumbai Airport. It contains 50 grams of MDMA drugs and fake passport documents.' },
      { speaker: 'user', text: 'What?! I didn\'t send any package!' },
      { speaker: 'scammer', text: 'Since your credentials are implicated, you are now under digital arrest. You must not close this video call or tell anyone. This is a highly confidential national security case.' },
      { speaker: 'user', text: 'But I am innocent, please help me.' },
      { speaker: 'scammer', text: 'To verify your bank accounts are not laundering drug money, you must transfer a security deposit of ₹3,50,000 to our verified RBI hold account right now.' },
      { speaker: 'scammer', text: 'If you fail to do so, we will dispatch local police to arrest you and freeze all assets immediately.' }
    ]
  },
  {
    name: 'Urgent Electricity Bill Spammer',
    incomingNumber: '+91 80211 44921',
    riskLevel: 'MEDIUM RISK (65%)',
    tags: ['VoIP Prefix', 'Recent Report Clustered'],
    dialogue: [
      { speaker: 'scammer', text: 'Dear customer, your electricity connection will be disconnected tonight at 9:30 PM due to non-payment of previous bill.' },
      { speaker: 'user', text: 'Oh, let me check. I thought I paid it.' },
      { speaker: 'scammer', text: 'Do not pay on app. Pay immediately on our verification link or call our executive at this number to clear the warning.' },
      { speaker: 'user', text: 'Can I pay tomorrow?' },
      { speaker: 'scammer', text: 'No, connection cuts immediately. Download this app called QuickSupport so I can update your bill status live.' }
    ]
  }
];

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('calls');
  const [systemStatus, setSystemStatus] = useState<'nominal' | 'active_alert'>('nominal');

  // Call Screening State
  const [callState, setCallState] = useState<CallState>('idle');
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [callTranscript, setCallTranscript] = useState<{ speaker: 'scammer' | 'user'; text: string }[]>([]);
  const [scamScore, setScamScore] = useState(0);
  const [detectedTriggers, setDetectedTriggers] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const dialogueTimerRef = useRef<any | null>(null);

  // WhatsApp State
  const [waMessages, setWaMessages] = useState<{ sender: 'bot' | 'user'; text: string; time: string }[]>([
    { sender: 'bot', text: 'Jai Hind! I am RakshaBot, your Digital Public Safety Assistant. Send me details or paste suspicious chats to check for fraud indicators.', time: '14:40' }
  ]);
  const [waInput, setWaInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // OpenCV CV Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'alert'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cvFeatures, setCvFeatures] = useState<{ name: string; status: 'ok' | 'fail' | 'checking' }[]>([
    { name: 'Mahatma Gandhi Watermark Alignment', status: 'checking' },
    { name: 'Security Thread Fluorescent Shift', status: 'checking' },
    { name: 'Microprint Security Lettering', status: 'checking' },
    { name: 'Intaglio Printing Latent Image', status: 'checking' }
  ]);

  // Admin Graph State
  const [selectedNode, setSelectedNode] = useState<any>({
    id: 'V1',
    label: 'Victim Account (V1)',
    type: 'victim',
    details: { name: 'Karan Mehra', bank: 'SBI', location: 'Delhi', loss: '₹3,50,000', device: 'OnePlus 11R' }
  });

  // Map Filter State
  const [mapFilter, setMapFilter] = useState<'all' | 'arrests' | 'seizures' | 'cells'>('all');

  // Trigger words to scan transcripts for
  const SCAM_TRIGGERS = [
    { word: 'digital arrest', weight: 45, label: 'Authority Impersonation Threat' },
    { word: 'customs cell', weight: 20, label: 'Customs Seizure Impersonation' },
    { word: 'aadhaar', weight: 15, label: 'Identity Verification Coercion' },
    { word: 'rbi hold account', weight: 30, label: 'Fraudulent Escrow / Payment demand' },
    { word: 'seized', weight: 15, label: 'Package confiscation claim' },
    { word: 'confidential', weight: 15, label: 'Secrecy Coercion' },
    { word: 'laundering', weight: 25, label: 'Money Laundering implication' },
    { word: 'quicksupport', weight: 35, label: 'Remote Access Tool installation' }
  ];

  // Initialize Web Speech API for live browser mic input
  useEffect(() => {
    const SpeechRecognition = customWindow.SpeechRecognition || customWindow.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-IN';

      rec.onresult = (event: SpeechRecognitionEvent) => {
        const resultIndex = event.resultIndex;
        const transcriptText = event.results[resultIndex][0].transcript.trim();
        
        setCallTranscript(prev => [...prev, { speaker: 'scammer', text: transcriptText }]);
        evaluateTextForScam(transcriptText);
      };

      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        console.error('Speech Recognition Error:', e.error);
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Sync scam level and global alert state
  useEffect(() => {
    if (scamScore >= 80 && callState === 'active') {
      setCallState('hangup');
      setSystemStatus('active_alert');
      // Play mock automatic disconnection warning
      if (dialogueTimerRef.current) clearInterval(dialogueTimerRef.current);
    }
  }, [scamScore, callState]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (dialogueTimerRef.current) clearInterval(dialogueTimerRef.current);
    };
  }, []);

  // Evaluate transcript segments for fraud markers
  const evaluateTextForScam = (text: string) => {
    const lowerText = text.toLowerCase();
    let scoreGain = 0;
    const newTriggers: string[] = [];

    SCAM_TRIGGERS.forEach(trigger => {
      if (lowerText.includes(trigger.word) && !detectedTriggers.includes(trigger.label)) {
        scoreGain += trigger.weight;
        newTriggers.push(trigger.label);
      }
    });

    if (scoreGain > 0) {
      setScamScore(prev => Math.min(prev + scoreGain, 100));
      setDetectedTriggers(prev => [...prev, ...newTriggers]);
    }
  };

  // Start Call Scenario (Simulated or Live Microphone)
  const startCall = (useLiveMic: boolean = false) => {
    setCallTranscript([]);
    setScamScore(0);
    setDetectedTriggers([]);
    setSystemStatus('nominal');
    setCallState('active');

    if (useLiveMic) {
      if (recognitionRef.current) {
        setIsListening(true);
        recognitionRef.current.start();
        setCallTranscript([{ speaker: 'bot' as any, text: '[LIVE MIC CONNECTED: Speak now to test script matching...]' }]);
      } else {
        alert('Web Speech API is not supported on this browser. Starting simulator instead.');
        startSimulatedCall();
      }
    } else {
      startSimulatedCall();
    }
  };

  const startSimulatedCall = () => {
    const scenario = SCENARIOS[selectedScenario];
    let step = 0;

    dialogueTimerRef.current = setInterval(() => {
      if (step < scenario.dialogue.length) {
        const dialogLine = scenario.dialogue[step];
        setCallTranscript(prev => [...prev, { speaker: dialogLine.speaker as 'scammer' | 'user', text: dialogLine.text }]);
        
        if (dialogLine.speaker === 'scammer') {
          evaluateTextForScam(dialogLine.text);
        }
        step++;
      } else {
        if (dialogueTimerRef.current) clearInterval(dialogueTimerRef.current);
      }
    }, 4500);
  };

  const endCall = () => {
    if (dialogueTimerRef.current) clearInterval(dialogueTimerRef.current);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    setCallState('verdict');
  };

  const resetCallState = () => {
    setCallState('idle');
    setScamScore(0);
    setCallTranscript([]);
    setDetectedTriggers([]);
  };

  // WhatsApp chatbot response logic
  const handleWaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waInput.trim()) return;

    const userText = waInput;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setWaMessages(prev => [...prev, { sender: 'user', text: userText, time: timeString }]);
    setWaInput('');

    // Process reply
    setTimeout(() => {
      let replyText = 'Analyzing your request... ';
      const lower = userText.toLowerCase();

      if (lower.includes('digital arrest') || lower.includes('police') || lower.includes('parcel')) {
        replyText = '⚠️ CRITICAL: Real government/police agencies will NEVER place citizens under "digital arrest" via video calls, nor demand money to clear cases. Do not stay on the call. Report this number to NCRB portal immediately.';
      } else if (lower.includes('electricity') || lower.includes('bill')) {
        replyText = '⚠️ FRAUD WARNING: Official electricity boards never message demanding payment via private numbers or remote desktop apps. Always verify status on your official utility provider app.';
      } else if (lower.includes('qr') || lower.includes('scan')) {
        replyText = '💡 ADVISORY: Scanning a QR code is only for SENDING money, never for RECEIVING cash. Do not scan any QR codes sent by unknown buyers on OLX/Marketplace.';
      } else {
        replyText = '📋 RAKSHABOT VERDICT: No direct script matches found. If they request payment or download of screen-share tools (like AnyDesk/TeamViewer), disconnect immediately. I can scan full text chat exports if uploaded.';
      }

      setWaMessages(prev => [...prev, { sender: 'bot', text: replyText, time: timeString }]);
    }, 1000);
  };

  const simulateChatUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setWaMessages(prev => [
        ...prev, 
        { sender: 'user', text: '📎 Uploaded exported_chat_log.txt', time: timeString },
        { sender: 'bot', text: '🔍 File Scan Completed. Found 3 threat clusters:\n1. Threat/Urgency tone matched.\n2. Threat to block identity documents (Aadhaar).\n3. Bank escrow transfer demands.\n\n⚠️ VERDICT: High Fraud Probability (91%). Disconnect communications.', time: timeString }
      ]);
    }, 1500);
  };

  // OpenCV Webcam simulation
  const startCamera = async () => {
    setScanStatus('scanning');
    setCameraActive(true);
    setCvFeatures([
      { name: 'Mahatma Gandhi Watermark Alignment', status: 'checking' },
      { name: 'Security Thread Fluorescent Shift', status: 'checking' },
      { name: 'Microprint Security Lettering', status: 'checking' },
      { name: 'Intaglio Printing Latent Image', status: 'checking' }
    ]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Simulate scan sequence
      let index = 0;
      const interval = setInterval(() => {
        if (index < 4) {
          setCvFeatures(prev => {
            const copy = [...prev];
            copy[index].status = Math.random() > 0.15 ? 'ok' : 'fail';
            return copy;
          });
          index++;
        } else {
          clearInterval(interval);
          setScanStatus('success');
        }
      }, 1000);

    } catch (err) {
      console.warn('Camera blocked or not available. Running mock file upload scan.');
      // Fallback scan simulation
      let index = 0;
      const interval = setInterval(() => {
        if (index < 4) {
          setCvFeatures(prev => {
            const copy = [...prev];
            copy[index].status = Math.random() > 0.1 ? 'ok' : 'fail';
            return copy;
          });
          index++;
        } else {
          clearInterval(interval);
          setScanStatus('success');
        }
      }, 1000);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
    setScanStatus('idle');
  };

  return (
    <div className="app-container">
      {/* Dashboard Top Header */}
      <header className="app-header">
        <div className="brand-section">
          <ShieldAlert className="brand-logo" size={32} />
          <h1 className="brand-title">RakshaNet</h1>
          <span className="brand-badge">PUBLIC SAFETY v1.2</span>
        </div>
        
        <div className="system-status">
          <span className={`status-dot ${systemStatus === 'active_alert' ? 'animate-pulse-red' : ''}`} style={{ backgroundColor: systemStatus === 'active_alert' ? '#ef4444' : '#10b981' }}></span>
          {systemStatus === 'active_alert' ? '🚨 REAL-TIME SCAM DETECTED' : '🛡️ SYSTEM MONITORING SECURE'}
        </div>
      </header>

      {/* Main Tab Links */}
      <nav className="tab-navigation">
        <button className={`tab-btn ${activeTab === 'calls' ? 'active' : ''}`} onClick={() => setActiveTab('calls')}>
          <Phone size={18} />
          Call Screening
        </button>
        <button className={`tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setActiveTab('whatsapp')}>
          <MessageSquare size={18} />
          Citizen Shield (WhatsApp)
        </button>
        <button className={`tab-btn ${activeTab === 'cv' ? 'active' : ''}`} onClick={() => setActiveTab('cv')}>
          <Camera size={18} />
          Counterfeit Scanner
        </button>
        <button className={`tab-btn ${activeTab === 'graph' ? 'active' : ''}`} onClick={() => setActiveTab('graph')}>
          <Network size={18} />
          Admin Fraud Graph
        </button>
        <button className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          <Map size={18} />
          Hotspot Command
        </button>
      </nav>

      {/* Main Panel Content */}
      <main className="main-content">
        
        {/* TAB 1: CALL SCREENING */}
        {activeTab === 'calls' && (
          <div className="dashboard-grid">
            
            {/* Phone Emulator Column */}
            <div className="phone-simulator-container">
              <div className="phone-shell">
                <div className="phone-notch"></div>
                
                <div className={`phone-screen ${scamScore >= 60 ? 'scam-warning' : ''}`}>
                  
                  {callState === 'idle' && (
                    <div style={{ margin: 'auto', textAlign: 'center', width: '100%' }}>
                      <Phone size={48} className="accent-glow" style={{ color: 'var(--accent-purple)', marginBottom: 20 }} />
                      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Call Screening Sandbox</h3>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 24 }}>Select scenario and launch incoming call test</p>
                      
                      <div style={{ textAlign: 'left', marginBottom: 24 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>SELECT THREAT CASE</label>
                        <select 
                          style={{ width: '100%', background: '#111219', border: '1px solid var(--border-color)', color: 'white', padding: 8, borderRadius: 6, fontSize: 13 }}
                          value={selectedScenario}
                          onChange={(e) => setSelectedScenario(Number(e.target.value))}
                        >
                          {SCENARIOS.map((sc, i) => <option key={i} value={i}>{sc.name}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button 
                          className="tab-btn active" 
                          style={{ justifyContent: 'center', padding: '10px' }}
                          onClick={() => setCallState('incoming')}
                        >
                          Trigger Incoming Call
                        </button>
                        <button 
                          className="tab-btn" 
                          style={{ justifyContent: 'center', padding: '10px', border: '1px solid var(--border-color)' }}
                          onClick={() => startCall(true)}
                        >
                          <Zap size={14} /> Test with My Mic (Live ASR)
                        </button>
                      </div>
                    </div>
                  )}

                  {callState === 'incoming' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 10px 10px' }}>
                      <div className="call-header">
                        <div className="caller-avatar">
                          <User size={40} />
                        </div>
                        <h3 className="caller-name">{SCENARIOS[selectedScenario].incomingNumber}</h3>
                        <p style={{ color: 'var(--color-danger)', fontSize: 12, fontWeight: 'bold' }}>{SCENARIOS[selectedScenario].riskLevel}</p>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 10 }}>
                          {SCENARIOS[selectedScenario].tags.map((tg, idx) => (
                            <span key={idx} style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4 }}>{tg}</span>
                          ))}
                        </div>
                      </div>

                      <div style={{ padding: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, fontSize: 12 }}>
                        <AlertTriangle style={{ color: 'var(--color-danger)', display: 'inline', marginRight: 6 }} size={16} />
                        <strong>SYSTEM ALERT:</strong> Caller matches VoIP signatures linked to ongoing digital arrest scams in the NCRP cluster database.
                      </div>

                      <div className="call-controls">
                        <button className="phone-btn decline" onClick={() => setCallState('idle')}>
                          <PhoneOff size={24} />
                        </button>
                        <button className="phone-btn accept" onClick={() => startCall(false)}>
                          <Phone size={24} />
                        </button>
                      </div>
                    </div>
                  )}

                  {callState === 'active' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div className="call-header" style={{ marginTop: 10 }}>
                        <h4 className="caller-name" style={{ fontSize: 16 }}>{SCENARIOS[selectedScenario].incomingNumber}</h4>
                        <div className="system-status" style={{ fontSize: 11, justifyContent: 'center', color: scamScore >= 60 ? '#f87171' : '#4ade80' }}>
                          <span className="status-dot" style={{ backgroundColor: scamScore >= 60 ? '#ef4444' : '#10b981' }}></span>
                          {scamScore >= 60 ? 'CRITICAL: RISK LEVEL EXCEEDED' : 'SECURE LINE: CALL SCREENING ACTIVE'}
                        </div>
                      </div>

                      <div className="transcript-area">
                        {callTranscript.map((t, idx) => (
                          <div key={idx} className={`transcript-line ${t.speaker}`}>
                            <strong>{t.speaker === 'scammer' ? 'Caller' : 'User'}:</strong> {t.text}
                          </div>
                        ))}
                      </div>

                      <div className="call-controls" style={{ padding: '0 0 10px' }}>
                        <button className="phone-btn decline" onClick={endCall}>
                          <PhoneOff size={24} />
                        </button>
                      </div>
                    </div>
                  )}

                  {callState === 'hangup' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 20 }}>
                      <div className="phone-btn decline animate-pulse-red" style={{ width: 80, height: 80, marginBottom: 20 }}>
                        <PhoneOff size={36} />
                      </div>
                      <h3 style={{ color: 'var(--color-danger)', fontSize: 20, marginBottom: 10 }}>CALL TERMINATED</h3>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 30 }}>
                        RakshaNet intercepted this call and suggested immediate disconnect. A threat pattern match of <strong>{scamScore}%</strong> was reached.
                      </p>
                      <button className="tab-btn active" onClick={() => setCallState('verdict')}>
                        View Explainable AI Verdict
                      </button>
                    </div>
                  )}

                  {callState === 'verdict' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 10px' }}>
                      <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <CheckCircle style={{ color: 'var(--color-success)', margin: '0 auto 10px' }} size={40} />
                        <h4 style={{ margin: 0 }}>Incident Report Saved</h4>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>ID: RN-8029A-2026</p>
                      </div>

                      <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, fontSize: 12 }}>
                        <strong style={{ color: 'var(--accent-purple)' }}>VERDICT DETAILS:</strong>
                        <div style={{ margin: '8px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                          Risk Score: <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{scamScore}%</span>
                        </div>
                        <strong style={{ display: 'block', marginBottom: 6 }}>MATCHED PLAYBOOKS:</strong>
                        {detectedTriggers.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)' }}>None (Standard Call)</div>
                        ) : (
                          detectedTriggers.map((trig, idx) => (
                            <div key={idx} style={{ color: '#fda4af', padding: '2px 0' }}>• {trig}</div>
                          ))
                        )}
                        <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 12 }}>
                          This report has been pre-packaged and auto-filed to the Ministry of Home Affairs (MHA) cybercrime repository.
                        </p>
                      </div>

                      <button className="tab-btn" style={{ marginTop: 16, border: '1px solid var(--border-color)' }} onClick={resetCallState}>
                        Reset Sandbox
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Explainable AI Dashboard column */}
            <div className="explain-panel">
              <div className="glass-card scam-score-card">
                <h3>Live Threat Evaluation Indicator</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Fusing Voice Spoof + Script Similarity parameters in real time</p>
                
                <div className="score-dial-container">
                  <svg className="score-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border-color)" strokeWidth="8" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke={scamScore >= 80 ? 'var(--color-danger)' : scamScore >= 50 ? 'var(--color-warning)' : 'var(--accent-purple)'} 
                      strokeWidth="8" 
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - scamScore / 100)}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <span className="score-text" style={{ color: scamScore >= 80 ? 'var(--color-danger)' : 'white' }}>{scamScore}%</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
                  <div style={{ background: '#111219', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>VOICE SPOOF METRIC</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: scamScore >= 60 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {scamScore > 0 ? `${Math.min(scamScore + 10, 98)}% Synthetic` : '0%'}
                    </div>
                  </div>
                  <div style={{ background: '#111219', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SCRIPT SIMILARITY</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: scamScore >= 80 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {scamScore}% Matches
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <h3>Detected Script Indicators</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Playbook templates and coercion markers matched from police databases</p>
                <div className="scam-factors-list">
                  {SCAM_TRIGGERS.map((trigger, idx) => {
                    const isActive = detectedTriggers.includes(trigger.label);
                    return (
                      <div key={idx} className={`scam-factor-item ${isActive ? 'active' : ''}`}>
                        <span className="factor-name">{trigger.word.toUpperCase()}</span>
                        <span style={{ fontSize: 11, color: isActive ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                          {isActive ? `DETECTED (+${trigger.weight}%)` : 'PENDING'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: CITIZEN SHIELD (WHATSAPP) */}
        {activeTab === 'whatsapp' && (
          <div className="dashboard-grid">
            <div className="whatsapp-container">
              <div className="wa-header">
                <div className="wa-avatar">R</div>
                <div className="wa-info">
                  <div className="wa-name">RakshaBot (NCRP Guard)</div>
                  <div className="wa-status">Online • Public Helpline</div>
                </div>
              </div>

              <div className="wa-chat">
                {waMessages.map((msg, idx) => (
                  <div key={idx} className={`wa-msg ${msg.sender}`}>
                    <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
                    <div style={{ fontSize: 9, color: '#8696a0', textAlign: 'right', marginTop: 4 }}>{msg.time}</div>
                  </div>
                ))}
              </div>

              <form className="wa-input-area" onSubmit={handleWaSubmit}>
                <button type="button" className="wa-btn" title="Simulate Chat Log Export Upload" onClick={simulateChatUpload} disabled={isUploading}>
                  <Upload size={20} />
                </button>
                <input 
                  type="text" 
                  className="wa-input" 
                  placeholder="Ask about digital arrest, electricity bill scams..." 
                  value={waInput}
                  onChange={(e) => setWaInput(e.target.value)}
                />
                <button type="submit" className="wa-btn">
                  <Send size={20} style={{ color: 'var(--accent-purple)' }} />
                </button>
              </form>
            </div>

            <div className="explain-panel">
              <div className="glass-card">
                <h3>Chat Scanner & Screenshot OCR</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Citizens cannot allow direct chat access due to WhatsApp\'s encryption. 
                  Instead, they can **Export Chat logs** or upload **Screenshots** to parse text.
                </p>

                <div style={{ border: '2px dashed var(--border-color)', padding: 30, borderRadius: 12, textAlign: 'center', background: '#111219', marginBottom: 20 }}>
                  <AlertTriangle style={{ color: 'var(--color-warning)', margin: '0 auto 12px' }} size={32} />
                  <h4>Simulate WhatsApp Chat Screenshot Upload</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Upload a suspicious chat screenshot to run OCR + LLM analysis</p>
                  
                  <button 
                    className="tab-btn active" 
                    style={{ margin: '0 auto', display: 'flex' }}
                    onClick={() => {
                      setIsUploading(true);
                      setTimeout(() => {
                        setIsUploading(true);
                        setTimeout(() => {
                          setIsUploading(false);
                          const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          setWaMessages(prev => [
                            ...prev,
                            { sender: 'user', text: '📷 [Uploaded chat_screenshot.png]', time: timeString },
                            { sender: 'bot', text: '🔎 OCR TEXT EXTRACTED:\n"You must pay ₹25,000 immediately or your police warrant will be issued. Do not close this chat."\n\n🚨 VERDICT: High Fraud Probability (95%). Fake police authority indicators detected.', time: timeString }
                          ]);
                        }, 1000);
                      }, 500);
                    }}
                  >
                    Simulate Screenshot OCR Scan
                  </button>
                </div>

                <div style={{ background: '#12131a', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
                    <Info size={16} style={{ color: 'var(--accent-purple)' }} />
                    Multilingual Translation Support
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Our model parses code-mixed inputs (Hinglish, Tanglish) and generates advisory alerts in 12 regional languages (Hindi, Tamil, Telugu, etc.) to assist non-tech-savvy vulnerable populations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COUNTERFEIT SCANNER */}
        {activeTab === 'cv' && (
          <div className="dashboard-grid">
            <div className="cv-container">
              <div className="glass-card" style={{ width: '100%', maxWidth: 480 }}>
                <h3>Computer Vision Note Verification</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>merchants/bank tellers point-of-sale scanner mockup</p>

                <div className="camera-box">
                  {cameraActive ? (
                    <>
                      <video ref={videoRef} autoPlay playsInline className="webcam-stream" />
                      <div className="scan-overlay scanning">
                        <div className="scan-laser"></div>
                        {scanStatus === 'scanning' && (
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.7)', padding: '6px 12px', borderRadius: 4, fontSize: 11 }}>
                            Analyzing currency security parameters...
                          </div>
                        )}
                        {scanStatus === 'success' && (
                          <>
                            <div className="cv-tag" style={{ top: '20%', left: '40%' }}>WATERMARK OK</div>
                            <div className="cv-tag" style={{ top: '48%', left: '55%' }}>THREAD FLUORESCENCE OK</div>
                            <div className="cv-tag" style={{ top: '80%', left: '20%' }}>SERIAL NUMBER VALID</div>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 12 }}>
                      <Camera size={40} style={{ color: 'var(--text-muted)' }} />
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Camera stream is off</p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button className="tab-btn active" style={{ flex: 1, justifyContent: 'center' }} onClick={startCamera}>
                    Activate Scanner
                  </button>
                  <button className="tab-btn" style={{ flex: 1, justifyContent: 'center', border: '1px solid var(--border-color)' }} onClick={stopCamera}>
                    Stop Camera
                  </button>
                </div>
              </div>
            </div>

            <div className="explain-panel">
              <div className="glass-card">
                <h3>Security Parameter Checks</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Targeted verification points analyzed in real-time under OpenCV layers</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cvFeatures.map((ft, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#111219', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                      <span style={{ fontSize: 13 }}>{ft.name}</span>
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 'bold', 
                        color: ft.status === 'ok' ? 'var(--color-success)' : ft.status === 'fail' ? 'var(--color-danger)' : 'var(--color-warning)'
                      }}>
                        {ft.status === 'ok' ? '✓ VALIDATED' : ft.status === 'fail' ? '✗ NOT DETECTED' : 'PENDING SCAN'}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, padding: 16, background: scanStatus === 'success' ? 'rgba(16, 185, 129, 0.08)' : '#111219', border: `1px solid ${scanStatus === 'success' ? 'var(--color-success)' : 'var(--border-color)'}`, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 6px' }}>VERDICT RESULT:</h4>
                  {scanStatus === 'success' ? (
                    <p style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: 14 }}>
                      ✓ Note Verified Genuine. Confidence Score: 98.4%
                    </p>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      Please activate the camera scanner to run validation.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ADMIN FRAUD GRAPH */}
        {activeTab === 'graph' && (
          <div className="dashboard-grid">
            <div className="glass-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3>Fraud Network Graph & Mule Mapping</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Mapping coordinated digital arrest transactions and money flow cycles</p>
                </div>
                <div style={{ fontSize: 11, background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', padding: '4px 10px', borderRadius: 4, fontWeight: 'bold' }}>
                  🚨 4 HIGH-VELOCITY MULE RINGS DETECTED
                </div>
              </div>

              {/* Graphic Mock of the Node Chart using SVG */}
              <div className="graph-container">
                <svg width="100%" height="100%" viewBox="0 0 800 450">
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
                    </marker>
                    <marker id="arrow-red" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                    </marker>
                  </defs>

                  {/* Transaction Edges */}
                  {/* Victim to Mule 1 */}
                  <line x1="150" y1="225" x2="300" y2="150" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arrow-red)" />
                  {/* Victim to Mule 2 */}
                  <line x1="150" y1="225" x2="300" y2="300" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow-red)" />
                  {/* Mule 1 to Layer 2 Node A */}
                  <line x1="300" y1="150" x2="480" y2="100" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  {/* Mule 1 to Layer 2 Node B */}
                  <line x1="300" y1="150" x2="480" y2="200" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  {/* Mule 2 to Layer 2 Node C */}
                  <line x1="300" y1="300" x2="480" y2="300" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  {/* Circular feedback alert edge (Mule to Mule cycle) */}
                  <path d="M 480 300 Q 390 390 300 300" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow-red)" />

                  {/* Nodes */}
                  {/* Victim */}
                  <circle cx="150" cy="225" r="22" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2" style={{ cursor: 'pointer' }} onClick={() => setSelectedNode({
                    id: 'V1', label: 'Victim Account (V1)', type: 'victim', details: { name: 'Karan Mehra', bank: 'SBI', location: 'Delhi', loss: '₹3,50,000', device: 'OnePlus 11R' }
                  })} />
                  <text x="150" y="270" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">VICTIM (Karan M.)</text>

                  {/* Layer 1 Mule 1 */}
                  <circle cx="300" cy="150" r="18" fill="#b45309" stroke="#f59e0b" strokeWidth="2" style={{ cursor: 'pointer' }} onClick={() => setSelectedNode({
                    id: 'M1', label: 'Layer 1 Mule (M1)', type: 'mule', details: { name: 'Sanjay Kumar', bank: 'HDFC', location: 'Jamtara', loss: '₹2,00,000 incoming', device: 'Vivo Y20' }
                  })} />
                  <text x="300" y="125" textAnchor="middle" fill="#f59e0b" fontSize="10">Mule L1 (Sanjay)</text>

                  {/* Layer 1 Mule 2 */}
                  <circle cx="300" cy="300" r="18" fill="#b45309" stroke="#f59e0b" strokeWidth="2" style={{ cursor: 'pointer' }} onClick={() => setSelectedNode({
                    id: 'M2', label: 'Layer 1 Mule (M2)', type: 'mule', details: { name: 'Gaurav Das', bank: 'ICICI', location: 'Mewat', loss: '₹1,50,000 incoming', device: 'Redmi 9' }
                  })} />
                  <text x="300" y="335" textAnchor="middle" fill="#f59e0b" fontSize="10">Mule L1 (Gaurav)</text>

                  {/* Layer 2 Mule A */}
                  <circle cx="480" cy="100" r="14" fill="#374151" stroke="#9ca3af" strokeWidth="1" style={{ cursor: 'pointer' }} onClick={() => setSelectedNode({
                    id: 'L2_A', label: 'Layer 2 Account (A)', type: 'layer2', details: { name: 'Anup Enterprises (Shell)', bank: 'Axis', location: 'Kolkata', loss: '₹1,20,000 layered', device: 'Emulator-Win' }
                  })} />
                  <text x="540" y="105" fill="#9ca3af" fontSize="10">Shell A (Kolkata)</text>

                  {/* Layer 2 Mule B */}
                  <circle cx="480" cy="200" r="14" fill="#374151" stroke="#9ca3af" strokeWidth="1" style={{ cursor: 'pointer' }} onClick={() => setSelectedNode({
                    id: 'L2_B', label: 'Layer 2 Account (B)', type: 'layer2', details: { name: 'R. K. Traders', bank: 'BOB', location: 'Patna', loss: '₹80,000 layered', device: 'Oppo A15' }
                  })} />
                  <text x="540" y="205" fill="#9ca3af" fontSize="10">Shell B (Patna)</text>

                  {/* Layer 2 Mule C */}
                  <circle cx="480" cy="300" r="14" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2" style={{ cursor: 'pointer' }} onClick={() => setSelectedNode({
                    id: 'L2_C', label: 'High Risk Mule (C)', type: 'mule_loop', details: { name: 'Vikram Singh (Crypto Cashout)', bank: 'PND', location: 'Mewat', loss: '₹1,50,000 circular loop', device: 'Realme 8' }
                  })} />
                  <text x="540" y="305" fill="#ef4444" fontSize="10">Cashout / Loop Hub</text>

                </svg>

                {selectedNode && (
                  <div className="node-popover">
                    <h4 style={{ margin: '0 0 6px', color: 'var(--accent-purple)' }}>{selectedNode.label}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div><strong>Holder:</strong> {selectedNode.details.name}</div>
                      <div><strong>Bank:</strong> {selectedNode.details.bank}</div>
                      <div><strong>Device ID:</strong> {selectedNode.details.device}</div>
                      <div><strong>Location:</strong> {selectedNode.details.location}</div>
                      <div><strong>Flow Value:</strong> {selectedNode.details.loss}</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, background: '#12131a', padding: 12, borderRadius: 8, fontSize: 12 }}>
                  <strong>🔒 Court-Admissible Evidence Export:</strong> Click node details to compile transaction logs, linked IMEI codes, and timestamps into pre-formatted cyber-investigation PDF briefs.
                </div>
                <button className="tab-btn active" style={{ display: 'inline-flex', alignSelf: 'center' }}>
                  Generate Case Evidence Package
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: HOTSPOT MAP */}
        {activeTab === 'map' && (
          <div className="dashboard-grid">
            <div className="glass-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3>Geospatial Crime Hotspots (Command Center)</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Mapping coordinate hotspots of digital arrest calls, counterfeit note seizures, and cell centers</p>
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={`tab-btn ${mapFilter === 'all' ? 'active' : ''}`} onClick={() => setMapFilter('all')}>All</button>
                  <button className={`tab-btn ${mapFilter === 'arrests' ? 'active' : ''}`} onClick={() => setMapFilter('arrests')}>Digital Arrests</button>
                  <button className={`tab-btn ${mapFilter === 'seizures' ? 'active' : ''}`} onClick={() => setMapFilter('seizures')}>Seizures</button>
                </div>
              </div>

              <div className="map-visualizer">
                {/* SVG Mock Map Layout representing a stylized regions chart */}
                <svg width="100%" height="100%" viewBox="0 0 800 400" style={{ background: '#090a0f' }}>
                  {/* Grid lines for coordinate maps */}
                  <path d="M 0 100 L 800 100 M 0 200 L 800 200 M 0 300 L 800 300 M 200 0 L 200 400 M 400 0 L 400 400 M 600 0 L 600 400" stroke="#1f2029" strokeWidth="0.5" />
                  
                  {/* Outline paths of region nodes */}
                  <path d="M 200 100 L 300 80 L 350 120 L 300 220 L 220 180 Z" fill="#12131a" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <path d="M 350 120 L 500 140 L 550 250 L 400 320 L 300 220 Z" fill="#181922" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <path d="M 300 220 L 400 320 L 350 380 L 200 350 L 220 180 Z" fill="#111219" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                  {/* Pulsing Hotspots representing crime coordinate entries */}
                  {(mapFilter === 'all' || mapFilter === 'arrests') && (
                    <>
                      {/* Jamtara Cluster */}
                      <circle cx="420" cy="180" r="25" fill="rgba(239, 68, 68, 0.15)" />
                      <circle cx="420" cy="180" r="10" fill="rgba(239, 68, 68, 0.3)" />
                      <circle cx="420" cy="180" r="4" fill="#ef4444" />
                      <text x="420" y="160" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="600">JAMTARA CALL CELL</text>

                      {/* Mewat Cluster */}
                      <circle cx="280" cy="140" r="30" fill="rgba(239, 68, 68, 0.15)" />
                      <circle cx="280" cy="140" r="12" fill="rgba(239, 68, 68, 0.3)" />
                      <circle cx="280" cy="140" r="4" fill="#ef4444" />
                      <text x="280" y="120" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="600">MEWAT CYBER RING</text>
                    </>
                  )}

                  {(mapFilter === 'all' || mapFilter === 'seizures') && (
                    <>
                      {/* Kolkata note seizure */}
                      <circle cx="510" cy="220" r="20" fill="rgba(245, 158, 11, 0.15)" />
                      <circle cx="510" cy="220" r="8" fill="rgba(245, 158, 11, 0.3)" />
                      <circle cx="510" cy="220" r="4" fill="#f59e0b" />
                      <text x="510" y="245" textAnchor="middle" fill="#f59e0b" fontSize="10">KOLKATA BANK SEIZURE</text>
                    </>
                  )}
                </svg>

                <div className="map-card-glow">
                  <h4 style={{ margin: '0 0 6px', color: 'var(--accent-purple)' }}>Active Patrol Deployments</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>• Mewat Cyber Cell: <span style={{ color: 'var(--color-danger)' }}>Level 5 Alert</span></div>
                    <div>• Kolkata Seizure Center: <span style={{ color: 'var(--color-warning)' }}>Level 3 Watch</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer Info bar */}
      <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
        RakshaNet • Digital Public Safety Prototype • Built for ET GenAI Hackathon 2.0
      </footer>
    </div>
  );
}

export default App;
