// clean_non_form.js — Remove agencies that don't have form-based applications
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const { data } = await sb.from("agencies").select("id, name, application_method").eq("status", "active");

    const formAgencies = data.filter(a => a.application_method && a.application_method.toLowerCase().includes("form"));
    const nonForm = data.filter(a => !a.application_method || !a.application_method.toLowerCase().includes("form"));

    console.log("Total:", data.length);
    console.log("With Form method (keeping):", formAgencies.length);
    console.log("Without Form (deleting):", nonForm.length);
    console.log("");
    nonForm.forEach(a => console.log("  🗑️  " + a.name + " [" + (a.application_method || "none") + "]"));

    const ids = nonForm.map(a => a.id);
    if (ids.length > 0) {
        const { error } = await sb.from("agencies").delete().in("id", ids);
        if (error) console.error("Delete error:", error.message);
        else console.log("\nDeleted " + ids.length + " non-form agencies");
    }

    const { count } = await sb.from("agencies").select("id", { count: "exact", head: true }).eq("status", "active");
    console.log("Remaining active: " + count);
    process.exit(0);
})();
