/**
 * discover_new_agencies.js
 *
 * Adds new UK agencies to Supabase, maps their forms, and reports which
 * ones have real HTML forms vs email-only pages.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const { generateMap } = require("./map_agency");

const sb = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// New UK agencies found via web search (not already in the database)
const NEW_AGENCIES = [
    { name: "Sandra Reynolds", website_url: "https://www.sandrareynolds.co.uk", application_url: "https://www.sandrareynolds.co.uk/become-a-model/apply", city: "London" },
    { name: "Models Direct", website_url: "https://www.modelsdirect.com", application_url: "https://www.modelsdirect.com/apply", city: "London" },
    { name: "Ditto Models", website_url: "https://www.dittomodels.co.uk", application_url: "https://www.dittomodels.co.uk/apply", city: "London" },
    { name: "CM Models", website_url: "https://www.cmmodels.com", application_url: "https://www.cmmodels.com/apply", city: "London" },
    { name: "UK Models", website_url: "https://www.ukmodels.co.uk", application_url: "https://www.ukmodels.co.uk/apply", city: "London" },
    { name: "Nemesis Models", website_url: "https://www.nemesismodels.com", application_url: "https://www.nemesismodels.com/apply", city: "Manchester" },
    { name: "Grey Model Agency", website_url: "https://www.greymodelagency.com", application_url: "https://www.greymodelagency.com/apply", city: "London" },
    { name: "Wilhelmina London", website_url: "https://www.wilhelmina.com", application_url: "https://www.wilhelmina.com/apply", city: "London" },
    { name: "PHA Agency", website_url: "https://www.pha-agency.co.uk", application_url: "https://www.pha-agency.co.uk/become-a-model", city: "Manchester" },
    { name: "Storm Model Management", website_url: "https://www.stormmodels.com", application_url: "https://www.stormmodels.com/become-a-model", city: "London" },
    { name: "Models 1", website_url: "https://www.models1.co.uk", application_url: "https://www.models1.co.uk/become-a-model", city: "London" },
    { name: "ML International Talent", website_url: "https://www.mlinternationaltalent.co.uk", application_url: "https://www.mlinternationaltalent.co.uk/apply", city: "London" },
    { name: "Bondi Talent Agency", website_url: "https://www.bonditalent.co.uk", application_url: "https://www.bonditalent.co.uk/apply", city: "London" },
    { name: "Model Team", website_url: "https://www.modelteam.co.uk", application_url: "https://www.modelteam.co.uk/become-a-model", city: "London" },
    { name: "AS Agency", website_url: "https://www.asagency.co.uk", application_url: "https://www.asagency.co.uk/apply", city: "Birmingham" },
    { name: "J'adore Models", website_url: "https://www.jadoremodels.co.uk", application_url: "https://www.jadoremodels.co.uk/apply", city: "Manchester" },
    { name: "The MiLK Collective", website_url: "https://www.milkmanagement.co.uk", application_url: "https://www.milkmanagement.co.uk/be-scouted", city: "London" },
    { name: "ZBD Talent", website_url: "https://www.zbdtalent.com", application_url: "https://www.zbdtalent.com/apply", city: "London" },
    { name: "Stage One Talent Agency", website_url: "https://www.stageonetalent.co.uk", application_url: "https://www.stageonetalent.co.uk/apply", city: "London" },
    { name: "Linden Staub", website_url: "https://www.lindenstaub.com", application_url: "https://www.lindenstaub.com/become-a-model", city: "London" },
    { name: "W Model Management", website_url: "https://www.wmodelmanagement.com", application_url: "https://www.wmodelmanagement.com/become-a-model", city: "London" },
    { name: "D1 Models", website_url: "https://www.d1models.com", application_url: "https://www.d1models.com/become-a-model", city: "London" },
    { name: "Nido Management", website_url: "https://www.nidomanagement.co.uk", application_url: "https://www.nidomanagement.co.uk/apply", city: "London" },
    { name: "Leni's Model Management", website_url: "https://www.lenismodels.com", application_url: "https://www.lenismodels.com/apply", city: "London" },
    { name: "MandP Models", website_url: "https://www.mandpmodels.com", application_url: "https://www.mandpmodels.com/become-a-model", city: "London" },
    { name: "ICE Models", website_url: "https://www.icemodels.co.uk", application_url: "https://www.icemodels.co.uk/apply", city: "London" },
    { name: "FM Agency", website_url: "https://www.fmagency.com", application_url: "https://www.fmagency.com/apply", city: "London" },
    { name: "Hired Hands Models (Body Parts)", website_url: "https://www.hiredhandsmodels.com", application_url: "https://www.hiredhandsmodels.com/apply", city: "London" },
    { name: "Bookings Models", website_url: "https://www.bookingsmodels.co.uk", application_url: "https://www.bookingsmodels.co.uk/apply", city: "London" },
    { name: "BMA Artists", website_url: "https://www.bmaartists.com", application_url: "https://www.bmaartists.com/apply", city: "London" },
];

(async () => {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  DISCOVER — New UK Agencies                    ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    // 1. Get existing domains to deduplicate
    const existing = await sb.from("agencies").select("name, website_url, application_url").order("name");
    const existingDomains = new Set();
    existing.data.forEach(a => {
        try { existingDomains.add(new URL(a.application_url || a.website_url).hostname.replace("www.", "")); } catch(_) {}
    });

    console.log(`📦 Existing agencies: ${existing.data.length}`);
    console.log(`🌐 Existing domains: ${existingDomains.size}\n`);

    // 2. Filter out duplicates
    const newOnes = NEW_AGENCIES.filter(a => {
        try {
            const domain = new URL(a.application_url || a.website_url).hostname.replace("www.", "");
            if (existingDomains.has(domain)) {
                console.log(`⏭️  Skip (already exists): ${a.name} (${domain})`);
                return false;
            }
            return true;
        } catch(_) { return false; }
    });

    console.log(`\n✨ New agencies to add: ${newOnes.length}\n`);

    if (newOnes.length === 0) {
        console.log("No new agencies to add.");
        process.exit(0);
    }

    // 3. Insert into Supabase
    const toInsert = newOnes.map(a => ({
        name: a.name,
        website_url: a.website_url,
        application_url: a.application_url,
        location: a.city || "UK",
        status: "active",
    }));

    const { data: inserted, error: insertError } = await sb
        .from("agencies")
        .insert(toInsert)
        .select("id, name, application_url");

    if (insertError) {
        console.error("❌ Insert error:", insertError.message);
        process.exit(1);
    }

    console.log(`✅ Inserted ${inserted.length} new agencies\n`);

    // 4. Map each new agency
    const results = { withForm: 0, noForm: 0, failed: 0, errors: [] };

    for (let i = 0; i < inserted.length; i++) {
        const agency = inserted[i];
        const progress = `[${i + 1}/${inserted.length}]`;
        console.log(`\n${"─".repeat(60)}`);
        console.log(`${progress} 🏢 ${agency.name}`);
        console.log(`    URL: ${agency.application_url}`);

        try {
            const mapResult = await generateMap(agency.application_url);
            const found = Object.values(mapResult.selectors || {}).filter(v => v !== null).length;

            await sb.from("agencies").update({ selector_map: mapResult }).eq("id", agency.id);

            if (found > 0) {
                results.withForm++;
                console.log(`  ✅ ${progress} FORM FOUND — ${found}/20 fields`);
            } else {
                results.noForm++;
                console.log(`  ⬜ ${progress} No form — 0/20 fields`);
            }
        } catch (err) {
            results.failed++;
            results.errors.push({ name: agency.name, error: err.message });
            console.error(`  ❌ ${progress} Failed: ${err.message}`);
        }

        if (i < inserted.length - 1) await sleep(3000);
    }

    // 5. Summary
    console.log(`\n\n${"═".repeat(60)}`);
    console.log("📊 DISCOVERY RESULTS");
    console.log(`${"═".repeat(60)}`);
    console.log(`  ✅ With form: ${results.withForm}`);
    console.log(`  ⬜ No form:   ${results.noForm}`);
    console.log(`  ❌ Failed:    ${results.failed}`);
    console.log(`  📦 Total new: ${inserted.length}`);

    if (results.errors.length > 0) {
        console.log(`\n❌ Failures:`);
        results.errors.forEach(e => console.log(`  • ${e.name}: ${e.error}`));
    }

    console.log(`\n${"═".repeat(60)}\n`);
    process.exit(0);
})();
