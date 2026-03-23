// list_zero_field_agencies.js — List agencies with 0 mapped fields
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const r = await sb.from("agencies").select("id, name, application_url, selector_map")
        .eq("status", "active").not("selector_map", "is", null).order("name");

    const zero = r.data.filter(a => {
        const sel = a.selector_map && a.selector_map.selectors;
        if (!sel) return true;
        return Object.values(sel).every(v => v === null || v === undefined);
    });

    console.log("Zero-field agencies: " + zero.length);
    console.log("");
    // Output in format suitable for shell script
    zero.forEach(a => {
        console.log(a.id + "|" + a.application_url);
    });
    process.exit(0);
})();
