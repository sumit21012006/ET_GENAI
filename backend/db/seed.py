"""
Seed script — inserts demo data into Supabase for frontend integration.
Run: python db/seed.py
Make sure .env is set up first.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from lib.supabase_client import get_supabase

def seed():
    sb = get_supabase()
    print("🌱 Seeding RakshaNet demo data...\n")

    # ── 1. Calls ─────────────────────────────────────────────────────────
    calls = sb.table("calls").insert([
        {
            "phone_number": "+91 98450 12093",
            "transcript": "Hello, this is Inspector Rahul Sharma from Delhi Customs. You are under digital arrest. Transfer 3,50,000 to our RBI hold account immediately.",
            "status": "flagged",
        },
        {
            "phone_number": "+91 80211 44921",
            "transcript": "Your electricity connection will be disconnected tonight. Download QuickSupport to fix it.",
            "status": "flagged",
        },
        {
            "phone_number": "+91 77309 55810",
            "transcript": "Hi, calling from SBI bank. Your KYC is pending. Please share your OTP to verify.",
            "status": "flagged",
        },
    ]).execute()

    call_ids = [row["id"] for row in calls.data]
    print(f"✅ Inserted {len(call_ids)} calls")

    # ── 2. Alerts ─────────────────────────────────────────────────────────
    sb.table("alerts").insert([
        {
            "call_id": call_ids[0],
            "threat_score": 94,
            "matched_patterns": ["Digital Arrest Threat", "Authority Impersonation", "Coerced Transaction Request"],
            "reasoning": "Caller claims to be CBI inspector and demands immediate bank transfer, classic digital arrest playbook.",
            "recommended_action": "DISCONNECT_IMMEDIATELY",
        },
        {
            "call_id": call_ids[1],
            "threat_score": 72,
            "matched_patterns": ["Remote Access Tool Installation", "Urgency Pressure"],
            "reasoning": "Caller threatens electricity disconnection and asks to install QuickSupport — remote access scam.",
            "recommended_action": "DISCONNECT_IMMEDIATELY",
        },
        {
            "call_id": call_ids[2],
            "threat_score": 68,
            "matched_patterns": ["KYC Fraud", "OTP Phishing"],
            "reasoning": "Caller impersonates bank and requests OTP — standard vishing attack.",
            "recommended_action": "WARN_USER",
        },
    ]).execute()
    print("✅ Inserted 3 alerts")

    # ── 3. Mule Accounts ─────────────────────────────────────────────────
    mules = sb.table("mule_accounts").insert([
        {"account_number_hash": "hash_SBI_KARAN_MEHRA",    "risk_score": 95, "bank": "SBI",   "location": "Delhi",   "linked_case_ids": [call_ids[0]]},
        {"account_number_hash": "hash_HDFC_SANJAY_KUMAR",  "risk_score": 88, "bank": "HDFC",  "location": "Jamtara", "linked_case_ids": [call_ids[0]]},
        {"account_number_hash": "hash_ICICI_GAURAV_DAS",   "risk_score": 83, "bank": "ICICI", "location": "Mewat",   "linked_case_ids": [call_ids[0], call_ids[1]]},
        {"account_number_hash": "hash_AXIS_ANUP_ENT",      "risk_score": 71, "bank": "Axis",  "location": "Kolkata", "linked_case_ids": []},
        {"account_number_hash": "hash_BOB_VIKRAM_SINGH",   "risk_score": 90, "bank": "BOB",   "location": "Mewat",   "linked_case_ids": [call_ids[2]]},
    ]).execute()
    print(f"✅ Inserted {len(mules.data)} mule accounts")

    # ── 4. Transactions (includes 2 circular rings) ───────────────────────
    # Ring 1: V1 → M1 → M3 → M5 → M1 (circular)
    # Ring 2: V1 → M2 → M4 → M2 (circular)
    sb.table("transactions").insert([
        # Victim to Layer-1 mules (flagged)
        {"from_account": "hash_SBI_KARAN_MEHRA",  "to_account": "hash_HDFC_SANJAY_KUMAR", "amount": 200000, "is_flagged": True},
        {"from_account": "hash_SBI_KARAN_MEHRA",  "to_account": "hash_ICICI_GAURAV_DAS",  "amount": 150000, "is_flagged": True},

        # Layer-1 to Layer-2 laundering (flagged)
        {"from_account": "hash_HDFC_SANJAY_KUMAR", "to_account": "hash_AXIS_ANUP_ENT",    "amount": 120000, "is_flagged": True},
        {"from_account": "hash_HDFC_SANJAY_KUMAR", "to_account": "hash_BOB_VIKRAM_SINGH", "amount": 80000,  "is_flagged": True},
        {"from_account": "hash_ICICI_GAURAV_DAS",  "to_account": "hash_BOB_VIKRAM_SINGH", "amount": 150000, "is_flagged": True},

        # RING 1: circular loop back (money laundering cycle)
        {"from_account": "hash_BOB_VIKRAM_SINGH",  "to_account": "hash_HDFC_SANJAY_KUMAR", "amount": 95000, "is_flagged": True},

        # RING 2: smaller 3-hop ring
        {"from_account": "hash_AXIS_ANUP_ENT",     "to_account": "hash_ICICI_GAURAV_DAS",  "amount": 60000, "is_flagged": True},
        {"from_account": "hash_ICICI_GAURAV_DAS",  "to_account": "hash_AXIS_ANUP_ENT",     "amount": 55000, "is_flagged": True},

        # Some normal-looking transactions to pad the graph
        {"from_account": "hash_AXIS_ANUP_ENT",     "to_account": "hash_BOB_VIKRAM_SINGH",  "amount": 30000, "is_flagged": False},
        {"from_account": "hash_BOB_VIKRAM_SINGH",  "to_account": "hash_ICICI_GAURAV_DAS",  "amount": 25000, "is_flagged": False},
    ]).execute()
    print("✅ Inserted 10 transactions (with 2 circular rings)")

    print("\n🎉 Seed complete! Your Supabase tables are ready for the demo.")

if __name__ == "__main__":
    seed()
