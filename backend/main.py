from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from routes.transcribe import router as transcribe_router
from routes.evaluate import router as evaluate_router
from routes.ocr import router as ocr_router
from routes.fraud_graph import router as fraud_graph_router
from routes.banknote import router as banknote_router
from lib.config import PORT

app = FastAPI(
    title="RakshaNet Backend API",
    description="AI-Powered Digital Public Safety — Fraud Detection APIs",
    version="1.0.0",
)

# Allow admin (Vite on 5173) and mobile dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8081",
        "*",  # Hackathon-safe: allow all
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(transcribe_router, tags=["ASR"])
app.include_router(evaluate_router, tags=["AI Evaluation"])
app.include_router(ocr_router, tags=["OCR"])
app.include_router(fraud_graph_router, tags=["Fraud Graph"])
app.include_router(banknote_router, tags=["Counterfeit CV"])


@app.get("/health", tags=["System"])
async def health():
    """
    Checks Supabase + Groq connectivity.
    Use this at the start of the demo to verify everything is live.
    """
    status = {"supabase": "unchecked", "groq": "unchecked"}

    # Check Supabase
    try:
        from lib.supabase_client import get_supabase
        sb = get_supabase()
        sb.table("alerts").select("id").limit(1).execute()
        status["supabase"] = "ok"
    except Exception as e:
        status["supabase"] = f"error: {str(e)}"

    # Check Groq
    try:
        from lib.groq_client import get_groq
        client = get_groq()
        client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
        )
        status["groq"] = "ok"
    except Exception as e:
        status["groq"] = f"error: {str(e)}"

    status["status"] = "healthy" if all(v == "ok" for v in status.values()) else "degraded"
    return status


@app.get("/", tags=["System"])
async def root():
    return {
        "name": "RakshaNet API",
        "version": "1.0.0",
        "endpoints": [
            "POST /transcribe",
            "POST /evaluate-script",
            "POST /process-call-chunk",
            "POST /ocr-screenshot",
            "GET  /fraud-graph",
            "GET  /health",
        ],
        "docs": "/docs",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
