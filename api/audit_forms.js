// audit_forms.js — Honest audit of which agencies actually have submittable forms
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const { data } = await sb.from("agencies").select("name, application_url, selector_map").eq("status", "active");

    let noMap = 0, zeroFields = 0;
    const submittable = [];
    const partial = [];
    const zeroList = [];

    data.forEach(a => {
        if (!a.selector_map) { noMap++; return; }
        const s = a.selector_map.selectors || a.selector_map;
        const filled = Object.entries(s).filter(([k, v]) => v !== null);
        const hasSubmitBtn = s.submitButton !== null && s.submitButton !== undefined;
        const fieldCount = filled.filter(([k]) => k !== "submitButton" && k !== "termsCheckbox").length;

        if (filled.length === 0) {
            zeroFields++;
            zeroList.push(a.name);
        } else if (hasSubmitBtn && fieldCount >= 2) {
            submittable.push({ name: a.name, fields: fieldCount, total: filled.length });
        } else {
            partial.push({ name: a.name, fields: fieldCount, submit: hasSubmitBtn, total: filled.length });
        }
    });

    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  FORM AUDIT — Honest Assessment                ║");
    console.log("╚══════════════════════════════════════════════════╝\n");
    console.log("Total active agencies: " + data.length);
    console.log("No selector_map at all: " + noMap);
    console.log("Mapped but 0 fields (NO form): " + zeroFields);
    console.log("SUBMITTABLE (submit + 2+ fields): " + submittable.length);
    console.log("Partial (some fields, incomplete): " + partial.length);

    console.log("\n═══ ✅ SUBMITTABLE — Real auto-fillable forms ═══════");
    submittable.sort((a, b) => b.fields - a.fields).forEach(s => {
        console.log("  ✅ " + s.name.padEnd(40) + s.fields + " fields + submit");
    });

    console.log("\n═══ ⚠️  PARTIAL — Missing submit or < 2 fields ═══════");
    partial.sort((a, b) => b.fields - a.fields).forEach(s => {
        console.log("  ⚠️  " + s.name.padEnd(40) + s.fields + " fields, submit=" + s.submit);
    });

    console.log("\n═══ ❌ ZERO FIELDS — Form page but no selectors ═══════");
    console.log("  " + zeroFields + " agencies (page loaded but no form elements found)");

    console.log("\n\n📊 SUMMARY:");
    console.log("  ✅ Ready to auto-submit: " + submittable.length);
    console.log("  ⚠️  Partial/needs manual: " + partial.length);
    console.log("  ❌ No form on page: " + zeroFields);
    console.log("  🚫 Not mapped: " + noMap);
    console.log("  📦 Total: " + data.length);
    process.exit(0);
})();
