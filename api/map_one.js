/**
 * map_one.js — Map a single agency and save to Supabase
 *
 * Usage: node map_one.js <agency_id> <url>
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const { generateMap } = require("./map_agency");

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
    const agencyId = process.argv[2];
    const url = process.argv[3];

    if (!agencyId || !url) {
        console.error("Usage: node map_one.js <agency_id> <url>");
        process.exit(1);
    }

    try {
        const mapResult = await generateMap(url);

        const { error } = await supabase
            .from("agencies")
            .update({ selector_map: mapResult })
            .eq("id", agencyId);

        if (error) throw new Error(error.message);

        console.log("SAVED_OK");
        process.exit(0);
    } catch (err) {
        console.error("FAILED:", err.message);
        process.exit(1);
    }
})();
