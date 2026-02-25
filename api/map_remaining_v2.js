/**
 * map_remaining_v2.js — Map agencies with aggressive HTML stripping
 *
 * The default map_agency.js keeps too much page content, which triggers
 * Gemini's PROHIBITED_CONTENT filter on model agency sites.
 * This version extracts ONLY form elements (inputs, labels, selects, buttons)
 * and sends that minimal structure to Gemini.
 *
 * Usage: node map_remaining_v2.js
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const puppeteer = require("puppeteer-core");
const cheerio = require("cheerio");
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");

// ─── Config ──────────────────────────────────────────────────────────────────

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const TARGET_FIELDS = [
    "firstName", "lastName", "email", "phone", "age", "dateOfBirth",
    "gender", "height", "bust", "waist", "hips", "shoeSize",
    "eyeColor", "hairColor", "instagramHandle", "aboutMe",
    "howDidYouHear", "photoUpload", "termsCheckbox", "submitButton",
];

const AGENCIES = [
    { id: "10cd3534-3a4a-4cc0-9af4-ee4c0c6313f1", name: "Forte Model Management", url: "https://www.fortemodelmanagement.com/apply" },
    { id: "abdd0015-c5be-4f0d-b7c9-5bce8c9026ed", name: "PRM Agency", url: "https://www.prm-agency.com/become-a-model" },
    { id: "083edd2e-a785-48b6-81df-71677dc69001", name: "Ulla Models", url: "https://www.ullamodels.com/apply" },
];

// ─── Form-Only HTML Extraction ───────────────────────────────────────────────

async function fetchFormOnlyHTML(url) {
    if (!BROWSERLESS_TOKEN) throw new Error("Missing BROWSERLESS_TOKEN");

    const wsEndpoint =
        `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}` +
        `&timeout=120000&stealth&blockAds`;

    console.log("  🔗 Connecting to Browserless...");
    const browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        defaultViewport: { width: 1920, height: 1080 },
    });

    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(60_000);
        page.setDefaultNavigationTimeout(60_000);
        await page.setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        );

        console.log(`  🌐 Navigating to ${url}...`);
        await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });

        // Extract ONLY form-relevant elements via page.evaluate
        const formHTML = await page.evaluate(() => {
            const formElements = [];

            // Extract all forms
            document.querySelectorAll("form").forEach(form => {
                const clone = form.cloneNode(true);
                // Remove all script, style, svg, img etc from cloned form
                clone.querySelectorAll("script, style, svg, img, video, iframe, noscript, picture, canvas").forEach(el => el.remove());
                formElements.push(clone.outerHTML);
            });

            // If no forms found, look for all input/select/textarea elements
            if (formElements.length === 0) {
                const inputs = [];
                document.querySelectorAll("input, select, textarea, button[type='submit'], label").forEach(el => {
                    // Get the element and its immediate parent for context
                    const parent = el.closest("div, fieldset, section") || el.parentElement;
                    if (parent && !inputs.includes(parent.outerHTML)) {
                        const clone = parent.cloneNode(true);
                        clone.querySelectorAll("script, style, svg, img, video, iframe").forEach(n => n.remove());
                        inputs.push(clone.outerHTML);
                    }
                });
                return inputs.join("\n");
            }

            return formElements.join("\n");
        });

        console.log(`  📄 Form-only HTML: ${(formHTML.length / 1024).toFixed(1)} KB`);
        return formHTML;
    } finally {
        try { await browser.close(); } catch (_) { }
    }
}

// ─── Gemini Analysis ─────────────────────────────────────────────────────────

async function analyzeWithGemini(html) {
    if (!GOOGLE_API_KEY) throw new Error("Missing GOOGLE_API_KEY");

    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
        },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    });

    const fieldList = TARGET_FIELDS.map(f => `  "${f}": "<CSS selector>" or null`).join(",\n");

    const prompt = `You are a web automation engineer. Analyze this HTML form structure and identify CSS selectors for each field.

Return a JSON object with these keys:
{
${fieldList}
}

Selector priority: #id > [name="..."] > [placeholder="..."] > .class > structural.
Set to null if the field doesn't exist.
For photoUpload: input[type="file"]. For submitButton: button[type="submit"] or similar.
For termsCheckbox: checkbox near "terms"/"agree"/"consent" text.

Form HTML:
${html.slice(0, 40000)}`;

    console.log("  🧠 Sending to Gemini...");
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const map = JSON.parse(text);
    console.log(`  ✅ Gemini returned ${Object.keys(map).length} fields`);
    return map;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  MAP REMAINING v2 — Form-Only Extraction        ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < AGENCIES.length; i++) {
        const { id, name, url } = AGENCIES[i];
        const progress = `[${i + 1}/${AGENCIES.length}]`;

        console.log(`\n${"─".repeat(60)}`);
        console.log(`${progress} 🏢 ${name}`);
        console.log(`    URL: ${url}`);
        console.log(`${"─".repeat(60)}`);

        try {
            const html = await fetchFormOnlyHTML(url);

            if (!html || html.length < 50) {
                throw new Error("No form elements found on page");
            }

            const selectors = await analyzeWithGemini(html);

            const mapResult = {
                url,
                timestamp: new Date().toISOString(),
                selectors,
            };

            // Log fields
            const found = Object.values(selectors).filter(v => v !== null).length;
            console.log(`  📊 ${found}/${Object.keys(selectors).length} fields found`);
            for (const [field, selector] of Object.entries(selectors)) {
                console.log(`    ${selector ? "✅" : "⬜"} ${field}: ${selector || "(not found)"}`);
            }

            // Save to Supabase
            const { error } = await supabase
                .from("agencies")
                .update({ selector_map: mapResult })
                .eq("id", id);

            if (error) throw new Error(`Supabase: ${error.message}`);

            results.success++;
            console.log(`  💾 Saved to Supabase`);
        } catch (err) {
            results.failed++;
            results.errors.push({ name, error: err.message });
            console.error(`  ❌ Failed: ${err.message}`);
        }

        // Brief pause
        if (i < AGENCIES.length - 1) {
            console.log("  ⏳ Waiting 3s...");
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ✅ Success: ${results.success}`);
    console.log(`  ❌ Failed:  ${results.failed}`);
    if (results.errors.length > 0) {
        results.errors.forEach(e => console.log(`    • ${e.name}: ${e.error}`));
    }
    console.log(`${"═".repeat(60)}`);
}

main().catch(err => {
    console.error("💥 Fatal:", err.message);
    process.exit(1);
});
