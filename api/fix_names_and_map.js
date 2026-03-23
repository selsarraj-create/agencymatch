// fix_names_and_map.js — Fix ugly auto-generated names and map new agencies
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const NAME_FIXES = {
    "Stormmanagement": "Storm Management",
    "Prm Agency": "PRM Agency",
    "Wmgmt": "W Model Management",
    "Fortemodelmanagement": "Forte Model Management",
    "Manchestermodelagency": "Manchester Model Agency (MMA)",
    "Mustardmodels": "Mustard Models",
    "Tinyangels": "Tiny Angels",
    "Wathletic": "W Athletic",
    "Sportsmodels": "Sports Models UK",
    "Aspiremodelmanagement": "Aspire Model Management",
    "Mentormodelagency": "Mentor Model Agency",
    "Lmpmodels": "LMP Models",
    "Littlereddog": "Little Red Dog",
    "Beetalent": "Bee Talent",
    "Superiormodelmanagement": "Superior Model Management",
    "Atlantismodelling": "Atlantis Modelling",
    "Capulet": "Capulet",
    "Ullamodels": "Ulla Models",
};

(async () => {
    console.log("Fixing names...");
    for (const [oldName, newName] of Object.entries(NAME_FIXES)) {
        const { error } = await sb.from("agencies")
            .update({ name: newName })
            .eq("name", oldName);
        if (error) console.log("  ❌ " + oldName + ": " + error.message);
        else console.log("  ✅ " + oldName + " → " + newName);
    }

    // List unmapped agencies
    const { data } = await sb.from("agencies")
        .select("id, name, application_url, selector_map")
        .eq("status", "active")
        .is("selector_map", null)
        .order("name");

    console.log("\nUnmapped agencies: " + data.length);
    data.forEach(a => console.log("  " + a.id + " | " + a.name + " | " + a.application_url));

    process.exit(0);
})();
