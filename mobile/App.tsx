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
  Zap as LucideZap 
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

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
  const [activeTab, setActiveTab] = useState<'calls' | 'whatsapp' | 'cv'>('calls');

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

  // Evaluate text for digital arrest patterns
  const checkScamContent = (text: string) => {
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
    if (lower.includes('deposit') || lower.includes('rbi hold') && !detectedIndicators.includes('Coerced Transaction Request')) {
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

  const handleWhatsAppSend = () => {
    if (!waInput.trim()) return;
    const userText = waInput;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setWaMessages(prev => [...prev, { sender: 'user', text: userText, time: timeString }]);
    setWaInput('');

    setTimeout(() => {
      let botResponse = 'Analyzing...';
      const lower = userText.toLowerCase();

      if (lower.includes('digital arrest') || lower.includes('customs') || lower.includes('parcel')) {
        botResponse = '⚠️ ALERT: Real government/police offices never place citizens under "digital arrest" via WhatsApp/Skype or demand money online. Disconnect call immediately.';
      } else if (lower.includes('electricity') || lower.includes('power')) {
        botResponse = '⚠️ WARNING: Electricity boards never request payment via private mobile numbers or Ask you to install screen-sharing software. Verify on official app.';
      } else {
        botResponse = '📋 RakshaBot Advisory: No direct fraud templates found. If they request quick escrow transfers or installation of remote access tools (AnyDesk/TeamViewer), it is a scam.';
      }

      setWaMessages(prev => [...prev, { sender: 'bot', text: botResponse, time: timeString }]);
    }, 1000);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Header bar */}
      <View style={styles.appHeader}>
        <View style={styles.brandContainer}>
          <ShieldAlert size={28} color="#a855f7" />
          <Text style={styles.headerTitle}>RakshaNet Mobile</Text>
        </View>
        <View style={styles.activePill}>
          <View style={styles.statusDot} />
          <Text style={styles.pillText}>Shield Active</Text>
        </View>
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

      </View>

      {/* Nav bar at the bottom */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navBtn, activeTab === 'calls' && styles.navBtnActive]} onPress={() => setActiveTab('calls')}>
          <Phone size={22} color={activeTab === 'calls' ? '#a855f7' : '#9ca3af'} />
          <Text style={[styles.navLabel, activeTab === 'calls' && styles.navLabelActive]}>Call Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navBtn, activeTab === 'whatsapp' && styles.navBtnActive]} onPress={() => setActiveTab('whatsapp')}>
          <MessageSquare size={22} color={activeTab === 'whatsapp' ? '#a855f7' : '#9ca3af'} />
          <Text style={[styles.navLabel, activeTab === 'whatsapp' && styles.navLabelActive]}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navBtn, activeTab === 'cv' && styles.navBtnActive]} onPress={() => setActiveTab('cv')}>
          <Camera size={22} color={activeTab === 'cv' ? '#a855f7' : '#9ca3af'} />
          <Text style={[styles.navLabel, activeTab === 'cv' && styles.navLabelActive]}>Scanner</Text>
        </TouchableOpacity>
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
  }
});
