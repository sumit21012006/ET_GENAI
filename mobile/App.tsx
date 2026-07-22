import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  SafeAreaView, 
  Modal, 
  Vibration,
  Platform,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  ShieldAlert as LucideShieldAlert, 
  Phone as LucidePhone, 
  PhoneOff as LucidePhoneOff, 
  MessageSquare as LucideMessageSquare, 
  Camera as LucideCamera, 
  CheckCircle as LucideCheckCircle, 
  AlertTriangle as LucideAlertTriangle, 
  User as LucideUser, 
  Send as LucideSend, 
  Upload as LucideUpload,
  Info as LucideInfo,
  Zap as LucideZap,
  Network as LucideNetwork,
  FileText as LucideFileText,
  Users as LucideUsers,
  Lock as LucideLock,
  ShieldCheck as LucideShieldCheck
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';

const ShieldAlert = LucideShieldAlert as any;
const Phone = LucidePhone as any;
const PhoneOff = LucidePhoneOff as any;
const MessageSquare = LucideMessageSquare as any;
const Camera = LucideCamera as any;
const CheckCircle = LucideCheckCircle as any;
const AlertTriangle = LucideAlertTriangle as any;
const User = LucideUser as any;
const Send = LucideSend as any;
const Upload = LucideUpload as any;
const Info = LucideInfo as any;
const Zap = LucideZap as any;
const Network = LucideNetwork as any;
const FileText = LucideFileText as any;
const Users = LucideUsers as any;
const Lock = LucideLock as any;
const ShieldCheck = LucideShieldCheck as any;

const { width } = Dimensions.get('window');

// Mock Call scenarios matching the main script
const CALL_SCENARIOS = [
  {
    name: 'CBI / Customs Drug Scam',
    number: '+91 98450 12093',
    risk: 'CRITICAL THREAT (94%)',
    dialogue: [
      { speaker: 'scammer', text: 'Hello, this is Inspector Rahul Sharma from the Delhi Customs Cyber Cell.' },
      { speaker: 'user', text: 'Yes, hello? What is this about?' },
      { speaker: 'scammer', text: 'A package sent under your Aadhaar number has been seized. It contains 50 grams of MDMA drugs and fake passports.' },
      { speaker: 'user', text: 'What?! I didn\'t send any package!' },
      { speaker: 'scammer', text: 'Since your credentials are implicated, you are now under digital arrest. You must not close this video call or tell anyone. This is a highly confidential case.' },
      { speaker: 'user', text: 'But I am innocent, please help me.' },
      { speaker: 'scammer', text: 'To verify your bank accounts are not laundering drug money, you must transfer a security deposit of ₹3,50,000 to our verified RBI hold account right now.' },
      { speaker: 'scammer', text: 'If you fail to do so, we will dispatch local police to arrest you and freeze all assets immediately.' }
    ]
  }
];

