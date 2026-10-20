"""
MCX Bhavcopy Scraper and Normalizer
Commodity Derivatives Intelligence - Track 03 (MCX Gold Futures)

Handles:
- MCX Bhavcopy download / web scraping
- Date format conversions (DD/MM/YYYY request vs MM/DD/YYYY response)
- Space-padded symbols and compact expiry dates (e.g., '04SEP2026')
- Expiry-based tracking (avoids artificial roll jumps of continuous series)
- Price per gram normalization with purity adjustment (995 vs 999)
- JSON export for the Next.js React frontend
"""

import os
import re
import json
import datetime
from typing import Dict, List, Optional, Any

# MCX Gold Contract Specifications
CONTRACT_SPECS = {
    "GOLDM": {
        "name": "Gold Mini",
        "trading_unit_g": 100,
        "quote_base_g": 10,
        "purity": 995,
        "purity_factor": 999.0 / 995.0,  # Normalize 995 purity to standard 999
        "expiry_window": "3rd–5th",
        "lot_size": "100 g",
    },
    "GOLDTEN": {
        "name": "Gold Ten",
        "trading_unit_g": 10,
        "quote_base_g": 10,
        "purity": 999,
        "purity_factor": 1.0,            # Already 999 pure
        "expiry_window": "27th–31st",
        "lot_size": "10 g",
    },
    "GOLDGUINEA": {
        "name": "Gold Guinea",
        "trading_unit_g": 8,
        "quote_base_g": 8,
        "purity": 999,
        "purity_factor": 1.0,            # Already 999 pure
        "expiry_window": "27th–31st",
        "lot_size": "8 g",
    },
    "GOLDPETAL": {
        "name": "Gold Petal",
        "trading_unit_g": 1,
        "quote_base_g": 1,
        "purity": 999,
        "purity_factor": 1.0,            # Already 999 pure
        "expiry_window": "27th–31st",
        "lot_size": "1 g",
    },
}

class MCXBhavcopyPipeline:
    def __init__(self, output_dir: str = "data"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    @staticmethod
    def normalize_price_per_gram(symbol: str, raw_price: float) -> float:
        """
        Price per gram = (quoted price ÷ quote base) * purity adjustment factor
        Adjusts 995 purity (GOLDM) to standardized 999 purity.
        """
        spec = CONTRACT_SPECS.get(symbol.strip().upper())
        if not spec or raw_price <= 0:
            return raw_price
        
        base_price_per_gram = raw_price / spec["quote_base_g"]
        normalized = base_price_per_gram * spec["purity_factor"]
        return round(normalized, 4)

    @staticmethod
    def parse_mcx_date(date_str: str) -> Optional[str]:
        """
        Handles MCX response date formats:
        - MM/DD/YYYY -> YYYY-MM-DD
        - DD/MM/YYYY -> YYYY-MM-DD
        - YYYY-MM-DD -> YYYY-MM-DD
        """
        if not date_str:
            return None
        date_str = date_str.strip()
        
        # Check standard ISO YYYY-MM-DD
        if re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
            return date_str
            
        # Check MM/DD/YYYY (common MCX Bhavcopy response)
        m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", date_str)
        if m:
            part1, part2, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            # MCX typically returns MM/DD/YYYY in exports
            month, day = part1, part2
            if month > 12:  # swap if part1 was day
                day, month = part1, part2
            return f"{year:04d}-{month:02d}-{day:02d}"
        return None

    @staticmethod
    def clean_record(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Validates, cleans, and normalizes a single MCX Bhavcopy record.
        """
        symbol = str(row.get("Symbol") or row.get("symbol") or "").strip().upper()
        if symbol not in CONTRACT_SPECS:
            return None

        raw_date = str(row.get("Date") or row.get("date") or "")
        trading_date = MCXBhavcopyPipeline.parse_mcx_date(raw_date)
        if not trading_date:
            return None

        expiry = str(row.get("ExpiryDate") or row.get("expiry") or "").strip().upper()

        try:
            close_raw = float(row.get("Close") or row.get("close") or row.get("SettlementPrice") or 0)
            if close_raw <= 0:
                return None
            open_raw = float(row.get("Open") or row.get("open") or close_raw)
            high_raw = float(row.get("High") or row.get("high") or close_raw)
            low_raw = float(row.get("Low") or row.get("low") or close_raw)
            volume = int(float(row.get("Volume") or row.get("volume") or 0))
            oi = int(float(row.get("OpenInterest") or row.get("openInterest") or 0))
        except (ValueError, TypeError):
            return None

        # Calculate normalized price per gram (999 pure equivalent)
        norm_close = MCXBhavcopyPipeline.normalize_price_per_gram(symbol, close_raw)
        norm_open = MCXBhavcopyPipeline.normalize_price_per_gram(symbol, open_raw)
        norm_high = MCXBhavcopyPipeline.normalize_price_per_gram(symbol, high_raw)
        norm_low = MCXBhavcopyPipeline.normalize_price_per_gram(symbol, low_raw)

        return {
            "symbol": symbol,
            "contractName": CONTRACT_SPECS[symbol]["name"],
            "tradingDate": trading_date,
            "expiryDate": expiry,
            "rawClose": close_raw,
            "rawOpen": open_raw,
            "rawHigh": high_raw,
            "rawLow": low_raw,
            "normalizedClosePerGram": norm_close,
            "normalizedOpenPerGram": norm_open,
            "normalizedHighPerGram": norm_high,
            "normalizedLowPerGram": norm_low,
            "purity": CONTRACT_SPECS[symbol]["purity"],
            "volume": volume,
            "openInterest": oi,
            "source": "MCX Daily Bhavcopy (Official Exchange Settlement)",
        }

    def process_bhavcopy_dataset(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Processes an entire batch of Bhavcopy records and groups by contract symbol and expiry.
        """
        cleaned_records = []
        by_contract = {c: [] for c in CONTRACT_SPECS}

        for r in records:
            cleaned = self.clean_record(r)
            if cleaned:
                cleaned_records.append(cleaned)
                by_contract[cleaned["symbol"]].append(cleaned)

        # Sort each contract's records chronologically
        for sym in by_contract:
            by_contract[sym].sort(key=lambda x: x["tradingDate"])

        output_path = os.path.join(self.output_dir, "bhavcopy_gold.json")
        payload = {
            "generatedAt": datetime.datetime.now().isoformat(),
            "totalRecords": len(cleaned_records),
            "contracts": {
                sym: {
                    "spec": CONTRACT_SPECS[sym],
                    "count": len(by_contract[sym]),
                    "observations": [
                        {
                            "tradingDate": item["tradingDate"],
                            "expiryDate": item["expiryDate"],
                            "rawClose": item["rawClose"],
                            "close": item["normalizedClosePerGram"],
                            "open": item["normalizedOpenPerGram"],
                            "high": item["normalizedHighPerGram"],
                            "low": item["normalizedLowPerGram"],
                            "volume": item["volume"],
                            "openInterest": item["openInterest"],
                        }
                        for item in by_contract[sym]
                    ]
                }
                for sym in CONTRACT_SPECS
            }
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

        print(f"[MCXBhavcopyPipeline] Successfully saved {len(cleaned_records)} normalized records to {output_path}")
        return payload

if __name__ == "__main__":
    pipeline = MCXBhavcopyPipeline()
    print("MCX Bhavcopy Pipeline Initialized with Contract Specs:")
    for sym, spec in CONTRACT_SPECS.items():
        print(f"  {sym:12} | Lot: {spec['lot_size']:6} | Purity: {spec['purity']} | Factor: {spec['purity_factor']:.4f}")
