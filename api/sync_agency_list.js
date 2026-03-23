/**
 * sync_agency_list.js
 *
 * Cross-references a master list of application URLs against the existing
 * Supabase agencies table. Finds new agencies, updates mismatched URLs,
 * and maps forms for any new additions.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Master list from user
const MASTER_URLS = [
    "https://www.models1.co.uk/apply/",
    "https://www.elitemodelmanagement.com/london/get-scouted.web",
    "https://getscouted.imgmodels.com/",
    "https://www.stormmanagement.com/apply-step-1/",
    "https://www.wilhelmina.com/become-a-model",
    "https://www.premiermodelmanagement.com/become-a-model/",
    "https://www.basemodels.co.uk/become/",
    "https://www.sandrareynolds.co.uk/join-our-agency",
    "https://www.milkmanagement.co.uk/be-scouted/",
    "https://www.nevsmodels.co.uk/apply",
    "https://www.firstmodelmanagement.co.uk/become-a-model",
    "https://bmamodels.com/apply-to-join/",
    "https://www.nemesismodels.com/join",
    "https://www.bossmodelmanagement.co.uk/become-a-model/",
    "https://www.industrymodels.co.uk/become-a-model/",
    "https://www.jadoremodels.co.uk/apply",
    "https://www.graceandgalor.com/join-us/",
    "https://www.bonnieandbetty.com/apply",
    "https://www.scallywags.co.uk/apply",
    "https://www.sourcemodels.co.uk/apply",
    "https://www.selectmodel.com/become-a-model",
    "https://www.thesquadmanagement.com/join",
    "https://www.tessmanagement.com/contact/",
    "https://www.lindenstaub.com/apply",
    "https://www.prm-agency.com/become-a-model",
    "https://www.bodylondon.com/join-us",
    "https://www.bridgemodels.co.uk/apply",
    "https://greymodelagency.com/apply",
    "https://www.immmodels.com/become-a-model",
    "https://www.kultlondon.uk/become-a-model",
    "https://www.profile-models.com/apply",
    "https://www.establishedmodels.com/become-a-model",
    "https://www.zebedeemanagement.co.uk/apply",
    "https://www.ugly.org/wanabee",
    "https://www.wmgmt.co.uk/apply",
    "https://www.fortemodelmanagement.com/apply",
    "https://www.vision-models.com/join-us",
    "https://www.brothermodels.com/contact",
    "https://www.presentmodelmanagement.com/be-discovered",
    "https://www.freshagents.co.uk/apply",
    "https://www.bamemodels.com/apply",
    "https://bizzykidz.com/apply-to-join/",
    "https://www.rayandrobin.com/apply",
    "https://www.urbanangelsagency.com/apply",
    "https://www.manchestermodelagency.com/join-us",
    "https://www.mustardmodels.co.uk/apply",
    "https://www.coloursagency.com/apply",
    "https://www.tartanmodels.co.uk/apply",
    "https://www.gingersnap.co.uk/become-a-model",
    "https://www.catwalk-models.co.uk/application-form/",
    "https://www.maverickmodels.co.uk/apply",
    "https://www.pha-agency.co.uk/apply",
    "https://www.vauhaus.co.uk",
    "https://www.talentmanagement.com/register/",
    "https://www.junction8model.com/register",
    "https://www.kidslondonltd.com/how-to-apply",
    "https://www.hfmgmt.co.uk/apply",
    "https://www.daisyanddukes.com/join-us",
    "https://www.ologykidscasting.com/apply",
    "https://www.universalextras.co.uk/apply",
    "https://www.castingcollective.co.uk/artistes/urgent-casting-calls",
    "https://www.acamodels.com/apply",
    "https://www.novaeire.com/apply",
    "https://www.theextrasdept.com/register",
    "https://www.oxygenmodels.com/apply",
    "https://www.nextmanagement.com/be-discovered",
    "https://www.saltmodelmanagement.com/become-a-model",
    "https://www.ttmmanagement.co.uk/apply",
    "https://www.thehivemanagement.com/be-discovered",
    "https://www.saltandpeppermodels.co.uk/apply",
    "https://www.zone-models.com/apply",
    "https://www.elliottbrownagency.co.uk/apply",
    "https://www.alphabetkidz.co.uk/apply",
    "https://www.tinyangels.co.uk/apply",
    "http://www.wathletic.com/contact-us/",
    "https://www.hiredhandsmodels.com/apply",
    "https://www.sportsmodels.co.uk/apply",
    "https://www.m-models.co.uk/apply-now",
    "https://www.bigmustard.co.uk/apply",
    "https://www.alphaagency.co.uk/apply",
    "https://www.newidolmodel.co.uk/apply",
    "https://www.emmjsmodelmanagement.co.uk/contact",
    "https://www.shhtalent.com/apply",
    "https://www.atlantismodellingagency.co.uk/apply",
    "https://www.rmg-models.co.uk/apply",
    "https://www.valkyriemodels.co.uk/apply",
    "https://www.bonditalent.co.uk/apply",
    "https://www.pkmodelagency.co.uk/apply",
    "http://www.aspiremodelmanagement.co.uk/contact",
    "https://www.eclipsemodelmanagement.co.uk/apply",
    "https://www.mentormodelagency.co.uk/apply",
    "https://www.dkmodels.net/apply",
    "https://www.lmpmodels.com/contact",
    "https://childsplayclothing.com/pages/model-search",
    "https://www.sspagency.co.uk/apply",
    "https://www.littlereddog.co.uk/apply",
    "https://www.modelagency4baby.co.uk/apply",
    "https://www.connectmgt.com/apply",
    "https://www.beetalent.co.uk/apply",
    "https://www.twentytwotalent.co.uk/apply",
    "https://www.brownandmills.co.uk/apply",
    "https://www.bmaartists.com/apply",
    "https://www.fitangels.co.uk/apply",
    "https://www.fittingsdivision.co.uk/apply",
    "https://www.the-bureau.com/apply",
    "https://www.artimis.co.uk/apply",
    "https://www.inhousemodels.co.uk/apply",
    "https://www.bmahands.com/apply",
    "https://www.flairtalent.com/apply",
    "https://www.superiormodelmanagement.co.uk/apply",
    "https://www.rayknight.co.uk/apply",
    "https://www.two10casting.com/apply",
    "https://www.extra-people.com/apply",
    "https://www.pieceofcakecasting.com/apply",
    "https://www.phoenixcasting.tv/apply",
    "https://www.zbdtalent.com/apply",
    "https://www.rachelspeople.co.uk/apply",
    "https://www.bizzykidzagency.com/apply",
    "https://www.modelstudents.co.uk/apply",
    "https://www.atlantismodelling.com/apply",
    "https://www.creativecasting.tv/register",
    "https://www.envisagecastingagency.co.uk/apply",
    "https://www.castingtree.co.uk/apply",
    "https://www.take1casting.co.uk/apply",
    "https://www.eventstaffing.co.uk/join-us",
    "https://www.pushpromotions.co.uk/apply",
    "https://www.elpromotions.co.uk/apply",
    "https://www.tidypromo.com/join",
    "https://www.executional.co.uk/apply",
    "https://www.eventsstaffingagency.co.uk/apply",
    "https://www.mint-people.co.uk/apply",
    "https://www.host-staffing.co.uk/apply",
    "https://www.splendid.co.uk/apply",
    "https://www.iconicfacescollective.com/apply",
    "https://www.zjell.com/apply",
    "https://www.novaartists.co.uk/apply",
    "https://www.capulet.co.uk/apply",
    "https://www.gilbertandpayne.com/apply",
    "https://www.michelleblairmanagement.co.uk/apply",
    "https://www.mostynandcross.com/apply",
    "https://www.nicknightmanagement.com/apply",
    "https://www.westmodelmanagement.com/apply",
    "https://www.platinum-promotions.co.uk/apply",
    "https://www.develop-models.com/apply",
    "https://www.code3models.co.uk/apply",
    "https://www.perceptionmodels.com/apply",
    "https://www.ullamodels.com/apply",
    "https://www.go-models.com/apply",
    "https://www.freelancerclub.net/apply",
    "https://www.alltalentagency.co.uk/apply",
    "https://www.94models.com/contact",
    "https://www.asagency.co.uk/apply",
    "https://www.fusionmng.com/apply",
];

function getDomain(url) {
    try { return new URL(url).hostname.replace("www.", ""); } catch(_) { return null; }
}

(async () => {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  SYNC — Master Agency List                     ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    // Deduplicate master list
    const seen = new Set();
    const uniqueUrls = MASTER_URLS.filter(url => {
        const d = getDomain(url);
        if (!d || seen.has(d)) return false;
        seen.add(d);
        return true;
    });
    console.log("Master list: " + MASTER_URLS.length + " URLs (" + uniqueUrls.length + " unique domains)\n");

    // Get existing agencies
    const { data: existing } = await sb.from("agencies")
        .select("id, name, application_url, website_url")
        .order("name");

    // Build domain -> agency lookup
    const byDomain = {};
    existing.forEach(a => {
        const d = getDomain(a.application_url || a.website_url);
        if (d) byDomain[d] = a;
    });

    console.log("Existing agencies: " + existing.length + "\n");

    // Compare
    const matched = [];
    const urlUpdates = [];
    const newUrls = [];

    for (const url of uniqueUrls) {
        const domain = getDomain(url);
        const existingAgency = byDomain[domain];

        if (existingAgency) {
            // Check if URL needs updating
            const existingUrl = (existingAgency.application_url || "").replace(/\/+$/, "");
            const newUrl = url.replace(/\/+$/, "");
            if (existingUrl !== newUrl) {
                urlUpdates.push({ id: existingAgency.id, name: existingAgency.name, oldUrl: existingAgency.application_url, newUrl: url });
            } else {
                matched.push(domain);
            }
        } else {
            newUrls.push(url);
        }
    }

    console.log("✅ Already in DB (matched): " + matched.length);
    console.log("🔄 URL updates needed: " + urlUpdates.length);
    console.log("✨ New agencies to add: " + newUrls.length);

    // Show URL updates
    if (urlUpdates.length > 0) {
        console.log("\n── URL Updates ──────────────────────────────────");
        urlUpdates.forEach(u => {
            console.log("  " + u.name);
            console.log("    OLD: " + u.oldUrl);
            console.log("    NEW: " + u.newUrl);
        });
    }

    // Show new agencies
    if (newUrls.length > 0) {
        console.log("\n── New Agencies ─────────────────────────────────");
        newUrls.forEach(url => {
            const domain = getDomain(url);
            // Guess a name from the domain
            const name = domain.replace(/\.(co\.uk|com|net|org|tv|uk)$/, "")
                .replace(/-/g, " ")
                .replace(/\b\w/g, c => c.toUpperCase());
            console.log("  " + name + " -> " + url);
        });
    }

    // Apply URL updates
    if (urlUpdates.length > 0) {
        console.log("\n📝 Applying " + urlUpdates.length + " URL updates...");
        for (const u of urlUpdates) {
            const { error } = await sb.from("agencies")
                .update({ application_url: u.newUrl, selector_map: null })
                .eq("id", u.id);
            if (error) {
                console.log("  ❌ " + u.name + ": " + error.message);
            } else {
                console.log("  ✅ " + u.name + " URL updated (map cleared for re-mapping)");
            }
        }
    }

    // Insert new agencies
    if (newUrls.length > 0) {
        console.log("\n📝 Inserting " + newUrls.length + " new agencies...");
        const toInsert = newUrls.map(url => {
            const domain = getDomain(url);
            const name = domain.replace(/\.(co\.uk|com|net|org|tv|uk)$/, "")
                .replace(/-/g, " ")
                .replace(/\b\w/g, c => c.toUpperCase());
            return {
                name: name,
                website_url: "https://" + (domain.startsWith("www.") ? "" : "www.") + domain,
                application_url: url,
                location: "UK",
                status: "active",
            };
        });

        const { data: inserted, error } = await sb.from("agencies")
            .insert(toInsert)
            .select("id, name, application_url");

        if (error) {
            console.error("  ❌ Insert error: " + error.message);
        } else {
            console.log("  ✅ Inserted " + inserted.length + " new agencies");
            inserted.forEach(a => console.log("    • " + a.name));
        }
    }

    // Final count
    const { count } = await sb.from("agencies")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
    console.log("\n📦 Total active agencies: " + count);

    process.exit(0);
})();
