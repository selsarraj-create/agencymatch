require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data } = await sb.from("agencies").select("name, application_url, selector_map").eq("status","active").order("name");
  const zero = data.filter(a => {
    if (!a.selector_map) return true;
    const s = a.selector_map.selectors || a.selector_map;
    return Object.entries(s).filter(([k,v]) => v !== null).length === 0;
  });
  zero.forEach(a => {
    let domain = "";
    try { domain = new URL(a.application_url).hostname; } catch(_) { domain = a.application_url || "N/A"; }
    console.log(a.name.padEnd(40) + domain);
  });
  console.log("\nTotal: " + zero.length);
  process.exit(0);
})();
