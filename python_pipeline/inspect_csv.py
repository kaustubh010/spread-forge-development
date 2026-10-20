import csv

with open("downloads/BhavCopyDateWise_16102026.csv", "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    print("CSV Headers:", reader.fieldnames)
    for row in reader:
        sym = (row.get("Commodity") or row.get("Symbol") or "").strip().upper()
        if sym in ["GOLD", "GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL"]:
            expiry = row.get("Expiry Date") or row.get("ExpiryDate") or ""
            close = row.get("Close") or row.get("SettlementPrice") or ""
            vol = row.get("Vol (Lots)") or row.get("Volume") or ""
            oi = row.get("OI (Lots)") or row.get("OpenInterest") or ""
            print(f"LIVE MCX CONTRACT: {sym:12} | Expiry: {expiry:10} | Close: {close:10} | Vol: {vol:8} | OI: {oi:8}")
