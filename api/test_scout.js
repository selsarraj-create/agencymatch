/**
 * End-to-end test of scout.js using a CACHED selector map (no Gemini per-submit).
 * Uses REAL Browserless + Smartproxy.
 */

// Load env from project root
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { submitApplication } = require("./scout");

// ── Cached selector map from map_agency.js (Edge Talent) ──
const edgeTalentMap = {
    firstName: "#input_9_1",
    lastName: null,
    email: "#input_9_7",
    phone: "#input_9_15",
    age: "#input_9_11",
    dateOfBirth: null,
    gender: '[name="input_16"]',
    height: "#input_9_18",
    bust: "#input_9_20",
    waist: "#input_9_19",
    hips: null,
    shoeSize: "#input_9_21",
    eyeColor: null,
    hairColor: null,
    instagramHandle: null,
    aboutMe: null,
    howDidYouHear: null,
    photoUpload: "#input_9_6",
    termsCheckbox: null,
    submitButton: "#gform_submit_button_9",
};

const userData = {
    first_name: "Jane",
    last_name: "Doe",
    name: "Jane Doe",
    email: "jane.doe.test@example.com",
    phone: "+447123456789",
    gender: "Female",
    date_of_birth: "2000-05-15",
    age: "24",
    height: '5\'9"',
    bust: "86",
    waist: "62",
    hips: "90",
    shoe_size: "7",
    eye_color: "Brown",
    hair_color: "Brunette",
    instagram: "@janedoe_test",
    generated_photos: [],
};

async function main() {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  SCOUT.JS — CACHED MAP TEST (Edge Talent)      ║");
    console.log("║  Browserless + Smartproxy — NO Gemini per-submit║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    console.log("ENV check:");
    console.log(`  BROWSERLESS_TOKEN: ${process.env.BROWSERLESS_TOKEN ? "✅ set" : "❌ missing"}`);
    console.log(`  PROXY_USER:        ${process.env.PROXY_USER ? "✅ set" : "❌ missing"}`);
    console.log(`  PROXY_PASS:        ${process.env.PROXY_PASS ? "✅ set" : "❌ missing"}`);
    console.log(`  PROXY_SERVER:      ${process.env.PROXY_SERVER ? "✅ set" : "❌ missing"}`);
    console.log("");

    const result = await submitApplication(
        "https://edgetalent.co.uk/agency-test/",
        userData,
        {
            dryRun: true,
            screenshotPath: "/tmp/scout_cached_map_proof.png",
            selectorMap: edgeTalentMap,  // ← Use cached map, skip Gemini
        }
    );

    console.log("\n📊 FINAL RESULT:");
    console.log(JSON.stringify({
        status: result.status,
        actionsCompleted: result.actionsCompleted,
        actionsTotal: result.actionsTotal,
        errors: result.errors,
        hasScreenshot: !!result.screenshotBuffer,
    }, null, 2));
}

main().catch((err) => {
    console.error("💥 Test crashed:", err);
    process.exit(1);
});
