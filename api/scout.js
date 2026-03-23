/**
 * scout.js — Agency Submission Bot
 *
 * Production-ready module for automated agency form submissions.
 * Stack: Browserless SaaS + Smartproxy Residential + 2Captcha
 *
 * Usage:
 *   const { submitApplication } = require('./scout');
 *   const result = await submitApplication(agencyUrl, userData);
 */

require("dotenv").config();
const puppeteer = require("puppeteer-core");
const fetch = require("node-fetch");
const sharp = require("sharp");

// ─── Config ──────────────────────────────────────────────────────────────────

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const PROXY_USER = process.env.PROXY_USER;
const PROXY_PASS = process.env.PROXY_PASS;
const PROXY_SERVER = process.env.PROXY_SERVER; // e.g. http://proxy.smartproxy.net:3120
const CAPTCHA_KEY = process.env["2CAPTCHA_KEY"];

const NAVIGATION_TIMEOUT = 60_000;
const CAPTCHA_POLL_INTERVAL = 5_000;
const CAPTCHA_MAX_WAIT = 120_000;

const MAX_UPLOAD_KB = 300;        // Target max file size for uploads
const MAX_IMAGE_DIMENSION = 1200; // Max px on longest side

// ─── Connection ──────────────────────────────────────────────────────────────

/**
 * Connect to Browserless with Smartproxy injected via launch args.
 * Stealth mode enabled for anti-bot bypass.
 */
async function connectBrowser() {
    if (!BROWSERLESS_TOKEN) throw new Error("Missing BROWSERLESS_TOKEN");

    // Browserless WebSocket URL:
    //   - timeout=900000: 15-minute session (upgraded plan)
    //   - stealth: anti-detection patches
    //   - blockAds: reduce noise
    const wsEndpoint =
        `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}` +
        `&timeout=900000` +
        `&stealth` +
        `&blockAds`;

    console.log("🔗 Connecting to Browserless (stealth, 15min timeout)...");

    const browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        defaultViewport: { width: 1920, height: 1080 },
    });

    console.log("✅ Browser connected");
    return browser;
}

/**
 * Configure page: proxy auth, stealth headers, and extended timeouts.
 */
async function configurePage(page) {
    // Proxy authentication (Smartproxy)
    if (PROXY_USER && PROXY_PASS) {
        await page.authenticate({
            username: PROXY_USER,
            password: PROXY_PASS,
        });
        console.log("🔑 Proxy auth configured via page.authenticate()");
    }

    // Set realistic user agent + language
    await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-GB,en;q=0.9" });

    // Match page-level timeouts to Browserless session (15 min)
    page.setDefaultTimeout(900_000);
    page.setDefaultNavigationTimeout(900_000);

    return page;
}

// ─── Request Interception ────────────────────────────────────────────────────

/**
 * Block images, fonts, and media to save Smartproxy bandwidth.
 */
async function enableInterception(page) {
    await page.setRequestInterception(true);

    const BLOCKED_TYPES = new Set(["image", "font", "media", "stylesheet"]);
    const BLOCKED_DOMAINS = [
        "google-analytics.com",
        "facebook.net",
        "doubleclick.net",
        "hotjar.com",
    ];

    page.on("request", (req) => {
        const type = req.resourceType();
        const url = req.url();

        if (BLOCKED_TYPES.has(type)) {
            req.abort();
        } else if (BLOCKED_DOMAINS.some((d) => url.includes(d))) {
            req.abort();
        } else {
            req.continue();
        }
    });

    console.log("🛡️  Request interception enabled (blocking images/fonts/media)");
}

// ─── Human-Like Typing ──────────────────────────────────────────────────────

/**
 * Types text with random latency between keystrokes (20–60ms).
 * Use only when stealth is critical and you have time budget.
 */
async function humanType(page, selector, text) {
    await page.waitForSelector(selector, { visible: true, timeout: 10_000 });
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press("Backspace");
    for (const char of text) {
        const delay = Math.floor(Math.random() * 40) + 20;
        await page.type(selector, char, { delay });
    }
}

/**
 * Fast Human typing — real keydown/keyup events at ~120 WPM.
 * 10–50ms per key fires all React/Angular event listeners.
 * Triggers blur after typing to force validation.
 */
