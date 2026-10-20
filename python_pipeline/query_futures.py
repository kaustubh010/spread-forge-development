import csv

with open("downloads/BhavCopyDateWise_16102026.csv", "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        inst = (row.get("Instrument Name") or "").strip()
        opt = (row.get("Option Type") or "").strip()
        sym = (row.get("Symbol") or "").strip().upper()
        if inst == "FUTCOM" and opt == "-" and sym in ["GOLD", "GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL"]:
            expiry = (row.get("Expiry Date") or "").strip()
            close = float(row.get("Close") or 0)
            open_p = float(row.get("Open") or close)
            high = float(row.get("High") or close)
            low = float(row.get("Low") or close)
            vol = row.get("Volume(Lots)") or 0
            oi = row.get("Open Interest(Lots)") or 0
            date = (row.get("Date") or "").strip()
            print(f"REAL MCX FUTCOM: Date: {date:11} | {sym:12} | Expiry: {expiry:10} | Close: {close:10.2f} | Vol: {vol:6} | OI: {oi:6}")
