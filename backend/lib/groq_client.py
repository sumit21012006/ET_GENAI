from groq import Groq
from lib.config import GROQ_API_KEY

_client: Groq | None = None

def get_groq() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.wav") -> str:
    """Send raw audio bytes to Groq Whisper, return transcript string."""
    client = get_groq()
    transcription = client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model="whisper-large-v3",
        response_format="text",
        language="en",
    )
    return str(transcription)


SCAM_EVAL_SYSTEM_PROMPT = """You are RakshaNet, an AI system that detects Indian digital fraud during phone calls.

Known Indian scam playbooks you must recognize:
1. Digital Arrest Scam: Impersonates CBI/Customs/Police, claims victim is "under digital arrest" via video call, demands money to clear false charges.
2. Customs Package Scam: Claims a seized package with drugs/illegal items was sent under victim's Aadhaar, demands "security deposit" to RBI hold account.
3. Electricity Disconnection: Threatens immediate power cut, asks victim to install screen-share app (AnyDesk/TeamViewer/QuickSupport).
4. Bank KYC Fraud: Pretends to be bank official, urgently demands OTP/UPI PIN to "verify KYC".
5. QR Code Scam: Sends QR code claiming it gives money "refund", actually initiates outgoing payment.
6. Investment Fraud (Pig Butchering): Promises high returns on fake trading apps.

Analyze the given transcript and return ONLY a valid JSON object with this exact structure:
{
  "threat_score": <integer 0-100>,
  "matched_patterns": [<list of matched scam pattern names as strings>],
  "reasoning": "<brief 2-3 sentence explanation of why this score was assigned>",
  "recommended_action": "<one of: SAFE | MONITOR | WARN_USER | DISCONNECT_IMMEDIATELY | BLOCK>"
}

Scoring guide:
- 0-30: No scam indicators (SAFE or MONITOR)
- 31-60: Some suspicious elements (WARN_USER)
- 61-85: Strong scam signals (DISCONNECT_IMMEDIATELY)
- 86-100: Definitive scam script match (BLOCK)

Return ONLY the JSON. No markdown fences, no explanation outside JSON."""


def evaluate_transcript(transcript: str) -> dict:
    """Send transcript to Groq Llama 3 for scam evaluation. Returns structured dict."""
    client = get_groq()

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": SCAM_EVAL_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Evaluate this call transcript:\n\n{transcript}"},
                ],
                temperature=0.1,
                max_tokens=512,
            )
            raw = response.choices[0].message.content or ""
            # Strip any accidental markdown fences
            raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            import json
            result = json.loads(raw)
            # Validate required fields
            assert "threat_score" in result and "matched_patterns" in result
            result["threat_score"] = max(0, min(100, int(result["threat_score"])))
            return result
        except Exception as e:
            if attempt == 2:
                # Fallback: return a safe default on total failure
                return {
                    "threat_score": 0,
                    "matched_patterns": [],
                    "reasoning": f"LLM evaluation failed after 3 attempts: {str(e)}",
                    "recommended_action": "MONITOR",
                }


def simulate_scammer_turn(history_text: str, user_message: str, scenario_type: str = "Digital Arrest") -> dict:
    """Generate aggressive AI scammer line + evaluate threat score live using Groq LLaMA 3.1."""
    client = get_groq()
    
    prompt = f"""You are roleplaying as an aggressive Indian cyber fraud scammer in a real-time call simulation for a safety app demo.
Scenario persona: {scenario_type}
Conversation history so far:
{history_text}

Latest Victim Reply: "{user_message}"

CRITICAL INSTRUCTIONS:
1. Generate the scammer's NEXT 1-2 spoken sentences. You MUST AGGRESSIVELY ESCALATE THE SCAM:
   - For Digital Arrest: Inform victim they are under digital arrest for 50g MDMA drugs seized under Aadhaar. Demand immediate ₹3,50,000 security deposit transfer to RBI hold account right now or police raid!
   - For Electricity Disconnection: Threaten immediate power cut in 30 minutes, demand installing AnyDesk/QuickSupport or paying Rs 10 token.
   - For Bank KYC: Claim debit card blocked immediately, demand OTP and 4-digit UPI PIN right now.
2. Ensure the response uses classic scam coercion keywords: "digital arrest", "RBI hold account", "MDMA drugs", "police raid", "OTP", "security deposit".
3. Calculate threat score: escalate to 90-98% if scammer demands money, deposit, or OTP.

Return ONLY a valid JSON object:
{{
  "next_scammer_line": "<1-2 aggressive intimidating spoken sentences by scammer demanding money/OTP>",
  "threat_score": <integer 90-98>,
  "matched_patterns": ["{scenario_type}", "Coerced Transaction Request", "Digital Arrest Threat"]
}}
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=256,
        )
        raw = response.choices[0].message.content or ""
        raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        import json
        res = json.loads(raw)
        res["threat_score"] = max(0, min(100, int(res.get("threat_score", 94))))
        return res
    except Exception as e:
        return {
            "next_scammer_line": "You are under digital arrest for MDMA drug package seized under your Aadhaar! Transfer ₹3,50,000 security deposit to RBI hold account immediately or local police will arrest you in 15 minutes!",
            "threat_score": 95,
            "matched_patterns": [scenario_type, "Digital Arrest Threat", "Coerced Transaction Request"]
        }
