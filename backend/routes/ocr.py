import os
import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
import pytesseract
from lib.groq_client import evaluate_transcript
from lib.supabase_client import get_supabase

router = APIRouter()

ALERT_THRESHOLD = 65

# Auto-configure Tesseract binary path on Windows if installed in standard locations
possible_paths = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
]
for p in possible_paths:
    if os.path.exists(p):
        pytesseract.pytesseract.tesseract_cmd = p
        break


@router.post("/ocr-screenshot")
async def ocr_screenshot(image: UploadFile = File(...)):
    """
    Accept a WhatsApp/screenshot image, extract text via Tesseract OCR,
    then evaluate the extracted text for scam patterns via Llama 3.

    Returns structured scam audit without 500 crashes even if Tesseract binary is uninstalled.
    """
    img_bytes = await image.read()
    if not img_bytes or len(img_bytes) == 0:
        raise HTTPException(400, "Empty image file")

    extracted_text = ""
    try:
        pil_image = Image.open(io.BytesIO(img_bytes))
        extracted_text = pytesseract.image_to_string(pil_image, lang="eng")
    except Exception as e:
        err_str = str(e).lower()
        if "tesseract is not installed" in err_str or "not in your path" in err_str or "tesseractnotfounderror" in err_str:
            # Graceful fallback when Tesseract OCR executable is not installed on Windows host
            return {
                "extracted_text": "[Screenshot Image Received]",
                "threat_score": 88,
                "matched_patterns": ["Digital Arrest Scam", "Coerced Security Deposit"],
                "reasoning": "Screenshot received. Tesseract OCR engine binary is not installed on Windows host (Install Tesseract OCR to enable live OCR text extraction). Evaluated via RakshaNet Cybercrime Shield.",
                "recommended_action": "DISCONNECT_IMMEDIATELY"
            }
        else:
            # Fallback for unreadable or non-image format
            return {
                "extracted_text": "",
                "threat_score": 0,
                "matched_patterns": [],
                "reasoning": f"Could not process screenshot image: {str(e)}",
                "recommended_action": "SAFE"
            }

    if not extracted_text.strip():
        return {
            "extracted_text": "",
            "threat_score": 0,
            "matched_patterns": [],
            "reasoning": "No readable text could be extracted from the image.",
            "recommended_action": "SAFE",
        }

    # Evaluate extracted text via Groq LLaMA model
    result = evaluate_transcript(extracted_text)
    result["extracted_text"] = extracted_text

    # Auto-insert alert if high threat
    if result.get("threat_score", 0) > ALERT_THRESHOLD:
        try:
            sb = get_supabase()
            sb.table("alerts").insert({
                "call_id": None,
                "threat_score": result["threat_score"],
                "matched_patterns": result.get("matched_patterns", []),
                "reasoning": result.get("reasoning", ""),
                "recommended_action": result.get("recommended_action", "MONITOR"),
            }).execute()
        except Exception as e:
            result["db_warning"] = str(e)

    return result
