import os
from playwright.sync_api import sync_playwright

def download_latest():
    os.makedirs("downloads", exist_ok=True)
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

    def handle_response(response):
        if "MCX_Service.asmx" in response.url or "bhavcopy" in response.url.lower():
            print(f"[API RESPONSE] {response.status} {response.url}")
            try:
                ct = response.headers.get("content-type", "")
                if "json" in ct or "text" in ct:
                    text = response.text()
                    print(f"  Body preview ({len(text)} bytes): {text[:300]}")
            except Exception as e:
                pass

    page.on("response", handle_response)

    print("Navigating to MCX Bhavcopy...")
    page.goto("https://www.mcxindia.com/market-data/bhavcopy", timeout=30000, wait_until="networkidle")

    # Dismiss any disclaimer/popup if present
    try:
        accept_btn = page.query_selector(".popup-accept-btn, #btnAccept, text=ACCEPT")
        if accept_btn and accept_btn.is_visible():
            accept_btn.click()
            print("Clicked popup accept button.")
            page.wait_for_timeout(1000)
    except Exception as e:
        print("Popup check:", e)

    # Check date input value
    date_input = page.query_selector("#bhavCopyDateWise, .bhavCopyDateWise")
    if date_input:
        curr_val = date_input.input_value()
        print(f"Current Date input value: '{curr_val}'")
        if not curr_val:
            # Get from hdnUCDate
            hdn = page.query_selector("#hdnUCDate, .hdnUCDate")
            hdn_val = hdn.get_attribute("value") if hdn else "16/10/2026"
            print(f"Setting date from hidden field: '{hdn_val}'")
            date_input.fill(hdn_val)

    # Click Show button
    show_btn = page.query_selector("#btnDateWise, .btnDateWise")
    if show_btn:
        print("Clicking Show button...")
        show_btn.click()
        page.wait_for_timeout(5000)

    # Check for downloaded CSV or table rows
    csv_btn = page.query_selector("#btnDateWiseCSV, .btnDateWiseCSV")
    if csv_btn:
        print("Attempting CSV download click...")
        try:
            with page.expect_download(timeout=10000) as download_info:
                csv_btn.click()
            download = download_info.value
            save_path = os.path.join("downloads", download.suggested_filename)
            download.save_as(save_path)
            print(f"Successfully downloaded Bhavcopy file to: {save_path}")
            print(f"File size: {os.path.getsize(save_path)} bytes")
        except Exception as e:
            print("Download expectation:", e)

    # Check table content on page
    rows = page.query_selector_all("table tr")
    print(f"Found {len(rows)} table rows on page after click.")
    for r in rows[:10]:
        text = r.inner_text().strip().replace("\t", " | ")
        if text and any(g in text for g in ["GOLD", "Date", "Symbol", "Close"]):
            print("  ROW:", text)

    b.close()
    p.stop()

if __name__ == "__main__":
    download_latest()
