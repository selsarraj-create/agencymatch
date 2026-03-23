/**
 * batch_map_agencies.js — Run the AI form mapper on ALL agencies in Supabase
 *
 * Each agency is mapped by shelling out to `node map_agency.js <url>` and
 * parsing the JSON output. If the child crashes, we skip and continue.
 *
 * Usage:
 *   node batch_map_agencies.js              # Map agencies without a map
 *   node batch_map_agencies.js --force      # Re-map ALL agencies
 *   node batch_map_agencies.js --zero-only  # Re-map agencies with 0 fields found
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const { execSync } = require("child_process");
const path = require("path");

// ─── Trap SIGINT so child signals don't kill us ─────────────────────────────
process.on("SIGINT", () => { /* ignore */ });

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const MAP_SCRIPT = path.resolve(__dirname, "map_agency.js");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function mapViaCli(url) {
    try {
        const output = execSync(
            `node "${MAP_SCRIPT}" "${url}" 2>&1`,
            { timeout: 120_000, maxBuffer: 10 * 1024 * 1024, stdio: "pipe" }
        ).toString();
        process.stdout.write(output);

        const jsonMatch = output.match(/─── JSON Output ───\n([\s\S]+)$/);
        if (!jsonMatch) throw new Error("No JSON output found");
        return JSON.parse(jsonMatch[1].trim());
    } catch (err) {
        if (err.stdout) process.stdout.write(err.stdout.toString());
        if (err.stderr) process.stderr.write(err.stderr.toString());
        throw new Error(err.message.split("\n")[0]);
    }
}

/**
 * Check if a selector map has zero non-null selectors
 */
function hasZeroFields(selectorMap) {
    if (!selectorMap || !selectorMap.selectors) return true;
    return Object.values(selectorMap.selectors).every(v => v === null || v === undefined);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    const forceRemap = process.argv.includes("--force");
    const zeroOnly = process.argv.includes("--zero-only");

    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  BATCH MAP — All Agencies via Gemini Flash      ║");
    console.log("╚══════════════════════════════════════════════════╝\n");
    if (zeroOnly) console.log("🔎 Mode: --zero-only (re-mapping agencies with 0 fields)\n");

    // 1. Fetch all agencies with application URLs
    console.log("📦 Fetching agencies from Supabase...");
    const { data: agencies, error } = await supabase
        .from("agencies")
        .select("id, name, application_url, selector_map")
        .eq("status", "active")
        .not("application_url", "is", null)
        .order("name");

    if (error) {
        console.error("❌ Supabase fetch error:", error.message);
        process.exit(1);
    }

    console.log(`  Found ${agencies.length} agencies with application URLs\n`);

    if (agencies.length === 0) {
        console.log("Nothing to map. Exiting.");
        return;
    }

    // 2. Filter based on mode
    let toMap;
    if (forceRemap) {
        toMap = agencies;
    } else if (zeroOnly) {
        toMap = agencies.filter((a) => a.selector_map && hasZeroFields(a.selector_map));
    } else {
        toMap = agencies.filter((a) => !a.selector_map);
    }

    const skipped = agencies.length - toMap.length;
    if (skipped > 0) {
        console.log(`⏭️  Skipping ${skipped} agencies\n`);
    }

    if (toMap.length === 0) {
        console.log("All agencies already mapped. Use --force or --zero-only to remap.");
        return;
    }

    console.log(`📋 Will map ${toMap.length} agencies\n`);

    // 3. Map each agency via CLI
    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < toMap.length; i++) {
        const agency = toMap[i];
        const progress = `[${i + 1}/${toMap.length}]`;

        console.log(`\n${"─".repeat(60)}`);
        console.log(`${progress} 🏢 ${agency.name}`);
        console.log(`    URL: ${agency.application_url}`);
        console.log(`${"─".repeat(60)}`);

        try {
            const mapResult = mapViaCli(agency.application_url);

            const { error: updateError } = await supabase
                .from("agencies")
                .update({ selector_map: mapResult })
                .eq("id", agency.id);

            if (updateError) throw new Error(`Supabase update failed: ${updateError.message}`);

            const found = Object.values(mapResult.selectors || {}).filter(v => v !== null).length;
            results.success++;
            console.log(`  ✅ ${progress} Saved (${found} fields found)`);
        } catch (err) {
            results.failed++;
            results.errors.push({ name: agency.name, error: err.message });
            console.error(`  ❌ ${progress} Failed: ${err.message}`);
        }

        if (i < toMap.length - 1) {
            console.log("  ⏳ Waiting 3s...");
            await sleep(3000);
        }
    }

    // 4. Summary
    console.log(`\n\n${"═".repeat(60)}`);
    console.log("📊 BATCH MAP RESULTS");
    console.log(`${"═".repeat(60)}`);
    console.log(`  ✅ Success: ${results.success}`);
    console.log(`  ❌ Failed:  ${results.failed}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  📦 Total:   ${agencies.length}`);

    if (results.errors.length > 0) {
        console.log(`\n❌ Failures:`);
        results.errors.forEach((e) => {
            console.log(`  • ${e.name}: ${e.error}`);
        });
    }

    console.log(`\n${"═".repeat(60)}\n`);
}

main().catch((err) => {
    console.error("💥 Fatal:", err.message);
    process.exit(1);
});
