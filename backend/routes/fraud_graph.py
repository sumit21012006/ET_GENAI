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

    except Exception as e:
        raise HTTPException(500, f"Database error: {str(e)}")

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
