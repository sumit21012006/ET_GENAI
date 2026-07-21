import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
import pytesseract
from lib.groq_client import evaluate_transcript
from lib.supabase_client import get_supabase

router = APIRouter()

ALERT_THRESHOLD = 65


@router.post("/ocr-screenshot")
async def ocr_screenshot(image: UploadFile = File(...)):
    """
    Accept a WhatsApp/screenshot image, extract text via Tesseract OCR,
    then evaluate the extracted text for scam patterns via Llama 3.

    Returns: {
        extracted_text: str,
        threat_score: int,
        matched_patterns: list,
        reasoning: str,
        recommended_action: str
    }
    """
    allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/bmp"}
    if image.content_type and image.content_type not in allowed:
        raise HTTPException(400, f"Unsupported image type: {image.content_type}")

    img_bytes = await image.read()
    if len(img_bytes) == 0:
        raise HTTPException(400, "Empty image file")

    # Run Tesseract OCR
    try:
        pil_image = Image.open(io.BytesIO(img_bytes))
        extracted_text = pytesseract.image_to_string(pil_image, lang="eng")
    except Exception as e:
        raise HTTPException(500, f"OCR failed: {str(e)}")

    if not extracted_text.strip():
        return {
            "extracted_text": "",
            "threat_score": 0,
            "matched_patterns": [],
            "reasoning": "No text could be extracted from the image.",
            "recommended_action": "SAFE",
        }

    # Evaluate extracted text exactly like a call transcript
    result = evaluate_transcript(extracted_text)
    result["extracted_text"] = extracted_text

    # Auto-insert alert if high threat
    if result["threat_score"] > ALERT_THRESHOLD:
        try:
            sb = get_supabase()
            sb.table("alerts").insert({
                "call_id": None,
                "threat_score": result["threat_score"],
                "matched_patterns": result["matched_patterns"],
                "reasoning": result.get("reasoning", ""),
                "recommended_action": result.get("recommended_action", "MONITOR"),
            }).execute()
        except Exception as e:
            result["db_warning"] = str(e)

    return result
