// categorize_forms.js — Analyze and categorize agencies with forms
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const CORE_FIELDS = ["firstName","lastName","email","phone","age","dateOfBirth","gender","height","instagramHandle","aboutMe","photoUpload"];

(async () => {
    const { data } = await sb.from("agencies")
        .select("name, category, application_url, selector_map, application_method, bot_protection")
        .eq("status", "active")
        .order("category, name");

    // Classify each agency
    const agencies = data.map(a => {
        const s = (a.selector_map && (a.selector_map.selectors || a.selector_map)) || {};
        const filled = Object.entries(s).filter(([k, v]) => v !== null);
        const fieldCount = filled.filter(([k]) => k !== "submitButton" && k !== "termsCheckbox").length;
        const hasSubmit = s.submitButton !== null && s.submitButton !== undefined;
        const hasTerms = s.termsCheckbox !== null && s.termsCheckbox !== undefined;
        const coreFound = CORE_FIELDS.filter(f => s[f] !== null && s[f] !== undefined).length;

        let quality;
        if (hasSubmit && fieldCount >= 8) quality = "A — Excellent";
        else if (hasSubmit && fieldCount >= 4) quality = "B — Good";
        else if (hasSubmit && fieldCount >= 2) quality = "C — Basic";
        else if (fieldCount >= 2 || hasSubmit) quality = "D — Partial";
        else quality = "X — No Form";

        return {
            name: a.name,
            category: a.category || "Uncategorized",
            method: a.application_method || "Unknown",
            bot: a.bot_protection || "Unknown",
            fieldCount,
            coreFound,
            hasSubmit,
            hasTerms,
            quality,
            url: a.application_url,
        };
    });

    // Filter to form-bearing only (quality != X)
    const withForms = agencies.filter(a => a.quality !== "X — No Form");
    const noForms = agencies.filter(a => a.quality === "X — No Form");

    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║  AGENCY FORM ANALYSIS & CATEGORIZATION              ║");
    console.log("╚══════════════════════════════════════════════════════╝\n");
    console.log("Total active: " + agencies.length);
    console.log("With usable forms: " + withForms.length);
    console.log("No forms: " + noForms.length);

    // Quality breakdown
    console.log("\n═══ QUALITY TIERS ═══════════════════════════════════");
    const tiers = {};
    withForms.forEach(a => { tiers[a.quality] = (tiers[a.quality] || 0) + 1; });
    Object.entries(tiers).sort().forEach(([k, v]) => console.log("  " + k + ": " + v));

    // By category
    console.log("\n═══ BY CATEGORY ═════════════════════════════════════");
    const cats = {};
    withForms.forEach(a => {
        if (!cats[a.category]) cats[a.category] = { total: 0, A: 0, B: 0, C: 0, D: 0, agencies: [] };
        cats[a.category].total++;
        const tier = a.quality.charAt(0);
        cats[a.category][tier]++;
        cats[a.category].agencies.push(a);
    });

    Object.entries(cats).sort((a, b) => b[1].total - a[1].total).forEach(([cat, info]) => {
        console.log("\n┌─ " + cat + " (" + info.total + " agencies) ────────────────");
        console.log("│  Quality: A=" + info.A + "  B=" + info.B + "  C=" + info.C + "  D=" + info.D);
        info.agencies.sort((a, b) => b.fieldCount - a.fieldCount).forEach(a => {
            const icon = a.quality.startsWith("A") ? "🟢" : a.quality.startsWith("B") ? "🔵" : a.quality.startsWith("C") ? "🟡" : "🟠";
            const submit = a.hasSubmit ? "✓" : "✗";
            const terms = a.hasTerms ? "✓" : "✗";
            console.log("│  " + icon + " " + a.name.padEnd(35) + a.fieldCount.toString().padStart(2) + " fields  sub=" + submit + "  terms=" + terms);
        });
        console.log("└──────────────────────────────────────────────────");
    });

    // Field coverage summary
    console.log("\n═══ FIELD COVERAGE ACROSS ALL FORM AGENCIES ═════════");
    const fieldTotals = {};
    withForms.forEach(a => {
        const s = (data.find(d => d.name === a.name).selector_map.selectors || data.find(d => d.name === a.name).selector_map);
        Object.entries(s).forEach(([k, v]) => {
            if (!fieldTotals[k]) fieldTotals[k] = 0;
            if (v !== null) fieldTotals[k]++;
        });
    });
    Object.entries(fieldTotals).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
        const pct = Math.round(v / withForms.length * 100);
        const bar = "█".repeat(Math.round(pct / 3));
        console.log("  " + k.padEnd(20) + (v + "/" + withForms.length).padStart(7) + "  (" + pct.toString().padStart(3) + "%)  " + bar);
    });

    console.log("\n═══ SUMMARY ═════════════════════════════════════════");
    console.log("  🟢 Tier A (8+ fields + submit):  " + (tiers["A — Excellent"] || 0) + " — Ready for full auto-apply");
    console.log("  🔵 Tier B (4-7 fields + submit): " + (tiers["B — Good"] || 0) + " — Good auto-apply coverage");
    console.log("  🟡 Tier C (2-3 fields + submit): " + (tiers["C — Basic"] || 0) + " — Basic form, fewer details");
    console.log("  🟠 Tier D (partial):             " + (tiers["D — Partial"] || 0) + " — Needs manual assist");
    console.log("  ❌ No form:                      " + noForms.length);
    console.log("═════════════════════════════════════════════════════\n");

    process.exit(0);
})();
