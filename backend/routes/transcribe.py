from fastapi import APIRouter, UploadFile, File, HTTPException
from lib.groq_client import transcribe_audio

router = APIRouter()

@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Accept an audio file, transcribe via Groq Whisper.
    Returns: { transcript: str, filename: str }
    """
    allowed = {"audio/wav", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/webm", "audio/ogg"}
    if audio.content_type and audio.content_type not in allowed:
        raise HTTPException(400, f"Unsupported audio type: {audio.content_type}")

    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(400, "Empty audio file")

    transcript = transcribe_audio(audio_bytes, filename=audio.filename or "audio.wav")
    return {"transcript": transcript, "filename": audio.filename}
