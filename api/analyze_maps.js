require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const r = await sb.from("agencies").select("name, selector_map")
    .eq("status", "active").not("selector_map", "is", null).order("name");

  const fields = [
    "firstName","lastName","email","phone","age","dateOfBirth",
    "gender","height","bust","waist","hips","shoeSize",
    "eyeColor","hairColor","instagramHandle","aboutMe",
    "howDidYouHear","photoUpload","termsCheckbox","submitButton"
  ];

  const counts = {};
  fields.forEach(f => counts[f] = 0);

  let total = 0;
  let zeroFields = 0;

  r.data.forEach(a => {
    const sel = a.selector_map && a.selector_map.selectors;
    if (!sel) return;
    total++;

    const found = fields.filter(f => sel[f] !== null && sel[f] !== undefined).length;
    if (found === 0) zeroFields++;

    fields.forEach(f => {
      if (sel[f] !== null && sel[f] !== undefined) counts[f]++;
    });
  });

  console.log("Agencies with selector maps: " + total);
  console.log("Agencies with 0 fields found: " + zeroFields + " (no form on page)");
  console.log("Agencies with 1+ fields: " + (total - zeroFields));
  console.log("");
  console.log("FIELD COVERAGE (across " + total + " agencies):");
  console.log("─".repeat(60));

  const sorted = [...fields].sort((a, b) => counts[b] - counts[a]);
  sorted.forEach(f => {
    const pct = ((counts[f] / total) * 100).toFixed(0);
    const bar = "█".repeat(Math.round(counts[f] / total * 30));
    console.log(f.padEnd(20) + String(counts[f]).padStart(4) + "/" + total + "  (" + pct.padStart(3) + "%)  " + bar);
  });

  process.exit(0);
})();
