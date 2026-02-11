"""
Test: Single-Model Identity Lock Pipeline
Uses gemini-3-pro-image-preview for one-shot headshot conversion.
"""
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from services.vision_engine import generate_professional_headshot, analyze_image
import requests

# Download a test image
TEST_URL = "https://randomuser.me/api/portraits/men/32.jpg"
print("Downloading sample image…")
img_resp = requests.get(TEST_URL)
img_bytes = img_resp.content
print(f"Downloaded {len(img_bytes)} bytes\n")

# ── Test 1: One-Shot Headshot (the main pipeline) ────────────────────────────
print("═" * 60)
print("TEST 1: One-Shot Professional Headshot (Identity Lock)")
print("═" * 60)

result = generate_professional_headshot(img_bytes)

if "error" in result:
    print(f"❌ FAILED: {result['error']}")
else:
    print(f"✅ SUCCESS")
    print(f"   Image size : {len(result['image_bytes']):,} bytes")
    print(f"   MIME type  : {result['mime_type']}")
    # Save locally for visual inspection
    out_path = "test_headshot_output.jpg"
    with open(out_path, "wb") as f:
        f.write(result["image_bytes"])
    print(f"   Saved to   : {out_path}")

# ── Test 2: Legacy Scan (should still work) ──────────────────────────────────
print(f"\n{'═' * 60}")
print("TEST 2: Legacy Scan (Gemini 2.0 Flash)")
print("═" * 60)

scan = analyze_image(img_bytes)
print(f"Keys: {list(scan.keys())}")
print(f"Suitability Score: {scan.get('suitability_score', 'N/A')}")
