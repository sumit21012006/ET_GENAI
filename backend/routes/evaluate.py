from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from lib.groq_client import evaluate_transcript, transcribe_audio
from lib.supabase_client import get_supabase

router = APIRouter()

ALERT_THRESHOLD = 65  # Insert into DB if score exceeds this


class TranscriptRequest(BaseModel):
    transcript: str
    call_id: str | None = None


async def _run_evaluation(transcript: str, call_id: str | None = None) -> dict:
    """Core evaluation logic — shared by both endpoints."""
    result = evaluate_transcript(transcript)

    # Auto-insert alert into Supabase if threat is above threshold
    if result["threat_score"] > ALERT_THRESHOLD:
        try:
            sb = get_supabase()
            sb.table("alerts").insert({
                "call_id": call_id,
                "threat_score": result["threat_score"],
                "matched_patterns": result["matched_patterns"],
                "reasoning": result.get("reasoning", ""),
                "recommended_action": result.get("recommended_action", "MONITOR"),
            }).execute()
        except Exception as e:
            # Don't fail the API call if DB insert fails
            result["db_warning"] = f"Alert DB insert failed: {str(e)}"

    result["call_id"] = call_id
    return result


@router.post("/evaluate-script")
async def evaluate_script(body: TranscriptRequest):
    """
    Evaluate a transcript text for scam patterns using Groq Llama 3.
    Returns: { threat_score, matched_patterns, reasoning, recommended_action }
    Auto-inserts alert row in Supabase if threat_score > 65.
    """
    if not body.transcript.strip():
        raise HTTPException(400, "Transcript cannot be empty")
    return await _run_evaluation(body.transcript, body.call_id)


@router.post("/process-call-chunk")
async def process_call_chunk(audio: UploadFile = File(...), call_id: str | None = None):
    """
    Combined endpoint: transcribe audio → evaluate for scam → return verdict.
    Single call for live streaming use case.
    """
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(400, "Empty audio file")

    transcript = transcribe_audio(audio_bytes, filename=audio.filename or "chunk.wav")
    result = await _run_evaluation(transcript, call_id)
    result["transcript"] = transcript
    return result
