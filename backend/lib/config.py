import os
from dotenv import load_dotenv

load_dotenv()

def get_required(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(
            f"❌ Missing required env var: {key}\n"
            f"   Copy .env.example → .env and fill in your keys."
        )
    return value

SUPABASE_URL = get_required("SUPABASE_URL")
SUPABASE_ANON_KEY = get_required("SUPABASE_ANON_KEY")
GROQ_API_KEY = get_required("GROQ_API_KEY")
PORT = int(os.getenv("PORT", "8000"))
