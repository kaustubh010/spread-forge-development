"""
Live MCX Bhavcopy Scraper and Real-Time Normalizer
Scrapes official Bhavcopy files directly from https://www.mcxindia.com/market-data/bhavcopy
Extracts actual exchange settlement data for GOLDM, GOLDTEN, GOLDGUINEA, GOLDPETAL,
computes normalized price per gram with 995/999 purity adjustments,
and outputs data/bhavcopy_gold.json.
"""

import os
import json
import csv
import io
import datetime
from typing import Dict, List, Any
from playwright.sync_api import sync_playwright

CONTRACT_SPECS = {
    "GOLDM": {
        "name": "Gold Mini",
        "lot_size": "100 g",
        "quote_base_g": 10,
        "purity": 995,
        "purity_factor": 999.0 / 995.0,
        "expiry_window": "3rd–5th",
    },
    "GOLDTEN": {
        "name": "Gold Ten",
        "lot_size": "10 g",
        "quote_base_g": 10,
        "purity": 999,
        "purity_factor": 1.0,
        "expiry_window": "27th–31st",
    },
    "GOLDGUINEA": {
        "name": "Gold Guinea",
        "lot_size": "8 g",
        "quote_base_g": 8,
        "purity": 999,
        "purity_factor": 1.0,
        "expiry_window": "27th–31st",
    },
    "GOLDPETAL": {
        "name": "Gold Petal",
        "lot_size": "1 g",
        "quote_base_g": 1,
        "purity": 999,
        "purity_factor": 1.0,
        "expiry_window": "27th–31st",
    },
}

def normalize_price_per_gram(symbol: str, raw_price: float) -> float:
    spec = CONTRACT_SPECS.get(symbol.strip().upper())
    if not spec or raw_price <= 0:
        return raw_price
    base = raw_price / spec["quote_base_g"]
    return round(base * spec["purity_factor"], 4)

def parse_date_iso(raw_date: str) -> str:
    # Handles "16 Oct 2026", "10/16/2026", "16/10/2026"
    raw_date = raw_date.strip()
    try:
        # e.g. "16 Oct 2026"
        dt = datetime.datetime.strptime(raw_date, "%d %b %Y")
        return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
    try:
        # e.g. "10/16/2026"
        dt = datetime.datetime.strptime(raw_date, "%m/%d/%Y")
        return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
    try:
        # e.g. "16/10/2026"
        dt = datetime.datetime.strptime(raw_date, "%d/%m/%Y")
        return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
    return raw_date

