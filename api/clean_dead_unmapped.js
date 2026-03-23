// clean_dead_unmapped.js — Remove agencies that failed mapping (dead domains)
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const DEAD = [
    "Aspire Model Management",
    "Atlantis Modelling",
    "Bee Talent",
    "LMP Models",
    "Manchester Model Agency (MMA)",
    "Mosaic Model Management",
    "Mustard Models",
    "Superior Model Management",
    "Tiny Angels",
    "Ulla Models",
    "Mentor Model Agency",
];

(async () => {
    const { error } = await sb.from("agencies").delete().in("name", DEAD);
    if (error) console.error("Delete error:", error.message);
    else console.log("Deleted " + DEAD.length + " dead agencies");

    const { count } = await sb.from("agencies").select("id", { count: "exact", head: true }).eq("status", "active");
    console.log("Remaining active: " + count);

    // Check unmapped
    const r2 = await sb.from("agencies").select("name", { count: "exact" }).eq("status", "active").is("selector_map", null);
    console.log("Still unmapped: " + r2.count);
    if (r2.data) r2.data.forEach(a => console.log("  - " + a.name));

    process.exit(0);
})();
