/**
 * map_agency.js — AI Form Mapper
 *
 * Visits an agency URL via Browserless, extracts and cleans the form HTML,
 * and uses Gemini 1.5 Flash to generate a reusable JSON selector map.
 *
 * Usage:
 *   const { generateMap } = require('./map_agency');
 *   const map = await generateMap('https://example-agency.com/apply');
 *
 * CLI:
 *   node map_agency.js https://example-agency.com/apply
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const puppeteer = require("puppeteer-core");
const cheerio = require("cheerio");
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// ─── Config ──────────────────────────────────────────────────────────────────

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const TAGS_TO_STRIP = [
    "script", "style", "svg", "path", "nav", "footer",
    "img", "noscript", "link", "meta", "iframe", "video",
    "audio", "canvas", "picture", "source", "head",
];

// Fields the mapper should look for
const TARGET_FIELDS = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "age",
    "dateOfBirth",
    "gender",
    "height",
    "bust",
    "waist",
    "hips",
    "shoeSize",
    "eyeColor",
    "hairColor",
    "instagramHandle",
    "aboutMe",
    "howDidYouHear",
    "photoUpload",
    "termsCheckbox",
    "submitButton",
];

// ─── Step 1: Fetch & Clean HTML ──────────────────────────────────────────────

/**
 * Navigate to the URL via Browserless, extract the body HTML,
 * and strip non-form elements to minimize Gemini token usage.
 *
 * @param {string} url - Agency application form URL
 * @returns {string} Cleaned HTML containing only form structure + labels
 */
async function fetchFormHTML(url) {
    if (!BROWSERLESS_TOKEN) throw new Error("Missing BROWSERLESS_TOKEN");

    const wsEndpoint =
        `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}` +
        `&timeout=120000` +
        `&stealth` +
        `&blockAds`;

    console.log("🔗 Connecting to Browserless...");
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

        console.log(`🌐 Navigating to ${url}...`);
        await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });

        // Extract raw body HTML
        const rawHTML = await page.evaluate(() => document.body.innerHTML);

        console.log(`📄 Raw HTML: ${(rawHTML.length / 1024).toFixed(1)} KB`);

        // Clean with Cheerio
        const $ = cheerio.load(rawHTML);

        // Strip noisy tags
        TAGS_TO_STRIP.forEach((tag) => $(tag).remove());

        // Strip inline event handlers and data-* attributes to reduce noise
        $("*").each((_, el) => {
            const $el = $(el);
            const attrs = el.attribs || {};
            for (const attr of Object.keys(attrs)) {
                if (attr.startsWith("on") || attr.startsWith("data-") && attr !== "data-sitekey") {
                    $el.removeAttr(attr);
                }
            }
        });

        // Strip empty divs/spans to reduce noise further
        $("div:empty, span:empty, p:empty").remove();

        // Remove comments
        $("*").contents().filter(function () {
            return this.type === "comment";
        }).remove();

        const cleanedHTML = $.html();
        const reduction = (100 - (cleanedHTML.length / rawHTML.length) * 100).toFixed(0);
        console.log(`🧹 Cleaned HTML: ${(cleanedHTML.length / 1024).toFixed(1)} KB (−${reduction}%)`);

        return cleanedHTML;
    } finally {
        try { await browser.close(); } catch (_) { }
    }
}

// ─── Step 2: Gemini Analysis ─────────────────────────────────────────────────

/**
 * Send cleaned HTML to Gemini 1.5 Flash and get a JSON selector map.
 *
 * @param {string} html - Cleaned form HTML
 * @returns {object} JSON selector map
 */
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

    const fieldList = TARGET_FIELDS.map((f) => `  "${f}": "<CSS selector>" or null`).join(",\n");

    const prompt = `ROLE: You are a web automation engineer analyzing an HTML form.

TASK: Given the HTML below, identify the CSS selector for each field. Return a JSON object with these exact keys:

{
${fieldList}
}

SELECTOR PRIORITY (use the most specific available):
1. #id (best)
2. [name="..."]
3. [placeholder="..."]
4. .class
5. Structural (e.g., form > div:nth-child(3) input)

RULES:
- If a field does NOT exist in the form, set it to null.
- For "photoUpload", look for input[type="file"].
- For "submitButton", look for button[type="submit"] or input[type="submit"] or the primary submit button.
- For "termsCheckbox", look for checkboxes near text about "terms", "agree", "consent", "privacy".
- For "gender", look for radio buttons or selects with male/female options.
- For "aboutMe", look for a large textarea (not single-line inputs).
- For "howDidYouHear", look for selects or inputs asking how the user found the agency.
- Return ONLY the JSON object. No markdown, no explanation.

HTML:
${html.slice(0, 50000)}`;

    console.log("🧠 Sending to Gemini 1.5 Flash...");
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const map = JSON.parse(text);
    console.log(`✅ Gemini returned a map with ${Object.keys(map).length} fields`);

    return map;
}

// ─── Step 3: Orchestrator ────────────────────────────────────────────────────

/**
 * Generate a reusable selector map for an agency form.
 *
 * @param {string} url - Agency application form URL
 * @returns {object} { url, timestamp, selectors: { firstName, lastName, ... } }
 */
async function generateMap(url) {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  MAP_AGENCY — AI Form Mapper                   ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    const html = await fetchFormHTML(url);
    const selectors = await analyzeWithGemini(html);

    // Count how many fields were found vs null
    const found = Object.values(selectors).filter((v) => v !== null).length;
    const total = Object.keys(selectors).length;

    console.log(`\n📊 Map complete: ${found}/${total} fields found`);

    // Log the map
    for (const [field, selector] of Object.entries(selectors)) {
        const icon = selector ? "✅" : "⬜";
        console.log(`  ${icon} ${field}: ${selector || "(not found)"}`);
    }

    return {
        url,
        timestamp: new Date().toISOString(),
        selectors,
    };
}

// ─── CLI Mode ────────────────────────────────────────────────────────────────

if (require.main === module) {
    const url = process.argv[2];
    if (!url) {
        console.error("Usage: node map_agency.js <url>");
        process.exit(1);
    }

    generateMap(url)
        .then((result) => {
            console.log("\n─── JSON Output ───");
            console.log(JSON.stringify(result, null, 2));
        })
        .catch((err) => {
            console.error("💥 Error:", err.message);
            process.exit(1);
        });
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
    generateMap,
    fetchFormHTML,
    analyzeWithGemini,
};