async function fastHumanType(page, selector, text) {
    await page.waitForSelector(selector, { visible: true, timeout: 10_000 });
    await page.click(selector);

    // Type fast (10ms-50ms delay) — fires real keyboard signals
    await page.type(selector, text, {
        delay: Math.floor(Math.random() * 40) + 10,
    });

    // Force blur to trigger form validation
    await page.evaluate((sel) => {
        document.querySelector(sel)?.blur();
    }, selector);
}

/**
 * Human-like click with slight random offset.
 */
async function humanClick(page, selector) {
    await page.waitForSelector(selector, { visible: true, timeout: 10_000 });
    const el = await page.$(selector);
    const box = await el.boundingBox();

    if (box) {
        const x = box.x + box.width / 2 + (Math.random() * 6 - 3);
        const y = box.y + box.height / 2 + (Math.random() * 6 - 3);
        await page.mouse.move(x, y, { steps: 5 });
        await sleep(100 + Math.random() * 200);
        await page.mouse.click(x, y);
    } else {
        await page.click(selector);
    }
}

// ─── 2Captcha Solver ─────────────────────────────────────────────────────────

/**
 * Solves reCAPTCHA v2 using 2Captcha API.
 *
 * Flow:
 *   1. Extract data-sitekey from the page
 *   2. Submit to 2Captcha /in.php
 *   3. Poll /res.php until token is ready
 *   4. Inject token into the page's g-recaptcha-response textarea
 */
