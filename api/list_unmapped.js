// list_unmapped.js — Quick utility to list unmapped agencies
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
    const r = await sb
        .from("agencies")
        .select("id, name, application_url, selector_map")
        .eq("status", "active")
        .not("application_url", "is", null)
        .order("name");

    const all = r.data;
    const unmapped = all.filter((a) => !a.selector_map);
    const mapped = all.length - unmapped.length;

    console.log(`Total: ${all.length} | Mapped: ${mapped} | Remaining: ${unmapped.length}`);
    console.log("");
    unmapped.forEach((a) => {
        console.log(`${a.id}\t${a.name}\t${a.application_url}`);
    });
    process.exit(0);
})();
