/**
 * live_submit_test.js — Test REAL submissions to agency forms
 * 
 * Picks 3 well-mapped agencies from Supabase, fills their forms
 * with test data, submits for real, and saves proof screenshots.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const { submitApplication } = require("./scout");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Test user data — realistic but clearly a test
const TEST_USER = {
    first_name: "Sophie",
    last_name: "Anderson",
    name: "Sophie Anderson",
    email: "sophie.test.agencymatch@gmail.com",
    phone: "+447700900123",
    gender: "Female",
    date_of_birth: "1999-03-12",
    age: "25",
    height: "175",
    bust: "84",
    waist: "61",
    hips: "89",
    shoe_size: "6",
    eye_color: "Green",
    hair_color: "Blonde",
    instagram: "@sophie_test_2025",
    about: "Aspiring model with experience in commercial and editorial work. Based in London, available for castings nationwide.",
    bio: "Aspiring model with experience in commercial and editorial work. Based in London, available for castings nationwide.",
    generated_photos: [],
};

const SCREENSHOT_DIR = "/tmp/scout_live_test";

async function main() {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  LIVE SUBMISSION TEST — Real Agency Forms       ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    // Create screenshot dir
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    // 1. Pick 3 well-mapped agencies (8+ fields, has submitButton)
    const { data: agencies } = await supabase
        .from("agencies")
        .select("id, name, application_url, selector_map, category")
        .eq("status", "active")
        .not("selector_map", "is", null)
        .not("application_url", "is", null)
        .order("name");

    // Filter to submittable ones with 8+ fields
    const submittable = agencies.filter(a => {
        const s = a.selector_map?.selectors || a.selector_map;
        if (!s || !s.submitButton) return false;
        const fieldCount = Object.entries(s).filter(([k, v]) => v && k !== "submitButton" && k !== "termsCheckbox").length;
        return fieldCount >= 6;
    });

    // Pick 3 from different categories for variety
    const categories = [...new Set(submittable.map(a => a.category))];
    const picks = [];
    for (const cat of categories) {
        if (picks.length >= 3) break;
        const agency = submittable.find(a => a.category === cat && !picks.includes(a));
        if (agency) picks.push(agency);
    }

    // Fill remaining if less than 3
    for (const a of submittable) {
        if (picks.length >= 3) break;
        if (!picks.find(p => p.id === a.id)) picks.push(a);
    }

    console.log(`Selected ${picks.length} agencies:\n`);
    picks.forEach((a, i) => {
        const s = a.selector_map?.selectors || a.selector_map;
        const fields = Object.entries(s).filter(([k, v]) => v).length;
        console.log(`  ${i + 1}. ${a.name} (${a.category}) — ${fields} fields`);
        console.log(`     ${a.application_url}`);
    });
    console.log("");

    const results = [];

    for (let i = 0; i < picks.length; i++) {
        const agency = picks[i];
        const selectorMap = agency.selector_map?.selectors || agency.selector_map;
        const screenshotPath = path.join(SCREENSHOT_DIR, `proof_${agency.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`);

        console.log(`\n${"═".repeat(60)}`);
        console.log(`[${i + 1}/${picks.length}] ${agency.name}`);
        console.log(`${"═".repeat(60)}`);

        try {
            const result = await submitApplication(
                agency.application_url,
                TEST_USER,
                {
                    dryRun: false,  // REAL submission
                    screenshotPath,
                    selectorMap,
                }
            );

            results.push({
                agency: agency.name,
                category: agency.category,
                url: agency.application_url,
                status: result.status,
                actionsCompleted: result.actionsCompleted,
                actionsTotal: result.actionsTotal,
                errors: result.errors,
                screenshot: screenshotPath,
                hasScreenshot: fs.existsSync(screenshotPath),
            });

            console.log(`\n📸 Screenshot saved: ${screenshotPath}`);
        } catch (err) {
            console.error(`❌ Fatal error: ${err.message}`);
            results.push({
                agency: agency.name,
                status: "crashed",
                errors: [err.message],
            });
        }

        // Brief pause between agencies
        if (i < picks.length - 1) {
            console.log("\n⏳ Waiting 5s before next agency...");
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    // Summary
    console.log(`\n\n${"═".repeat(60)}`);
    console.log("📊 LIVE TEST RESULTS");
    console.log(`${"═".repeat(60)}\n`);

    results.forEach((r, i) => {
        const icon = r.status === "applied" ? "✅" : r.status === "dry_run_complete" ? "🔸" : "❌";
        console.log(`${icon} ${r.agency}`);
        console.log(`   Status: ${r.status}`);
        console.log(`   Actions: ${r.actionsCompleted}/${r.actionsTotal}`);
        if (r.errors?.length) console.log(`   Errors: ${r.errors.join(", ")}`);
        if (r.hasScreenshot) console.log(`   📸 ${r.screenshot}`);
        console.log("");
    });

    const applied = results.filter(r => r.status === "applied").length;
    const failed = results.filter(r => r.status !== "applied").length;
    console.log(`Applied: ${applied}/${results.length}  |  Failed: ${failed}/${results.length}`);
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}/`);
}

main().catch(err => {
    console.error("💥 Test crashed:", err);
    process.exit(1);
});