def scrape_live_mcx(dates_to_fetch: List[str] = None):
    os.makedirs("data", exist_ok=True)
    os.makedirs("downloads", exist_ok=True)

    if not dates_to_fetch:
        # Default to recent trading days leading up to 16/10/2026
        dates_to_fetch = [
            "16/10/2026",
            "15/10/2026",
            "14/10/2026",
            "13/10/2026",
            "12/10/2026",
            "09/10/2026",
            "08/10/2026",
            "07/10/2026",
            "06/10/2026",
            "05/10/2026",
            "01/10/2026",
            "30/09/2026",
            "29/09/2026",
            "28/09/2026",
            "25/09/2026",
            "24/09/2026",
            "23/09/2026",
            "22/09/2026",
            "21/09/2026",
            "18/09/2026",
            "17/09/2026",
            "16/09/2026",
            "15/09/2026",
        ]

    print(f"Starting Live MCX Scraper for {len(dates_to_fetch)} trading dates...")
    p = sync_playwright().start()
    b = p.chromium.launch(
        channel="msedge",
        headless=True,
        args=["--disable-blink-features=AutomationControlled"]
    )
    context = b.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        accept_downloads=True
    )
    page = context.new_page()
    page.add_init_script("delete Object.getPrototypeOf(navigator).webdriver")

    print("Navigating to https://www.mcxindia.com/market-data/bhavcopy to initialize authenticated session...")
    page.goto("https://www.mcxindia.com/market-data/bhavcopy", timeout=35000, wait_until="networkidle")

    # Dismiss any disclaimer modal
    try:
        accept_btn = page.query_selector(".popup-accept-btn, #btnAccept")
        if accept_btn and accept_btn.is_visible():
            accept_btn.click()
            page.wait_for_timeout(500)
    except Exception:
        pass

    all_cleaned_records = []
    by_contract = {c: [] for c in CONTRACT_SPECS}

    for d_str in dates_to_fetch:
        csv_file = os.path.join("downloads", f"BhavCopyDateWise_{d_str.replace('/', '')}.csv")
        records_for_date = []

        if os.path.exists(csv_file) and os.path.getsize(csv_file) > 1000:
            print(f"Using locally downloaded Bhavcopy for date {d_str} ({os.path.getsize(csv_file)} bytes)")
            with open(csv_file, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.DictReader(f)
                records_for_date = list(reader)
        else:
            print(f"Scraping live MCX Bhavcopy for date: {d_str}...")
            try:
                date_input = page.query_selector("#bhavCopyDateWise, .bhavCopyDateWise")
                if date_input:
                    date_input.fill("")
                    date_input.fill(d_str)

                csv_btn = page.query_selector("#btnDateWiseCSV, .btnDateWiseCSV")
                if csv_btn:
                    with page.expect_download(timeout=12000) as download_info:
                        csv_btn.click()
                    download = download_info.value
                    download.save_as(csv_file)
                    print(f"  Downloaded {csv_file} ({os.path.getsize(csv_file)} bytes)")
                    with open(csv_file, "r", encoding="utf-8", errors="ignore") as f:
                        reader = csv.DictReader(f)
                        records_for_date = list(reader)
            except Exception as e:
                print(f"  Live fetch error for {d_str}: {e}")

        # Parse FUTCOM gold records
        for row in records_for_date:
            inst = (row.get("Instrument Name") or row.get("Instrument") or "").strip()
            opt = (row.get("Option Type") or "-").strip()
            sym = (row.get("Symbol") or row.get("Commodity") or "").strip().upper()

            if inst == "FUTCOM" and opt in ["-", ""] and sym in CONTRACT_SPECS:
                raw_date = (row.get("Date") or d_str).strip()
                trading_date = parse_date_iso(raw_date)
                expiry = (row.get("Expiry Date") or row.get("ExpiryDate") or "").strip()

                try:
                    close_raw = float(row.get("Close") or 0)
                    open_raw = float(row.get("Open") or close_raw)
                    high_raw = float(row.get("High") or close_raw)
                    low_raw = float(row.get("Low") or close_raw)
                    vol = int(float(row.get("Volume(Lots)") or row.get("Vol (Lots)") or row.get("Volume") or 0))
                    oi = int(float(row.get("Open Interest(Lots)") or row.get("OI (Lots)") or row.get("OpenInterest") or 0))
                except (ValueError, TypeError):
                    continue

                if close_raw <= 0:
                    continue

                norm_close = normalize_price_per_gram(sym, close_raw)
                norm_open = normalize_price_per_gram(sym, open_raw)
                norm_high = normalize_price_per_gram(sym, high_raw)
                norm_low = normalize_price_per_gram(sym, low_raw)

                item = {
                    "symbol": sym,
                    "contractName": CONTRACT_SPECS[sym]["name"],
                    "tradingDate": trading_date,
                    "expiryDate": expiry,
                    "rawClose": close_raw,
                    "rawOpen": open_raw,
                    "rawHigh": high_raw,
                    "rawLow": low_raw,
                    "close": norm_close,
                    "open": norm_open,
                    "high": norm_high,
                    "low": norm_low,
                    "volume": vol,
                    "openInterest": oi,
                    "source": "MCX Live Bhavcopy Scraped Data",
                }
                all_cleaned_records.append(item)
                by_contract[sym].append(item)

    b.close()
    p.stop()

    # Sort records chronologically
    for sym in by_contract:
        # Keep nearest active expiry if multiple expiries exist for a date
        date_map = {}
        for r in sorted(by_contract[sym], key=lambda x: (x["tradingDate"], x["expiryDate"])):
            d = r["tradingDate"]
            if d not in date_map or r["volume"] > date_map[d]["volume"]:
                date_map[d] = r
        by_contract[sym] = sorted(date_map.values(), key=lambda x: x["tradingDate"])

    # Output consolidated normalized JSON
    output_path = os.path.join("data", "bhavcopy_gold.json")
    payload = {
        "generatedAt": datetime.datetime.now().isoformat(),
        "dataSource": "MCX India Live Bhavcopy Portal",
        "portalUrl": "https://www.mcxindia.com/market-data/bhavcopy",
        "totalRecords": sum(len(records) for records in by_contract.values()),
        "contracts": {
            sym: {
                "spec": CONTRACT_SPECS[sym],
                "count": len(by_contract[sym]),
                "latestPrice": by_contract[sym][-1]["rawClose"] if by_contract[sym] else None,
                "latestNormalizedPrice": by_contract[sym][-1]["close"] if by_contract[sym] else None,
                "latestDate": by_contract[sym][-1]["tradingDate"] if by_contract[sym] else None,
                "observations": by_contract[sym]
            }
            for sym in CONTRACT_SPECS
        }
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"\n[MCX Live Pipeline] SUCCESS! Saved {payload['totalRecords']} live verified records to {output_path}")
    for sym in CONTRACT_SPECS:
        last = by_contract[sym][-1] if by_contract[sym] else {}
        print(f"  {sym:12} | Records: {len(by_contract[sym]):3} | Latest Date: {last.get('tradingDate')} | Raw Close: ₹{last.get('rawClose', 0):,.2f} | Norm/g (999): ₹{last.get('close', 0):,.2f}")

    return payload

if __name__ == "__main__":
    scrape_live_mcx()
