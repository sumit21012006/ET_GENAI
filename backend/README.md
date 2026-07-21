# RakshaNet Backend API

FastAPI-powered backend for the RakshaNet Digital Public Safety platform.

## Setup

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy and fill in your keys
copy .env.example .env
# Edit .env with your Supabase URL, Supabase Anon Key, and Groq API key

# 4. Run the server
python main.py
# Server starts at http://localhost:8000
# API docs at  http://localhost:8000/docs
```

## Database Setup (Supabase)

1. Create a free project at https://supabase.com
2. Go to **SQL Editor** in your Supabase dashboard
3. Run each file in `db/migrations/` **in order** (001 → 006)
4. Enable Realtime: Dashboard → Database → Replication → toggle `alerts` table ON
5. Run seed data: `python db/seed.py`

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/health` | Check Supabase + Groq connectivity |
| `POST` | `/transcribe` | Audio file → Whisper transcript |
| `POST` | `/evaluate-script` | Transcript text → scam threat verdict (JSON) |
| `POST` | `/process-call-chunk` | Audio → transcribe + evaluate in one call |
| `POST` | `/ocr-screenshot` | Image → OCR text → scam verdict |
| `GET`  | `/fraud-graph` | Mule network nodes + edges + ring detection |

## Example Calls

```bash
# Health check
curl http://localhost:8000/health

# Evaluate a transcript
curl -X POST http://localhost:8000/evaluate-script \
  -H "Content-Type: application/json" \
  -d '{"transcript": "You are under digital arrest. Transfer 3,50,000 to RBI hold account immediately or police will arrive."}'

# OCR a screenshot (replace with real file)
curl -X POST http://localhost:8000/ocr-screenshot \
  -F "image=@scam_screenshot.png"

# Fraud graph
curl http://localhost:8000/fraud-graph
```

## Response Shape: `/evaluate-script`

```json
{
  "threat_score": 94,
  "matched_patterns": ["Digital Arrest Threat", "Coerced Transaction Request"],
  "reasoning": "Caller impersonates authority and demands immediate bank transfer — classic digital arrest + money coercion pattern.",
  "recommended_action": "DISCONNECT_IMMEDIATELY",
  "call_id": null
}
```

## Keys Needed

| Key | Where to Get |
|-----|-------------|
| `SUPABASE_URL` | Supabase dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API |
| `GROQ_API_KEY` | https://console.groq.com (free) |
