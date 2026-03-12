from playwright.sync_api import sync_playwright
import json, os

SCREENSHOT_DIR = '/home/clawd/projects/x-growth-engine/test-screenshots'
BASE_URL = 'https://koiopenclaw-max.github.io/x-growth-engine/'

console_messages = []
js_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})

    # Capture all console messages
    page.on("console", lambda msg: console_messages.append({
        "type": msg.type,
        "text": msg.text,
        "location": str(msg.location) if msg.location else None
    }))
    page.on("pageerror", lambda exc: js_errors.append(str(exc)))

    # Step 1 & 2: Navigate to main page, screenshot
    print("=== Step 1: Navigating to main page ===")
    response = page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
    print(f"Status: {response.status if response else 'no response'}")
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, '01-main-page.png'), full_page=True)
    print(f"Title: {page.title()}")
    print(f"URL: {page.url}")

    # Print page content summary
    body_text = page.inner_text('body')
    print(f"\n=== Page text (first 500 chars) ===\n{body_text[:500]}")

    # Step 3: Check console errors so far
    print(f"\n=== Console messages after main page ===")
    for msg in console_messages:
        print(f"  [{msg['type']}] {msg['text']}")
    if js_errors:
        print(f"\n=== JS Errors ===")
        for err in js_errors:
            print(f"  ERROR: {err}")
    else:
        print("  No JS errors detected.")

    # Step 4: Navigate to /articles/new
    print("\n=== Step 4: Navigating to /x-growth-engine/articles/new ===")
    console_messages_before = len(console_messages)
    js_errors_before = len(js_errors)

    response2 = page.goto(BASE_URL + 'articles/new', wait_until="networkidle", timeout=30000)
    print(f"Status: {response2.status if response2 else 'no response'}")
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, '02-articles-new.png'), full_page=True)
    print(f"Title: {page.title()}")
    print(f"URL: {page.url}")

    body_text2 = page.inner_text('body')
    print(f"\n=== Page text (first 500 chars) ===\n{body_text2[:500]}")

    # Step 5: Check for new JS errors
    print(f"\n=== New console messages after /articles/new ===")
    for msg in console_messages[console_messages_before:]:
        print(f"  [{msg['type']}] {msg['text']}")
    if js_errors[js_errors_before:]:
        print(f"\n=== New JS Errors ===")
        for err in js_errors[js_errors_before:]:
            print(f"  ERROR: {err}")
    else:
        print("  No new JS errors detected.")

    # Final summary
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print(f"Total console messages: {len(console_messages)}")
    print(f"Total JS errors: {len(js_errors)}")
    error_msgs = [m for m in console_messages if m['type'] == 'error']
    warning_msgs = [m for m in console_messages if m['type'] == 'warning']
    print(f"Console errors: {len(error_msgs)}")
    print(f"Console warnings: {len(warning_msgs)}")
    if error_msgs:
        print("\nAll console errors:")
        for m in error_msgs:
            print(f"  {m['text']}")
    if js_errors:
        print("\nAll JS exceptions:")
        for e in js_errors:
            print(f"  {e}")

    print(f"\nScreenshots saved to: {SCREENSHOT_DIR}")
    browser.close()
