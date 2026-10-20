from playwright.sync_api import sync_playwright

def inspect():
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

    page.on("request", lambda req: print("NETWORK REQ:", req.method, req.url) if any(k in req.url.lower() for k in ["bhavcopy", "market", "get", "data", "report"]) else None)
    page.on("response", lambda res: print("NETWORK RES:", res.status, res.url) if any(k in res.url.lower() for k in ["bhavcopy", "market", "get", "data", "report"]) else None)

    res = page.goto("https://www.mcxindia.com/market-data/bhavcopy", timeout=30000, wait_until="networkidle")
    print("Page Title:", page.title())

    inputs = page.query_selector_all("input, select, button, a")
    for el in inputs:
        tag = el.evaluate("e => e.tagName")
        name = el.get_attribute("name") or el.get_attribute("id") or el.get_attribute("class") or ""
        text = el.inner_text().strip() if tag in ["BUTTON", "A"] else ""
        val = el.get_attribute("value") or ""
        el_type = el.get_attribute("type") or ""
        if any(w in (name + text).lower() for w in ["date", "bhav", "submit", "show", "download", "csv", "excel", "btn"]):
            print(f"MATCH: <{tag}> id/class='{name}' type='{el_type}' val='{val}' text='{text}'")

    b.close()
    p.stop()

if __name__ == "__main__":
    inspect()
