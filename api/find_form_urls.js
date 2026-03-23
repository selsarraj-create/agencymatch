/**
 * find_form_urls.js
 *
 * For each zero-field agency, visits the site via Browserless,
 * looks for apply/join/become-a-model links, tries common paths,
 * and checks if any page has a real <form> element.
 * Updates application_url and clears selector_map for re-mapping.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const puppeteer = require("puppeteer-core");

const sb = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const BROWSERLESS = process.env.BROWSERLESS_TOKEN;
const APPLY_KEYWORDS = /apply|join|become|scout|register|sign-?up|get-?scouted|be-?discovered|application|recruit/i;
const COMMON_PATHS = ["/apply", "/join", "/become-a-model", "/join-us", "/register", "/get-scouted", "/be-discovered", "/be-scouted", "/application-form"];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function findFormPage(agencyUrl, websiteUrl) {
    let browser;
    try {
        browser = await puppeteer.connect({
            browserWSEndpoint: "wss://chrome.browserless.io?token=" + BROWSERLESS + "&timeout=90000",
        });
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36");

        // Step 1: Check current application_url for forms
        try {
            await page.goto(agencyUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
            await sleep(3000);
            const formCount = await page.evaluate(() => {
                const forms = document.querySelectorAll("form");
                const inputs = document.querySelectorAll("input[type='text'], input[type='email'], input[type='tel'], textarea, select");
                return { forms: forms.length, inputs: inputs.length };
            });
            if (formCount.forms > 0 && formCount.inputs >= 2) {
                return { url: agencyUrl, status: "FORM_FOUND_AT_CURRENT", forms: formCount.forms, inputs: formCount.inputs };
            }
        } catch (e) {
            // Current URL failed — try website root
        }

        // Step 2: Go to website root and find apply links
        const rootUrl = websiteUrl || new URL(agencyUrl).origin;
        let applyLinks = [];
        try {
            await page.goto(rootUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
            await sleep(2000);
            applyLinks = await page.evaluate((kwRegex) => {
                const links = Array.from(document.querySelectorAll("a[href]"));
                return links
                    .map(l => ({ href: l.href, text: l.textContent.trim().toLowerCase() }))
                    .filter(l => {
                        const kw = new RegExp(kwRegex);
                        return kw.test(l.href) || kw.test(l.text);
                    })
                    .map(l => l.href)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .slice(0, 5);
            }, APPLY_KEYWORDS.source);
        } catch (e) {
            // Root failed
        }

        // Step 3: Also try common paths
        const origin = new URL(agencyUrl).origin;
        for (const path of COMMON_PATHS) {
            const candidate = origin + path;
            if (!applyLinks.includes(candidate)) {
                applyLinks.push(candidate);
            }
        }

        // Step 4: Check each candidate for forms
        for (const link of applyLinks) {
            if (link === agencyUrl) continue; // already checked
            try {
                await page.goto(link, { waitUntil: "domcontentloaded", timeout: 20000 });
                await sleep(2000);
                const formCount = await page.evaluate(() => {
                    const forms = document.querySelectorAll("form");
                    const inputs = document.querySelectorAll("input[type='text'], input[type='email'], input[type='tel'], textarea, select, input[type='file']");
                    return { forms: forms.length, inputs: inputs.length };
                });
                if (formCount.forms > 0 && formCount.inputs >= 2) {
                    return { url: link, status: "FORM_FOUND_AT_NEW_URL", forms: formCount.forms, inputs: formCount.inputs };
                }
            } catch (e) {
                continue;
            }
        }

        // Step 5: Check for iframes at current URL
        try {
            await page.goto(agencyUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
            await sleep(3000);
            const hasIframe = await page.evaluate(() => {
                const iframes = document.querySelectorAll("iframe");
                return iframes.length;
            });
            if (hasIframe > 0) {
                return { url: agencyUrl, status: "HAS_IFRAME", forms: 0, inputs: 0 };
            }
        } catch (e) {
            // ignore
        }

        return { url: agencyUrl, status: "NO_FORM_FOUND", forms: 0, inputs: 0 };
    } catch (e) {
        return { url: agencyUrl, status: "ERROR: " + e.message, forms: 0, inputs: 0 };
    } finally {
        try { if (browser) await browser.close(); } catch (_) {}
    }
}

(async () => {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  FORM FINDER — Locating real apply pages       ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    // Get zero-field agencies
    const { data: all } = await sb.from("agencies")
        .select("id, name, application_url, website_url, selector_map")
        .eq("status", "active")
        .not("selector_map", "is", null)
        .order("name");

    const zeroField = all.filter(a => {
        const s = a.selector_map.selectors || a.selector_map;
        return Object.entries(s).filter(([k, v]) => v !== null).length === 0;
    });

    console.log("Zero-field agencies to check: " + zeroField.length + "\n");

    const results = { formFound: 0, newUrl: 0, iframe: 0, noForm: 0, error: 0 };
    const updates = [];

    for (let i = 0; i < zeroField.length; i++) {
        const a = zeroField[i];
        const pct = "[" + (i + 1) + "/" + zeroField.length + "]";
        process.stdout.write(pct + " " + a.name.padEnd(40));

        const result = await findFormPage(a.application_url, a.website_url);

        if (result.status === "FORM_FOUND_AT_CURRENT") {
            console.log("✅ FORM at current URL (" + result.inputs + " inputs)");
            results.formFound++;
            // Clear selector_map so it gets re-mapped
            updates.push({ id: a.id, url: result.url, clear: true });
        } else if (result.status === "FORM_FOUND_AT_NEW_URL") {
            console.log("🔄 FORM at NEW URL: " + result.url + " (" + result.inputs + " inputs)");
            results.newUrl++;
            updates.push({ id: a.id, url: result.url, clear: true });
        } else if (result.status === "HAS_IFRAME") {
            console.log("📦 Has iframe (embedded form likely)");
            results.iframe++;
            updates.push({ id: a.id, url: result.url, clear: true });
        } else if (result.status.startsWith("ERROR")) {
            console.log("❌ " + result.status);
            results.error++;
        } else {
            console.log("⬜ No form found");
            results.noForm++;
        }

        await sleep(1500);
    }

    // Apply updates
    if (updates.length > 0) {
        console.log("\n📝 Applying " + updates.length + " updates...");
        for (const u of updates) {
            const updateData = { selector_map: null };
            if (u.url) updateData.application_url = u.url;
            const { error } = await sb.from("agencies").update(updateData).eq("id", u.id);
            if (error) console.log("  ❌ " + error.message);
        }
        console.log("  ✅ Done — " + updates.length + " agencies ready for re-mapping");
    }

    console.log("\n═══════════════════════════════════════════════════");
    console.log("📊 FORM FINDER RESULTS");
    console.log("═══════════════════════════════════════════════════");
    console.log("  ✅ Form at current URL: " + results.formFound);
    console.log("  🔄 Form at NEW URL:     " + results.newUrl);
    console.log("  📦 Has iframe:          " + results.iframe);
    console.log("  ⬜ No form anywhere:    " + results.noForm);
    console.log("  ❌ Errors:              " + results.error);
    console.log("  📦 Total checked:       " + zeroField.length);
    console.log("═══════════════════════════════════════════════════\n");

    process.exit(0);
})();
