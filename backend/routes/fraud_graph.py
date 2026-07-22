from fastapi import APIRouter, HTTPException
from lib.supabase_client import get_supabase

router = APIRouter()


def detect_circular_rings(transactions: list[dict]) -> list[dict]:
    """
    Pure-Python circular transaction ring detector.
    Finds A→B→C→A cycles in a list of transaction dicts.
    """
    # Build adjacency: from_account → [(to_account, amount)]
    graph: dict[str, list[tuple[str, float]]] = {}
    for tx in transactions:
        src = tx["from_account"]
        dst = tx["to_account"]
        amt = float(tx.get("amount", 0))
        graph.setdefault(src, []).append((dst, amt))

    rings: list[dict] = []

    def dfs(start: str, current: str, path: list[str], total: float, visited: set):
        for neighbor, amount in graph.get(current, []):
            if neighbor == start and len(path) >= 2:
                # Found a ring!
                rings.append({
                    "ring_accounts": path + [neighbor],
                    "total_amount": round(total + amount, 2),
                    "hop_count": len(path),
                })
                return
            if neighbor not in visited and len(path) < 8:  # limit depth
                visited.add(neighbor)
                dfs(start, neighbor, path + [neighbor], total + amount, visited)
                visited.discard(neighbor)

    all_accounts = list(graph.keys())
    for account in all_accounts:
        dfs(account, account, [account], 0.0, {account})

    # Deduplicate rings (same set of accounts can appear multiple times)
    seen = set()
    unique_rings = []
    for ring in rings:
        key = frozenset(ring["ring_accounts"])
        if key not in seen:
            seen.add(key)
            unique_rings.append(ring)

    return unique_rings


@router.get("/fraud-graph")
async def fraud_graph():
    """
    Returns the full fraud network graph:
    - nodes: mule accounts
    - edges: transactions between accounts
    - rings_detected: count of circular money-laundering routes
    - ring_details: the actual account chains forming rings
    """
    try:
        sb = get_supabase()

        mule_rows = sb.table("mule_accounts").select("*").execute()
        tx_rows = sb.table("transactions").select("*").execute()

        mule_accounts = mule_rows.data or []
        transactions = tx_rows.data or []

    except Exception:
        # Fallback to seed accounts if DB is unconfigured or unreachable
        mule_accounts = [
            {"id": "M1", "account_number_hash": "HDFC-882190", "risk_score": 88, "bank": "HDFC Bank", "location": "Jamtara, Jharkhand"},
            {"id": "M2", "account_number_hash": "ICICI-441029", "risk_score": 92, "bank": "ICICI Bank", "location": "Mewat, Haryana"},
            {"id": "M3", "account_number_hash": "SBI-109238", "risk_score": 45, "bank": "State Bank of India", "location": "Delhi NCR"},
            {"id": "M4", "account_number_hash": "AXIS-771239", "risk_score": 95, "bank": "Axis Bank", "location": "Kolkata, WB"},
            {"id": "M5", "account_number_hash": "PNB-992381", "risk_score": 78, "bank": "Punjab National Bank", "location": "Patna, Bihar"},
            {"id": "M6", "account_number_hash": "BOB-334120", "risk_score": 85, "bank": "Bank of Baroda", "location": "Mewat, Haryana"},
        ]
        transactions = [
            {"from_account": "M1", "to_account": "M2", "amount": 150000.0, "is_flagged": True, "ts": "2026-07-20T10:00:00Z"},
            {"from_account": "M2", "to_account": "M4", "amount": 120000.0, "is_flagged": True, "ts": "2026-07-20T10:05:00Z"},
            {"from_account": "M4", "to_account": "M5", "amount": 95000.0, "is_flagged": True, "ts": "2026-07-20T10:12:00Z"},
            {"from_account": "M5", "to_account": "M6", "amount": 80000.0, "is_flagged": True, "ts": "2026-07-20T10:18:00Z"},
            {"from_account": "M6", "to_account": "M1", "amount": 75000.0, "is_flagged": True, "ts": "2026-07-20T10:25:00Z"},  # Cycle A->B->D->E->F->A
            {"from_account": "M3", "to_account": "M1", "amount": 50000.0, "is_flagged": False, "ts": "2026-07-20T11:00:00Z"},
        ]

    # Build nodes list
    nodes = [
        {
            "id": str(m["id"]),
            "label": f"Account #{str(m['account_number_hash'])[-6:]}",
            "type": "mule" if m["risk_score"] >= 60 else "suspicious",
            "risk_score": m["risk_score"],
            "bank": m.get("bank", "Unknown"),
            "location": m.get("location", "Unknown"),
        }
        for m in mule_accounts
    ]

    # Build edges list
    edges = [
        {
            "from": tx["from_account"],
            "to": tx["to_account"],
            "amount": float(tx["amount"]),
            "is_flagged": tx.get("is_flagged", False),
            "timestamp": tx.get("ts", ""),
        }
        for tx in transactions
    ]

    # Detect circular rings
    ring_details = detect_circular_rings(transactions)

    return {
        "nodes": nodes,
        "edges": edges,
        "rings_detected": len(ring_details),
        "ring_details": ring_details,
        "total_mule_accounts": len(mule_accounts),
        "total_transactions": len(transactions),
        "flagged_transactions": sum(1 for e in edges if e["is_flagged"]),
    }
