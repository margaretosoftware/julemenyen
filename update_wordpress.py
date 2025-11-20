#!/usr/bin/env python3
"""
WordPress Auto-Updater for Julemenyen
Updates WordPress pages with the latest menu from Google Sheets CSV
"""

import os
import sys
import requests
import csv
from io import StringIO
from typing import List, Dict, Optional
import json

# WordPress configuration
WP_URL = "https://julemarkedet-trondheim.no"
WP_USERNAME = "admin"
WP_APP_PASSWORD = os.environ.get("WP_APP_PASSWORD", "")
PAGE_ID_NO = 8498  # Norwegian page
PAGE_ID_EN = 8500  # English page

# CSV URL (published Google Sheets)
CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSo0BYZqtNREhfTCo-ZPWCis5_84iokH3Bqi68itYeRYzjXNsyGK5BWw0omyzHQrwks4vB7yph5-bTk/pub?gid=0&single=true&output=csv"

# GitHub raw URLs for HTML templates
HTML_NO_URL = "https://raw.githubusercontent.com/margaretosoftware/julemenyen/main/html-no.html"
HTML_EN_URL = "https://raw.githubusercontent.com/margaretosoftware/julemenyen/main/html-en.html"


def fetch_csv() -> List[Dict[str, str]]:
    """Fetch and parse CSV from Google Sheets"""
    print(f"📊 Fetching CSV from Google Sheets...")
    response = requests.get(CSV_URL, timeout=10)
    response.raise_for_status()

    csv_text = response.text
    reader = csv.DictReader(StringIO(csv_text))
    rows = [row for row in reader]

    print(f"✅ Fetched {len(rows)} rows from CSV")
    return rows


def get_wordpress_page_content(page_id: int) -> Optional[str]:
    """Get current content of a WordPress page"""
    print(f"📄 Fetching WordPress page {page_id}...")

    url = f"{WP_URL}/wp-json/wp/v2/pages/{page_id}"
    auth = (WP_USERNAME, WP_APP_PASSWORD)

    response = requests.get(url, auth=auth, timeout=10)
    response.raise_for_status()

    data = response.json()
    content = data.get("content", {}).get("rendered", "")

    print(f"✅ Fetched page {page_id} ({len(content)} chars)")
    return content


def update_wordpress_page(page_id: int, new_content: str) -> bool:
    """Update WordPress page content"""
    print(f"📝 Updating WordPress page {page_id}...")

    url = f"{WP_URL}/wp-json/wp/v2/pages/{page_id}"
    auth = (WP_USERNAME, WP_APP_PASSWORD)

    payload = {
        "content": new_content
    }

    response = requests.post(url, auth=auth, json=payload, timeout=10)
    response.raise_for_status()

    print(f"✅ Updated page {page_id}")
    return True


def fetch_html_template(lang: str) -> str:
    """Fetch HTML template from GitHub"""
    url = HTML_NO_URL if lang == "no" else HTML_EN_URL
    print(f"🌐 Fetching {lang.upper()} HTML template from GitHub...")

    response = requests.get(url, timeout=10)
    response.raise_for_status()

    html = response.text
    print(f"✅ Fetched {lang.upper()} template ({len(html)} chars)")
    return html


def normalize_content(content: str) -> str:
    """Normalize HTML content for comparison (remove extra whitespace, etc.)"""
    # Remove extra whitespace and newlines
    normalized = " ".join(content.split())
    return normalized


def needs_update(current_content: str, new_content: str) -> bool:
    """Check if page needs update by comparing normalized content"""
    current_norm = normalize_content(current_content)
    new_norm = normalize_content(new_content)

    # If they're identical, no update needed
    if current_norm == new_norm:
        return False

    # If the lengths differ significantly, update needed
    len_diff = abs(len(current_norm) - len(new_norm))
    if len_diff > 100:  # More than 100 chars difference
        return True

    # Check if content is substantially different
    # (simple check: if more than 5% different)
    max_len = max(len(current_norm), len(new_norm))
    similarity_threshold = 0.95

    # Count matching characters (simplified)
    matches = sum(1 for a, b in zip(current_norm, new_norm) if a == b)
    similarity = matches / max_len if max_len > 0 else 1.0

    return similarity < similarity_threshold


def main():
    """Main execution"""
    print("=" * 60)
    print("🎄 Julemenyen WordPress Auto-Updater")
    print("=" * 60)

    # Check for Application Password
    if not WP_APP_PASSWORD:
        print("❌ ERROR: WP_APP_PASSWORD environment variable not set")
        print("   Set it with: export WP_APP_PASSWORD='your-app-password'")
        sys.exit(1)

    try:
        # Fetch CSV data
        csv_rows = fetch_csv()

        # Process Norwegian page
        print("\n" + "=" * 60)
        print("🇳🇴 Processing Norwegian page...")
        print("=" * 60)

        html_no = fetch_html_template("no")
        current_no = get_wordpress_page_content(PAGE_ID_NO)

        if needs_update(current_no, html_no):
            print("🔄 Norwegian page needs update")
            update_wordpress_page(PAGE_ID_NO, html_no)
        else:
            print("✅ Norwegian page is already up to date")

        # Process English page
        print("\n" + "=" * 60)
        print("🇬🇧 Processing English page...")
        print("=" * 60)

        html_en = fetch_html_template("en")
        current_en = get_wordpress_page_content(PAGE_ID_EN)

        if needs_update(current_en, html_en):
            print("🔄 English page needs update")
            update_wordpress_page(PAGE_ID_EN, html_en)
        else:
            print("✅ English page is already up to date")

        print("\n" + "=" * 60)
        print("✅ Update process completed successfully")
        print("=" * 60)

    except requests.exceptions.RequestException as e:
        print(f"\n❌ ERROR: Network request failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