async function solveCaptcha(page) {
    if (!CAPTCHA_KEY) throw new Error("Missing 2CAPTCHA_KEY");

    console.log("🧩 CAPTCHA detected — solving via 2Captcha...");

    // Step 1: Extract sitekey
    const sitekey = await page.evaluate(() => {
        const el =
            document.querySelector(".g-recaptcha") ||
            document.querySelector("[data-sitekey]") ||
            document.querySelector('iframe[src*="recaptcha"]');

        if (!el) return null;

        // Direct data-sitekey attribute
        if (el.getAttribute("data-sitekey")) return el.getAttribute("data-sitekey");

        // Extract from iframe src
        const src = el.getAttribute("src") || "";
        const match = src.match(/[?&]k=([A-Za-z0-9_-]+)/);
        return match ? match[1] : null;
    });

    if (!sitekey) {
        console.log("⚠️  No reCAPTCHA sitekey found — may be hCaptcha or custom");
        return false;
    }

    const pageUrl = page.url();
    console.log(`  Sitekey: ${sitekey}`);
    console.log(`  Page: ${pageUrl}`);

    // Step 2: Submit to 2Captcha
    const submitUrl =
        `http://2captcha.com/in.php?key=${CAPTCHA_KEY}` +
        `&method=userrecaptcha` +
        `&googlekey=${sitekey}` +
        `&pageurl=${encodeURIComponent(pageUrl)}` +
        `&json=1`;

    const submitRes = await fetch(submitUrl);
    const submitData = await submitRes.json();

    if (submitData.status !== 1) {
        throw new Error(`2Captcha submit failed: ${submitData.request}`);
    }

    const captchaId = submitData.request;
    console.log(`  Task ID: ${captchaId}`);

    // Step 3: Poll for result
    const startTime = Date.now();

    while (Date.now() - startTime < CAPTCHA_MAX_WAIT) {
        await sleep(CAPTCHA_POLL_INTERVAL);

        const pollUrl =
            `http://2captcha.com/res.php?key=${CAPTCHA_KEY}` +
            `&action=get&id=${captchaId}&json=1`;

        const pollRes = await fetch(pollUrl);
        const pollData = await pollRes.json();

        if (pollData.status === 1) {
            const token = pollData.request;
            console.log(`  ✅ CAPTCHA solved (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);

            // Step 4: Inject token
            await page.evaluate((t) => {
                // Standard reCAPTCHA v2
                const textarea = document.getElementById("g-recaptcha-response");
                if (textarea) {
                    textarea.style.display = "block";
                    textarea.value = t;
                }
                // Also try all textareas with that name (multiple forms)
                document.querySelectorAll('[name="g-recaptcha-response"]').forEach((el) => {
                    el.value = t;
                });
                // Trigger callback if defined
                if (typeof window.___grecaptcha_cfg !== "undefined") {
                    try {
                        const clients = window.___grecaptcha_cfg.clients;
                        for (const c in clients) {
                            const cb = clients[c]?.rr?.l?.callback || clients[c]?.ss?.l?.callback;
                            if (typeof cb === "function") cb(t);
                        }
                    } catch (e) { }
                }
            }, token);

            return true;
        }

        if (pollData.request === "ERROR_CAPTCHA_UNSOLVABLE") {
            throw new Error("2Captcha: CAPTCHA is unsolvable");
        }

        console.log(`  ⏳ Waiting for solution... (${((Date.now() - startTime) / 1000).toFixed(0)}s)`);
    }

    throw new Error(`2Captcha: Timed out after ${CAPTCHA_MAX_WAIT / 1000}s`);
}

/**
 * Detect if the page has a CAPTCHA.
 */
async function hasCaptcha(page) {
    return page.evaluate(() => {
        return !!(
            document.querySelector(".g-recaptcha") ||
            document.querySelector("[data-sitekey]") ||
            document.querySelector('iframe[src*="recaptcha"]') ||
            document.querySelector('iframe[src*="hcaptcha"]') ||
            document.querySelector(".h-captcha")
        );
    });
}

// ─── Image Compression ───────────────────────────────────────────────────────

/**
 * Compress an image buffer to ≤ MAX_UPLOAD_KB using sharp.
 *
 * Strategy:
 *   1. Resize to max 1200px on longest side (preserves aspect ratio)
 *   2. Convert to JPEG at quality 70
 *   3. If still over budget, iteratively drop quality in steps of 10
 *
 * @param {Buffer} inputBuffer - Raw image bytes
 * @returns {Buffer} Compressed JPEG buffer
 */
async function compressImage(inputBuffer) {
    const originalKB = (inputBuffer.length / 1024).toFixed(1);
    console.log(`  🗜️  Compressing image (original: ${originalKB} KB)...`);

    let quality = 70;
    let compressed = await sharp(inputBuffer)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
            fit: "inside",           // Preserve aspect ratio
            withoutEnlargement: true // Don't upscale small images
        })
        .jpeg({ quality, mozjpeg: true }) // mozjpeg for better compression
        .toBuffer();

    // Iteratively reduce quality if still over budget
    while (compressed.length > MAX_UPLOAD_KB * 1024 && quality > 20) {
        quality -= 10;
        compressed = await sharp(inputBuffer)
            .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
                fit: "inside",
                withoutEnlargement: true
            })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
    }

    const finalKB = (compressed.length / 1024).toFixed(1);
    const savings = (100 - (compressed.length / inputBuffer.length) * 100).toFixed(0);
    console.log(`  ✅ Compressed: ${originalKB} KB → ${finalKB} KB (−${savings}%, quality=${quality})`);

    return compressed;
}

// ─── File Upload ─────────────────────────────────────────────────────────────

/**
 * Download an image, compress it, and upload to a file input.
 */
async function uploadPhoto(page, selector, photoUrl) {
    if (!photoUrl) {
        console.log("⚠️  No photo URL provided — skipping upload");
        return;
    }

    const fs = require("fs");
    const path = require("path");
    const os = require("os");

    try {
        console.log(`📷 Downloading photo for upload...`);
        const res = await fetch(photoUrl);
        const rawBuffer = await res.buffer();

        // Compress before uploading
        const compressed = await compressImage(rawBuffer);

        const tmpPath = path.join(os.tmpdir(), `scout_photo_${Date.now()}.jpg`);
        fs.writeFileSync(tmpPath, compressed);

        const [fileInput] = await page.$$(selector);
        if (fileInput) {
            await fileInput.uploadFile(tmpPath);
            console.log(`  ✅ Photo uploaded via ${selector}`);
        } else {
            // Fallback: any file input
            const fallback = await page.$('input[type="file"]');
            if (fallback) {
                await fallback.uploadFile(tmpPath);
                console.log(`  ✅ Photo uploaded via fallback input[type="file"]`);
            } else {
                console.log(`  ⚠️  No file input found`);
            }
        }

        // Cleanup
        try { fs.unlinkSync(tmpPath); } catch (_) { }
    } catch (err) {
        console.error(`  ❌ Photo upload failed: ${err.message}`);
    }
}

// ─── Form Analyzer (Gemini) ──────────────────────────────────────────────────

/**
 * Extract the form HTML, send to Gemini for field mapping, return action plan.
 */
async function analyzeForm(page, userData) {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) throw new Error("Missing GOOGLE_API_KEY");

    // Extract sanitized form HTML
    const formHtml = await page.evaluate(() => {
        const forms = document.querySelectorAll("form");
        if (forms.length === 0) {
            // Fallback: grab all inputs
            const inputs = document.querySelectorAll("input, select, textarea, button");
            const div = document.createElement("div");
            inputs.forEach((el) => div.appendChild(el.cloneNode(true)));
            return div.innerHTML;
        }
        // Largest form
        let largest = forms[0];
        for (const f of forms) {
            if (f.innerHTML.length > largest.innerHTML.length) largest = f;
        }
        // Strip scripts/styles
        const clone = largest.cloneNode(true);
        clone.querySelectorAll("script, style, noscript, link").forEach((s) => s.remove());
        return clone.outerHTML;
    });

    if (!formHtml || formHtml.length < 50) {
        throw new Error("No form found on page");
    }

    // Build user data summary
    const summary = Object.entries(userData)
        .filter(([_, v]) => v && v !== "" && (typeof v !== "object" || Object.keys(v).length > 0))
        .map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join("\n");

    const prompt = `ROLE: You are a web automation engineer. Analyze this HTML form and produce a JSON action plan to fill it.

FORM HTML:
\`\`\`html
${formHtml.slice(0, 25000)}
\`\`\`

USER DATA:
${summary}

RULES:
1. Use the most specific CSS selector (#id > [name] > class).
2. For date fields, match the format the form expects.
3. For dropdowns, pick the closest option value/label.
4. For checkboxes (terms/consent), include "check" action.
5. For file inputs, use "upload" action with files: ["headshot"].
6. For "about" textareas, write a brief professional intro.
7. Last action = submit button click.
8. Skip fields with no matching data.
9. For "how did you hear" fields, use "Online Search".

OUTPUT: JSON array only. No markdown. Example:
[
  {"action":"fill","selector":"#name","value":"Jane Doe"},
  {"action":"select","selector":"#gender","value":"female"},
  {"action":"upload","selector":"input[type='file']","files":["headshot"]},
  {"action":"check","selector":"#terms"},
  {"action":"click","selector":"button[type='submit']"}
]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;

    console.log("🧠 Sending form to Gemini for analysis...");

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
            },
        }),
    });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty Gemini response");

    const actions = JSON.parse(text);
    console.log(`  📋 Gemini returned ${actions.length} actions`);
    return actions;
}

// ─── Map-to-Actions Converter ────────────────────────────────────────────────

/**
 * Convert a cached selector map (from map_agency.js) + user data into
 * the action array format expected by executeActions().
 *
 * This replaces the per-submit Gemini call with a deterministic, instant conversion.
 *
 * @param {object} selectorMap - { firstName: "#id", email: "#email", ... }
 * @param {object} userData    - User profile data
 * @returns {Array} Action array: [{action, selector, value}, ...]
 */
function mapToActions(selectorMap, userData) {
    const actions = [];

    // ── Field → userData key mapping ──
    const fieldMapping = {
        firstName: () => userData.first_name || userData.name?.split(" ")[0] || "",
        lastName: () => userData.last_name || userData.name?.split(" ").slice(1).join(" ") || "",
        email: () => userData.email || "",
        phone: () => userData.phone || "",
        age: () => userData.age || "",
        dateOfBirth: () => userData.date_of_birth || userData.dob || "",
        height: () => userData.height || "",
        bust: () => userData.bust || "",
        waist: () => userData.waist || "",
        hips: () => userData.hips || "",
        shoeSize: () => userData.shoe_size || userData.shoe || "",
        eyeColor: () => userData.eye_color || "",
        hairColor: () => userData.hair_color || "",
        instagramHandle: () => userData.instagram || "",
        aboutMe: () => userData.about || userData.bio || "",
        howDidYouHear: () => "Online Search",
    };

    // ── Gender (check/select) ──
    if (selectorMap.gender) {
        actions.push({
            action: "select",
            selector: selectorMap.gender,
            value: userData.gender || "F",
        });
    }

    // ── Fill fields ──
    for (const [field, getVal] of Object.entries(fieldMapping)) {
        const selector = selectorMap[field];
        if (!selector) continue;
        const value = String(getVal());
        if (!value) continue;

        actions.push({ action: "fill", selector, value });
    }

    // ── Terms checkbox ──
    if (selectorMap.termsCheckbox) {
        actions.push({ action: "check", selector: selectorMap.termsCheckbox });
    }

    // ── Photo upload ──
    if (selectorMap.photoUpload) {
        actions.push({
            action: "upload",
            selector: selectorMap.photoUpload,
            files: ["headshot"],
        });
    }

    // ── Submit button (always last) ──
    if (selectorMap.submitButton) {
        actions.push({ action: "click", selector: selectorMap.submitButton });
    }

    console.log(`  📋 Map → ${actions.length} actions (no Gemini call)`);
    return actions;
}

// ─── Execute Actions ─────────────────────────────────────────────────────────

/**
 * Execute the Gemini/map action plan on the page.
 *
 * Uses fastHumanType (real keyboard events, 10–50ms/key) for fill actions.
 * With the 15-min Browserless session, there's plenty of time for real keystrokes.
 */
async function executeActions(page, actions, userData, dryRun = false) {
    let completed = 0;
    const errors = [];
    const photos = userData.generated_photos || [];

    for (let i = 0; i < actions.length; i++) {
        const { action, selector, value } = actions[i];

        try {
            switch (action) {
                case "fill":
                    await fastHumanType(page, selector, String(value || ""));
                    completed++;
                    console.log(`  ✅ [${i + 1}] fill: ${selector} = "${(value || "").toString().slice(0, 40)}"`);
                    break;

                case "select":
                    await page.waitForSelector(selector, { visible: true, timeout: 10_000 });
                    try {
                        await page.select(selector, String(value || ""));
                    } catch (_) {
                        // Fallback: element is not a <select> (radio/checkbox)
                        console.log(`    ↳ Not a <select>, falling back to click...`);
                        await page.click(selector);
                    }
                    completed++;
                    console.log(`  ✅ [${i + 1}] select: ${selector} = "${value}"`);
                    break;

                case "check":
                    await page.waitForSelector(selector, { timeout: 10_000 });
                    const checked = await page.$eval(selector, (el) => el.checked);
                    if (!checked) await page.click(selector);
                    completed++;
                    console.log(`  ✅ [${i + 1}] check: ${selector}`);
                    break;

                case "upload":
                    if (photos.length > 0) {
                        await uploadPhoto(page, selector, photos[0]);
                        completed++;
                        console.log(`  ✅ [${i + 1}] upload: ${selector}`);
                    } else {
                        console.log(`  ⚠️  [${i + 1}] upload: skipped (no photos)`);
                    }
                    break;

                case "click":
                    if (dryRun) {
                        console.log(`  🔸 [${i + 1}] DRY RUN — skip click: ${selector}`);
                    } else {
                        await humanClick(page, selector);
                        completed++;
                        console.log(`  ✅ [${i + 1}] click: ${selector}`);
                    }
                    break;

                default:
                    errors.push(`Unknown action: ${action}`);
            }

            // Brief human-like pause between actions
            await sleep(200 + Math.random() * 300);
        } catch (err) {
            const msg = `Action ${i + 1} (${action} on ${selector}): ${err.message}`;
            errors.push(msg);
            console.log(`  ⚠️  ${msg}`);
        }
    }

    return { completed, total: actions.length, errors };
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Submit an application to an agency.
 *
 * @param {string}  agencyUrl  - URL of the agency application form
 * @param {object}  userData   - User profile data (name, email, measurements, photos, etc.)
 * @param {object}  options    - { dryRun: bool, screenshotPath: string, selectorMap: object }
 * @returns {object} { status, actionsCompleted, actionsTotal, errors, screenshotBuffer }
 */
async function submitApplication(agencyUrl, userData, options = {}) {
    const { dryRun = false, screenshotPath = null, selectorMap = null } = options;
    let browser = null;

    try {
        // 1. Connect
        browser = await connectBrowser();
        const page = await browser.newPage();

        // 2. Configure page (proxy auth, stealth, 15-min timeouts)
        await configurePage(page);

        // 3. Bandwidth optimization
        await enableInterception(page);

        // 4. Navigate
        console.log(`\n🌐 Navigating to ${agencyUrl}`);
        await page.goto(agencyUrl, {
            waitUntil: "domcontentloaded",
            timeout: NAVIGATION_TIMEOUT,
        });
        await sleep(2000); // Let JS render

        // 5. Check for CAPTCHA before form fill
        const captchaDetected = await hasCaptcha(page);
        if (captchaDetected) {
            try {
                await solveCaptcha(page);
            } catch (err) {
                console.error(`❌ CAPTCHA solve failed: ${err.message}`);
                const ss = await page.screenshot({ fullPage: true });
                return {
                    status: "captcha_failed",
                    actionsCompleted: 0,
                    actionsTotal: 0,
                    errors: [`CAPTCHA solve failed: ${err.message}`],
                    screenshotBuffer: ss,
                };
            }
        }

        // 6. Build actions — use cached map if available, else fall back to Gemini
        let actions;
        if (selectorMap) {
            console.log("📋 Using cached selector map (no Gemini call)");
            actions = mapToActions(selectorMap, userData);
        } else {
            console.log("🧠 No cached map — falling back to Gemini analysis");
            actions = await analyzeForm(page, userData);
        }

        // 7. Execute actions
        console.log(`\n⚡ Executing ${actions.length} actions (dryRun=${dryRun})...`);
        const result = await executeActions(page, actions, userData, dryRun);

        // 8. Post-submit CAPTCHA check (some forms show CAPTCHA after filling)
        if (!dryRun) {
            await sleep(2000);
            const postCaptcha = await hasCaptcha(page);
            if (postCaptcha) {
                console.log("🧩 Post-submit CAPTCHA detected...");
                try {
                    await solveCaptcha(page);
                    // Re-click submit
                    const submitAction = actions.find((a) => a.action === "click");
                    if (submitAction) {
                        await humanClick(page, submitAction.selector);
                    }
                } catch (err) {
                    result.errors.push(`Post-submit CAPTCHA failed: ${err.message}`);
                }
            }
        }

        // 9. Proof screenshot
        const ss = await page.screenshot({ fullPage: true });
        if (screenshotPath) {
            require("fs").writeFileSync(screenshotPath, ss);
            console.log(`📷 Screenshot saved to ${screenshotPath}`);
        }

        const status =
            result.completed > 0 && result.errors.length < result.total / 2
                ? dryRun
                    ? "dry_run_complete"
                    : "applied"
                : "failed";

        console.log(`\n${"=".repeat(50)}`);
        console.log(`${status === "applied" ? "✅" : status === "dry_run_complete" ? "🔸" : "❌"} ${status.toUpperCase()}`);
        console.log(`   Actions: ${result.completed}/${result.total}`);
        if (result.errors.length) console.log(`   Errors: ${result.errors.length}`);
        console.log(`${"=".repeat(50)}\n`);

        return {
            status,
            actionsCompleted: result.completed,
            actionsTotal: result.total,
            errors: result.errors,
            screenshotBuffer: ss,
        };
    } catch (err) {
        console.error(`❌ Fatal error: ${err.message}`);
        return {
            status: "failed",
            actionsCompleted: 0,
            actionsTotal: 0,
            errors: [err.message],
            screenshotBuffer: null,
        };
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (_) { }
        }
    }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
    submitApplication,
    connectBrowser,
    configurePage,
    analyzeForm,
    mapToActions,
    executeActions,
    solveCaptcha,
    hasCaptcha,
    humanType,
    humanClick,
    uploadPhoto,
    compressImage,
    enableInterception,
};