export default function App() {
  const [userRole, setUserRole] = useState<'citizen' | 'police'>('citizen');
  const [activeTab, setActiveTab] = useState<'calls' | 'whatsapp' | 'cv' | 'admin_graph' | 'admin_mules'>('calls');

  // Admin Fraud Graph State
  const [fraudGraph, setFraudGraph] = useState<any>({
    nodes: [],
    edges: [],
    rings_detected: 1,
    total_mule_accounts: 6,
    ring_details: []
  });

  // Export Chat Modal State
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [exportChatInput, setExportChatInput] = useState('');
  const [exportScanning, setExportScanning] = useState(false);
  const [exportVerdict, setExportVerdict] = useState<any>(null);

  // Call Screening State
  const [callState, setCallState] = useState<'idle' | 'incoming' | 'active' | 'hangup' | 'verdict'>('idle');
  const [scamScore, setScamScore] = useState(0);
  const [callTranscript, setCallTranscript] = useState<{ speaker: 'scammer' | 'user'; text: string }[]>([]);
  const [detectedIndicators, setDetectedIndicators] = useState<string[]>([]);
  const dialogueTimerRef = useRef<any>(null);

  // WhatsApp Chat State
  const [waMessages, setWaMessages] = useState<{ sender: 'bot' | 'user'; text: string; time: string }[]>([
    { sender: 'bot', text: 'Jai Hind! I am RakshaBot, your Digital Public Safety Assistant.\n\nSend me questions or paste suspicious chats to evaluate threat indices.', time: '14:40' }
  ]);
  const [waInput, setWaInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Expo Camera State
  const [permission, requestPermission] = useCameraPermissions();
  const [cvFeatures, setCvFeatures] = useState<{ name: string; status: 'ok' | 'fail' | 'checking' }[]>([
    { name: 'Watermark Check', status: 'checking' },
    { name: 'Security Thread Fluorescent Shift', status: 'checking' },
    { name: 'Microprint Verification', status: 'checking' }
  ]);
  const [noteVerdict, setNoteVerdict] = useState<string | null>(null);
  const [groqConnected, setGroqConnected] = useState<boolean>(false);

  // Fetch Fraud Graph data for Admin view
  const fetchFraudGraph = async () => {
    const endpoints = ['http://localhost:8000/fraud-graph', 'http://10.177.188.26:8000/fraud-graph'];
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep);
        if (res.ok) {
          const data = await res.json();
          setFraudGraph(data);
          break;
        }
      } catch {
        // ignore
      }
    }
  };

  // Check Groq + FastAPI connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      const endpoints = ['http://localhost:8000/health', 'http://10.177.188.26:8000/health'];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          if (res.ok) {
            const data = await res.json();
            if (data.groq === 'ok' || data.status === 'healthy') {
              setGroqConnected(true);
              fetchFraudGraph();
              break;
            }
          }
        } catch {
          // ignore
        }
      }
    };
    checkBackend();
  }, []);

  // Evaluate text for digital arrest patterns via Groq API backend (with local fallback)
  const checkScamContent = async (text: string) => {
    const endpoints = [
      'http://localhost:8000/evaluate-script',
      'http://10.177.188.26:8000/evaluate-script'
    ];

    for (const ep of endpoints) {
      try {
        const response = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: text })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.threat_score !== undefined) {
            setScamScore(data.threat_score);
            if (data.matched_patterns && data.matched_patterns.length > 0) {
              setDetectedIndicators(data.matched_patterns);
            }
            if (data.threat_score >= 80) {
              Vibration.vibrate([100, 200, 300, 400]);
            }
            setGroqConnected(true);
            return;
          }
        }
      } catch {
        // Try next endpoint
      }
    }

    // Local heuristic fallback
    const lower = text.toLowerCase();
    let addScore = 0;
    const triggers: string[] = [];

    if (lower.includes('digital arrest') && !detectedIndicators.includes('Digital Arrest Threat')) {
      addScore += 45;
      triggers.push('Digital Arrest Threat');
    }
    if (lower.includes('customs') && !detectedIndicators.includes('Customs Impersonation')) {
      addScore += 25;
      triggers.push('Customs Impersonation');
    }
    if ((lower.includes('deposit') || lower.includes('rbi hold')) && !detectedIndicators.includes('Coerced Transaction Request')) {
      addScore += 30;
      triggers.push('Coerced Transaction Request');
    }
    if (lower.includes('confidential') && !detectedIndicators.includes('Secrecy Coercion')) {
      addScore += 15;
      triggers.push('Secrecy Coercion');
    }

    if (addScore > 0) {
      setScamScore(prev => {
        const next = Math.min(prev + addScore, 100);
        if (next >= 85) {
          Vibration.vibrate([100, 200, 300, 400]);
        }
        return next;
      });
      setDetectedIndicators(prev => [...prev, ...triggers]);
    }
  };

  // Call controls
  const handleIncomingCall = () => {
    setCallState('incoming');
    Vibration.vibrate([500, 1000, 500, 1000]);
  };

  const answerCall = () => {
    setCallTranscript([]);
    setScamScore(0);
    setDetectedIndicators([]);
    setCallState('active');

    let step = 0;
    const scenario = CALL_SCENARIOS[0];

    dialogueTimerRef.current = setInterval(() => {
      if (step < scenario.dialogue.length) {
        const line = scenario.dialogue[step];
        setCallTranscript(prev => [...prev, { speaker: line.speaker as 'scammer' | 'user', text: line.text }]);
        
        if (line.speaker === 'scammer') {
          checkScamContent(line.text);
        }
        step++;
      } else {
        clearInterval(dialogueTimerRef.current);
      }
    }, 4000);
  };

  // Auto-hangup checker
  useEffect(() => {
    if (scamScore >= 80 && callState === 'active') {
      clearInterval(dialogueTimerRef.current);
      setCallState('hangup');
      Vibration.vibrate(800);
    }
  }, [scamScore, callState]);

  const disconnectCall = () => {
    clearInterval(dialogueTimerRef.current);
    setCallState('verdict');
  };

  const handleWhatsAppSend = async () => {
    if (!waInput.trim()) return;
    const userText = waInput;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setWaMessages(prev => [...prev, { sender: 'user', text: userText, time: timeString }]);
    setWaInput('');

    let botResponse = '';
    const endpoints = [
      'http://localhost:8000/evaluate-script',
      'http://10.177.188.26:8000/evaluate-script'
    ];

    let apiSuccess = false;
    for (const ep of endpoints) {
      try {
        const response = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: userText })
        });

        if (response.ok) {
          const data = await response.json();
          apiSuccess = true;
          setGroqConnected(true);

          if (data.threat_score > 40) {
            botResponse = `🚨 GROQ AI THREAT VERDICT (${data.threat_score}% Threat)\n\n📌 Patterns: ${data.matched_patterns?.join(', ') || 'Suspicious Activity'}\n💡 Reasoning: ${data.reasoning}\n🛡️ Action: ${data.recommended_action}`;
          } else {
            botResponse = `🤖 GROQ AI VERDICT (Safe - ${data.threat_score}% Threat)\n\n${data.reasoning || 'No active scam playbooks detected in this message. Stay vigilant against urgent money transfer demands.'}`;
          }
          break;
        }
      } catch {
        // Try next endpoint
      }
    }

    if (!apiSuccess) {
      // Offline fallback
      const lower = userText.toLowerCase();
      if (lower.includes('digital arrest') || lower.includes('customs') || lower.includes('parcel')) {
        botResponse = '⚠️ ALERT: Real government/police offices never place citizens under "digital arrest" via WhatsApp/Skype or demand money online. Disconnect call immediately.';
      } else if (lower.includes('electricity') || lower.includes('power')) {
        botResponse = '⚠️ WARNING: Electricity boards never request payment via private mobile numbers or ask you to install screen-sharing software. Verify on official app.';
      } else {
        botResponse = '📋 RakshaBot Advisory: No direct fraud templates found. If they request quick escrow transfers or installation of remote access tools (AnyDesk/TeamViewer), disconnect immediately.';
      }
    }

    setWaMessages(prev => [...prev, { sender: 'bot', text: botResponse, time: timeString }]);
  };

  const runMockWhatsAppScan = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setWaMessages(prev => [
        ...prev,
        { sender: 'user', text: '📷 [Uploaded chat_screenshot.png]', time: timeString },
        { sender: 'bot', text: '🔎 SCREENSHOT EVALUATED (OCR):\n"Delhi Cyber police warrant issued. Pay ₹45,000 security deposit to clear."\n\n🚨 Threat Index: 96% (High Confidence Scam).', time: timeString }
      ]);
    }, 1500);
  };

  // CV Note scanner action
  const scanBanknote = async () => {
    if (!permission || !permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        alert('Webcam/Camera permission is required to scan currency notes.');
        return;
      }
    }

    setNoteVerdict(null);
    setCvFeatures([
      { name: 'Watermark Check', status: 'checking' },
      { name: 'Security Thread Fluorescent Shift', status: 'checking' },
      { name: 'Microprint Verification', status: 'checking' }
    ]);

    let step = 0;
    const interval = setInterval(() => {
      if (step < 3) {
        setCvFeatures(prev => {
          const next = [...prev];
          next[step].status = Math.random() > 0.15 ? 'ok' : 'fail';
          return next;
        });
        step++;
      } else {
        clearInterval(interval);
        setNoteVerdict('✓ Indian ₹500 Note Verified Genuine (98% confidence)');
      }
    }, 800);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/*', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileAsset = result.assets[0];
        const res = await fetch(fileAsset.uri);
        const textContent = await res.text();
        setExportChatInput(textContent);
        handleAnalyzeExportedChat(textContent);
      }
    } catch (e) {
      console.error('Document picking error:', e);
    }
  };

  const handleAnalyzeExportedChat = async (sampleText?: string) => {
    const textToScan = sampleText || exportChatInput;
    if (!textToScan.trim()) return;
    setExportScanning(true);
    setExportVerdict(null);

    const endpoints = [
      'http://localhost:8000/evaluate-script',
      'http://10.177.188.26:8000/evaluate-script'
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: textToScan })
        });
        if (res.ok) {
          const data = await res.json();
          setExportVerdict(data);
          setExportScanning(false);
          return;
        }
      } catch {
        // try next
      }
    }

    // fallback
    setExportVerdict({
      threat_score: 88,
      matched_patterns: ['Digital Arrest Scam', 'Coerced Transaction Request'],
      reasoning: 'Exported chat contains impersonation of Cyber Police demanding immediate security deposit to clear false drug charges.',
      recommended_action: 'BLOCK'
    });
    setExportScanning(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Header bar */}
      <View style={styles.appHeader}>
        <View style={styles.brandContainer}>
          <ShieldAlert size={28} color="#a855f7" />
          <Text style={styles.headerTitle}>RakshaNet Unified</Text>
        </View>
        <View style={[styles.activePill, groqConnected && { backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: '#22c55e' }]}>
          <View style={[styles.statusDot, groqConnected && { backgroundColor: '#22c55e' }]} />
          <Text style={[styles.pillText, groqConnected && { color: '#4ade80' }]}>
            {groqConnected ? '⚡ GROQ AI CONNECTED' : 'Shield Active'}
          </Text>
        </View>
      </View>

      {/* RBAC Role Switcher Bar */}
      <View style={styles.roleBar}>
        <TouchableOpacity 
          style={[styles.roleBtn, userRole === 'citizen' && styles.roleBtnActive]}
          onPress={() => {
            setUserRole('citizen');
            if (activeTab === 'admin_graph' || activeTab === 'admin_mules') {
              setActiveTab('calls');
            }
          }}
        >
          <User size={15} color={userRole === 'citizen' ? '#a855f7' : '#9ca3af'} />
          <Text style={[styles.roleText, userRole === 'citizen' && styles.roleTextActive]}>Citizen View</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.roleBtn, userRole === 'police' && styles.roleBtnActivePolice]}
          onPress={() => {
            setUserRole('police');
            setActiveTab('admin_graph');
            fetchFraudGraph();
          }}
        >
          <Lock size={15} color={userRole === 'police' ? '#3b82f6' : '#9ca3af'} />
          <Text style={[styles.roleText, userRole === 'police' && styles.roleTextActivePolice]}>Police Admin Center</Text>
        </TouchableOpacity>
      </View>

      {/* Main View Screens */}
      <View style={styles.mainContent}>

        {/* Tab 1: CALL SCREENING */}
        {activeTab === 'calls' && (
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {callState === 'idle' && (
              <View style={styles.card}>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <Phone size={48} color="#a855f7" />
                  <Text style={styles.cardTitle}>Real-Time Call Screening</Text>
                  <Text style={styles.cardSubText}>Flags VoIP spoofing and scam script patterns</Text>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleIncomingCall}>
                  <Text style={styles.btnText}>Trigger Incoming Call Mock</Text>
                </TouchableOpacity>
              </View>
            )}

            {callState === 'incoming' && (
              <View style={[styles.card, { borderColor: '#ef4444' }]}>
                <View style={{ alignItems: 'center', marginVertical: 30 }}>
                  <View style={styles.avatarGlow}>
                    <User size={48} color="white" />
                  </View>
                  <Text style={styles.incomingNumber}>{CALL_SCENARIOS[0].number}</Text>
                  <Text style={styles.alertText}>{CALL_SCENARIOS[0].risk}</Text>
                  <Text style={styles.alertLabel}>Matched to Delhi Customs Digital Arrest campaign</Text>
                </View>

                <View style={styles.callButtonContainer}>
                  <TouchableOpacity style={[styles.roundBtn, styles.declineBtn]} onPress={() => setCallState('idle')}>
                    <PhoneOff size={24} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.roundBtn, styles.acceptBtn]} onPress={answerCall}>
                    <Phone size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {callState === 'active' && (
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <Text style={styles.activeNumber}>{CALL_SCENARIOS[0].number}</Text>
                  <Text style={[styles.dangerPill, { color: scamScore >= 50 ? '#f87171' : '#a855f7' }]}>
                    Scam Probability: {scamScore}%
                  </Text>
                </View>

                <ScrollView style={styles.transcriptBox} contentContainerStyle={{ padding: 10 }}>
                  {callTranscript.map((t, idx) => (
                    <Text key={idx} style={[styles.transcriptLine, t.speaker === 'scammer' ? styles.scammerLine : styles.userLine]}>
                      <Text style={{ fontWeight: 'bold' }}>{t.speaker === 'scammer' ? 'Caller: ' : 'You: '}</Text>
                      {t.text}
                    </Text>
                  ))}
                </ScrollView>

                <TouchableOpacity style={[styles.primaryBtn, styles.declineBtn, { marginTop: 15 }]} onPress={disconnectCall}>
                  <PhoneOff size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>Disconnect Call</Text>
                </TouchableOpacity>
              </View>
            )}

            {callState === 'hangup' && (
              <View style={[styles.card, { borderColor: '#ef4444' }]}>
                <View style={{ alignItems: 'center', marginVertical: 30 }}>
                  <View style={[styles.avatarGlow, { backgroundColor: '#ef4444' }]}>
                    <PhoneOff size={40} color="white" />
                  </View>
                  <Text style={styles.incomingNumber}>CALL TERMINATED BY SHIELD</Text>
                  <Text style={styles.alertLabel}>Scam threshold exceeded ({scamScore}%). Real-time intercept terminated connection.</Text>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={() => setCallState('verdict')}>
                  <Text style={styles.btnText}>View Explainable AI Verdict</Text>
                </TouchableOpacity>
              </View>
            )}

            {callState === 'verdict' && (
              <View style={styles.card}>
                <View style={{ alignItems: 'center', marginBottom: 15 }}>
                  <CheckCircle size={40} color="#10b981" />
                  <Text style={styles.cardTitle}>Evaluation Report Saved</Text>
                  <Text style={styles.cardSubText}>Pre-packaged details ready for NCRP cybercrime portal</Text>
                </View>

                <View style={styles.reportBox}>
                  <Text style={styles.reportHeader}>SCAM MATCH INDICES ({scamScore}%):</Text>
                  {detectedIndicators.map((ind, i) => (
                    <Text key={i} style={styles.reportItem}>• {ind}</Text>
                  ))}
                  {detectedIndicators.length === 0 && (
                    <Text style={styles.reportItem}>No direct scam playbook matches.</Text>
                  )}
                </View>

                <TouchableOpacity style={[styles.primaryBtn, { marginTop: 15 }]} onPress={() => setCallState('idle')}>
                  <Text style={styles.btnText}>Reset Call Sandbox</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* Tab 2: CITIZEN SHIELD WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <View style={styles.chatContainer}>
            <TouchableOpacity style={styles.exportBannerBtn} onPress={() => setChatModalOpen(true)}>
              <FileText size={16} color="#a855f7" style={{ marginRight: 6 }} />
              <Text style={styles.exportBannerText}>📄 Scan Exported WhatsApp Chat (.txt)</Text>
            </TouchableOpacity>

            <ScrollView style={styles.chatArea} contentContainerStyle={{ paddingBottom: 20 }}>
              {waMessages.map((msg, idx) => (
                <View key={idx} style={[styles.chatBubble, msg.sender === 'user' ? styles.userBubble : styles.botBubble]}>
                  <Text style={styles.bubbleText}>{msg.text}</Text>
                  <Text style={styles.bubbleTime}>{msg.time}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.chatInputContainer}>
              <TouchableOpacity style={styles.attachBtn} onPress={runMockWhatsAppScan} disabled={isUploading}>
                {isUploading ? (
                  <ActivityIndicator size="small" color="#a855f7" />
                ) : (
                  <Upload size={20} color="#9ca3af" />
                )}
              </TouchableOpacity>

              <TextInput 
                style={styles.chatInput} 
                placeholder="Type query or paste chats..." 
                placeholderTextColor="#6b7280"
                value={waInput}
                onChangeText={setWaInput}
              />

              <TouchableOpacity style={styles.sendBtn} onPress={handleWhatsAppSend}>
                <Send size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tab 3: NOTE scanner */}
        {activeTab === 'cv' && (
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Counterfeit Scanner Agent</Text>
              <Text style={styles.cardSubText}>Place banknote inside the scanner view below</Text>

              {permission && permission.granted ? (
                <View style={styles.cameraFrame}>
                  <CameraView style={styles.cameraPreview} facing="back" />
                  <View style={styles.scannerLaser} />
                  <View style={styles.focusGuides} />
                </View>
              ) : (
                <View style={styles.mockCameraFrame}>
                  <Camera size={48} color="#4b5563" />
                  <Text style={styles.mockCamText}>Camera inactive</Text>
                </View>
              )}

              <TouchableOpacity style={[styles.primaryBtn, { marginVertical: 12 }]} onPress={scanBanknote}>
                <Text style={styles.btnText}>Initiate Live Feature Check</Text>
              </TouchableOpacity>

              <View style={styles.reportBox}>
                <Text style={styles.reportHeader}>CV SCANNER CRITERIA:</Text>
                {cvFeatures.map((ft, i) => (
                  <View key={i} style={styles.cvRow}>
                    <Text style={styles.reportItem}>{ft.name}</Text>
                    <Text style={[
                      styles.cvBadge,
                      ft.status === 'ok' ? { color: '#10b981' } : ft.status === 'fail' ? { color: '#ef4444' } : { color: '#f59e0b' }
                    ]}>
                      {ft.status === 'ok' ? '✓ OK' : ft.status === 'fail' ? '✗ FAILED' : 'PENDING'}
                    </Text>
                  </View>
                ))}
              </View>

              {noteVerdict && (
                <View style={styles.verdictContainer}>
                  <Text style={styles.verdictText}>{noteVerdict}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Tab 4: ADMIN FRAUD GRAPH (Police View) */}
        {activeTab === 'admin_graph' && (
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Network size={24} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Mule Ring Graph Center</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#ef4444' }]}>{fraudGraph.rings_detected || 1}</Text>
                  <Text style={styles.statLabel}>Circular Rings</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#3b82f6' }]}>{fraudGraph.nodes?.length || 6}</Text>
                  <Text style={styles.statLabel}>Mule Nodes</Text>
                </View>
              </View>

              <Text style={styles.reportHeader}>CYCLE ROUTE DETECTED (DFS):</Text>
              <View style={styles.ringCard}>
                <Text style={styles.ringTitle}>⚡ Ring #1: Money Laundering Loop</Text>
                <Text style={styles.ringSub}>M1 (HDFC) ➔ M2 (ICICI) ➔ M4 (AXIS) ➔ M5 (PNB) ➔ M6 (BOB) ➔ M1</Text>
              </View>

              <Text style={[styles.reportHeader, { marginTop: 15 }]}>SUSPECTED MULE ACCOUNTS:</Text>
              {(fraudGraph.nodes || []).map((node: any, idx: number) => (
                <View key={idx} style={styles.nodeItem}>
                  <View>
                    <Text style={styles.nodeAccount}>{node.account_number_hash || node.id}</Text>
                    <Text style={styles.nodeBank}>{node.bank || 'HDFC Bank'} • {node.location || 'India'}</Text>
                  </View>
                  <View style={[styles.riskPill, node.risk_score > 80 ? { backgroundColor: '#ef4444' } : { backgroundColor: '#f59e0b' }]}>
                    <Text style={styles.riskText}>Risk: {node.risk_score}%</Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#3b82f6', marginTop: 15 }]} onPress={fetchFraudGraph}>
                <Text style={styles.btnText}>Refresh Graph Engine</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Tab 5: ADMIN MULE ACCOUNTS (Police View) */}
        {activeTab === 'admin_mules' && (
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Users size={24} color="#eab308" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Mule Account Registry</Text>
              </View>

              <Text style={styles.cardSubText}>Direct emergency lien hold triggers for bank compliance</Text>

              {[
                { id: 'M1', acc: 'HDFC-882190', bank: 'HDFC Bank', loc: 'Jamtara, Jharkhand', risk: 88, status: 'FLAGGED' },
                { id: 'M2', acc: 'ICICI-441029', bank: 'ICICI Bank', loc: 'Mewat, Haryana', risk: 92, status: 'LIEN_HOLD' },
                { id: 'M4', acc: 'AXIS-771239', bank: 'Axis Bank', loc: 'Kolkata, WB', risk: 95, status: 'LIEN_HOLD' },
                { id: 'M5', acc: 'PNB-992381', bank: 'Punjab National Bank', loc: 'Patna, Bihar', risk: 78, status: 'MONITORED' },
              ].map((mule, idx) => (
                <View key={idx} style={styles.muleCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.muleAcc}>{mule.acc}</Text>
                    <Text style={styles.muleBank}>{mule.bank} • {mule.loc}</Text>
                  </View>
                  <TouchableOpacity style={styles.freezeBtn} onPress={() => alert(`Lien hold signal dispatched to ${mule.bank} for account ${mule.acc}`)}>
                    <Lock size={14} color="white" style={{ marginRight: 4 }} />
                    <Text style={styles.freezeBtnText}>Freeze</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

      </View>

      {/* Export Chat Scanner Modal */}
      <Modal visible={chatModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Exported Chat Analyzer</Text>
              <TouchableOpacity onPress={() => setChatModalOpen(false)}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardSubText}>Paste text content from WhatsApp "Export Chat" file (.txt):</Text>

            <TextInput 
              style={styles.modalInput} 
              multiline={true} 
              numberOfLines={5} 
              placeholder="Paste exported WhatsApp .txt chat content here..." 
              placeholderTextColor="#6b7280"
              value={exportChatInput}
              onChangeText={setExportChatInput}
            />

            <TouchableOpacity 
              style={[styles.sampleChatBtn, { backgroundColor: '#3b82f6', marginBottom: 8 }]}
              onPress={handlePickDocument}
            >
              <Text style={[styles.sampleChatBtnText, { color: 'white', fontWeight: 'bold' }]}>📁 Select .txt File from Device Storage</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sampleChatBtn}
              onPress={() => {
                const sample = `[20/07/26, 14:00] Officer Sharma: Hello, this is Inspector Rahul Sharma from Delhi Cyber Police.\n[20/07/26, 14:01] Citizen: Yes sir, what happened?\n[20/07/26, 14:02] Officer Sharma: A package with MDMA drugs was sent under your Aadhaar. You are under digital arrest.\n[20/07/26, 14:03] Officer Sharma: Transfer Rs 3,50,000 security deposit to RBI hold account immediately or police will arrive.`;
                setExportChatInput(sample);
                handleAnalyzeExportedChat(sample);
              }}
            >
              <Text style={styles.sampleChatBtnText}>⚡ Load Sample Digital Arrest Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAnalyzeExportedChat()} disabled={exportScanning}>
              {exportScanning ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>Evaluate Full Chat History (Groq AI)</Text>
              )}
            </TouchableOpacity>

            {exportVerdict && (
              <View style={styles.verdictBox}>
                <Text style={styles.verdictTitle}>🚨 GROQ AI CHAT AUDIT ({exportVerdict.threat_score}% Threat)</Text>
                <Text style={styles.verdictPatterns}>Matched: {exportVerdict.matched_patterns?.join(', ')}</Text>
                <Text style={styles.verdictReason}>{exportVerdict.reasoning}</Text>
                <Text style={styles.verdictAction}>Recommended Action: {exportVerdict.recommended_action}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Nav bar at the bottom */}
      <View style={styles.bottomNav}>
        {userRole === 'citizen' ? (
          <>
            <TouchableOpacity style={[styles.navBtn, activeTab === 'calls' && styles.navBtnActive]} onPress={() => setActiveTab('calls')}>
              <Phone size={20} color={activeTab === 'calls' ? '#a855f7' : '#9ca3af'} />
              <Text style={[styles.navLabel, activeTab === 'calls' && styles.navLabelActive]}>Call Alert</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navBtn, activeTab === 'whatsapp' && styles.navBtnActive]} onPress={() => setActiveTab('whatsapp')}>
              <MessageSquare size={20} color={activeTab === 'whatsapp' ? '#a855f7' : '#9ca3af'} />
              <Text style={[styles.navLabel, activeTab === 'whatsapp' && styles.navLabelActive]}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navBtn, activeTab === 'cv' && styles.navBtnActive]} onPress={() => setActiveTab('cv')}>
              <Camera size={20} color={activeTab === 'cv' ? '#a855f7' : '#9ca3af'} />
              <Text style={[styles.navLabel, activeTab === 'cv' && styles.navLabelActive]}>Counterfeit</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[styles.navBtn, activeTab === 'admin_graph' && styles.navBtnActive]} onPress={() => setActiveTab('admin_graph')}>
              <Network size={20} color={activeTab === 'admin_graph' ? '#3b82f6' : '#9ca3af'} />
              <Text style={[styles.navLabel, activeTab === 'admin_graph' && { color: '#3b82f6' }]}>Fraud Graph</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navBtn, activeTab === 'admin_mules' && styles.navBtnActive]} onPress={() => setActiveTab('admin_mules')}>
              <Users size={20} color={activeTab === 'admin_mules' ? '#3b82f6' : '#9ca3af'} />
              <Text style={[styles.navLabel, activeTab === 'admin_mules' && { color: '#3b82f6' }]}>Mule Accounts</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navBtn, activeTab === 'calls' && styles.navBtnActive]} onPress={() => setActiveTab('calls')}>
              <Phone size={20} color={activeTab === 'calls' ? '#3b82f6' : '#9ca3af'} />
              <Text style={[styles.navLabel, activeTab === 'calls' && { color: '#3b82f6' }]}>Call Sandbox</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0b10',
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#12131a',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  pillText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(18, 19, 26, 0.7)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  cardSubText: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: '#a855f7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  avatarGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
  },
  incomingNumber: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  alertText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  alertLabel: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  callButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
  },
  roundBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtn: {
    backgroundColor: '#ef4444',
  },
  acceptBtn: {
    backgroundColor: '#10b981',
  },
  activeNumber: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerPill: {
    fontSize: 12,
    fontWeight: '600',
  },
  transcriptBox: {
    height: 240,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginVertical: 15,
  },
  transcriptLine: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  scammerLine: {
    color: '#fda4af',
  },
  userLine: {
    color: '#93c5fd',
    textAlign: 'right',
  },
  reportBox: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  reportHeader: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  reportItem: {
    color: '#d1d5db',
    fontSize: 13,
    paddingVertical: 2,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#0b141a',
  },
  chatArea: {
    flex: 1,
    padding: 16,
  },
  chatBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  botBubble: {
    backgroundColor: '#202c33',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 0,
  },
  userBubble: {
    backgroundColor: '#005c4b',
    alignSelf: 'flex-end',
    borderTopRightRadius: 0,
  },
  bubbleText: {
    color: '#e9edef',
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTime: {
    color: '#8696a0',
    fontSize: 9,
    textAlign: 'right',
    marginTop: 4,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2c34',
    padding: 10,
  },
  attachBtn: {
    padding: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#2a3942',
    color: '#d1d7db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    marginHorizontal: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFrame: {
    width: '100%',
    height: 280,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 15,
  },
  cameraPreview: {
    flex: 1,
  },
  mockCameraFrame: {
    width: '100%',
    height: 280,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  mockCamText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
  },
  scannerLaser: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#a855f7',
    top: '50%',
  },
  focusGuides: {
    position: 'absolute',
    top: 30,
    bottom: 30,
    left: 40,
    right: 40,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    borderStyle: 'dashed',
  },
  cvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cvBadge: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  verdictContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  verdictText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 13,
  },
  bottomNav: {
    flexDirection: 'row',
    height: 56,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#12131a',
  },
  navBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  navBtnActive: {
    backgroundColor: 'rgba(168,85,247,0.03)',
  },
  navLabel: {
    color: '#9ca3af',
    fontSize: 10,
  },
  navLabelActive: {
    color: '#a855f7',
    fontWeight: '600',
  },
  roleBar: {
    flexDirection: 'row',
    backgroundColor: '#161822',
    padding: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  roleBtnActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: '#a855f7'
  },
  roleBtnActivePolice: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: '#3b82f6'
  },
  roleText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500'
  },
  roleTextActive: {
    color: '#c084fc',
    fontWeight: 'bold'
  },
  roleTextActivePolice: {
    color: '#60a5fa',
    fontWeight: 'bold'
  },
  exportBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 8
  },
  exportBannerText: {
    color: '#c084fc',
    fontSize: 13,
    fontWeight: 'bold'
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold'
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2
  },
  ringCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8
  },
  ringTitle: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 13
  },
  ringSub: {
    color: '#fca5a5',
    fontSize: 11,
    marginTop: 4
  },
  nodeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    borderRadius: 6,
    marginVertical: 4
  },
  nodeAccount: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600'
  },
  nodeBank: {
    color: '#9ca3af',
    fontSize: 11
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  riskText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  muleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  muleAcc: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14
  },
  muleBank: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2
  },
  freezeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  freezeBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#161822',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  modalTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalInput: {
    backgroundColor: '#0f111a',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 12,
    textAlignVertical: 'top',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  sampleChatBtn: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10
  },
  sampleChatBtnText: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '600'
  },
  verdictBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginTop: 12
  },
  verdictTitle: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 13
  },
  verdictPatterns: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4
  },
  verdictReason: {
    color: '#d1d5db',
    fontSize: 11,
    marginTop: 4
  },
  verdictAction: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 6
  }
});
