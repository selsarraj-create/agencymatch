/**
 * sync_master_277.js — Sync comprehensive 277-agency master list
 * 
 * Parses the full CSV data, cross-references by domain,
 * updates existing agencies with category/method/URLs,
 * and adds new agencies.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

function getDomain(url) {
    if (!url || url === "N/A" || url.startsWith("mailto:")) return null;
    try { return new URL(url).hostname.replace("www.", ""); } catch(_) { return null; }
}

// Full 277-agency master list
const MASTER = [
  { name: "Storm Management", category: "High Fashion & Editorial", url: "https://www.stormmanagement.com/apply-step-1/", method: "Multi-step Form", bot: "Standard" },
  { name: "IMG Models London", category: "High Fashion & Editorial", url: "https://getscouted.imgmodels.com/", method: "Wizard / Multi-step", bot: "High" },
  { name: "Elite Model Management London", category: "High Fashion & Editorial", url: "https://www.elitemodel.co.uk/get-scouted.web", method: "Wizard / Selector", bot: "Medium" },
  { name: "Models 1", category: "High Fashion & Editorial", url: "https://www.models1.co.uk/apply/", method: "SPA or Form", bot: "Medium" },
  { name: "Select Model Management", category: "High Fashion & Editorial", url: "https://www.selectmodel.com/apply", method: "Wizard", bot: "Medium/High" },
  { name: "Premier Model Management", category: "High Fashion & Editorial", url: "https://www.premiermodelmanagement.com/become-a-model/", method: "Form", bot: "Standard" },
  { name: "The Squad Management", category: "High Fashion & Editorial", url: "https://www.thesquadmanagement.com/join", method: "Form or Email", bot: "Standard" },
  { name: "TESS Management", category: "High Fashion & Editorial", url: "https://www.tessmanagement.com/contact/", method: "Form", bot: "Standard" },
  { name: "Linden Staub", category: "High Fashion & Editorial", url: "https://www.lindenstaub.com/apply", method: "Form", bot: "Standard" },
  { name: "PRM Agency", category: "High Fashion & Editorial", url: "https://www.prm-agency.com/become-a-model", method: "Form or Email", bot: "Standard" },
  { name: "Body London", category: "High Fashion & Editorial", url: "https://www.bodylondon.com/join-us", method: "Form", bot: "Standard" },
  { name: "Bridge Models", category: "High Fashion & Editorial", url: "https://www.bridgemodels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Crumb Agency", category: "High Fashion & Editorial", url: "mailto:apply@crumbagency.com", method: "Email", bot: "N/A" },
  { name: "First Model Management", category: "High Fashion & Editorial", url: "https://www.firstmodelmanagement.co.uk/join-us", method: "Form", bot: "Standard" },
  { name: "Grey Model Agency", category: "High Fashion & Editorial", url: "https://greymodelagency.com/apply", method: "Form", bot: "Standard" },
  { name: "IMM Models", category: "High Fashion & Editorial", url: "https://www.immmodels.com/become-a-model", method: "Form", bot: "Standard" },
  { name: "Boss Model Management", category: "High Fashion & Editorial", url: "https://www.bossmodelmanagement.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Kult London", category: "High Fashion & Editorial", url: "https://www.kultlondon.uk/become-a-model", method: "Form / Email", bot: "Standard" },
  { name: "Mrs Robinson Management", category: "High Fashion & Editorial", url: "mailto:mrsrobinson@mrsrobinsonmanagement.co.uk", method: "Email", bot: "N/A" },
  { name: "Named Models", category: "High Fashion & Editorial", url: "mailto:apply@namedmodels.com", method: "Email", bot: "N/A" },
  { name: "Profile Models", category: "High Fashion & Editorial", url: "https://www.profile-models.com/apply", method: "Form", bot: "Standard" },
  { name: "Established Models", category: "High Fashion & Editorial", url: "https://www.establishedmodels.com/become-a-model", method: "Form", bot: "Standard" },
  { name: "Zebedee Management", category: "High Fashion & Editorial", url: "https://www.zebedeemanagement.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Supa Model Management", category: "High Fashion & Editorial", url: "mailto:Info@supamodelmanagement.com", method: "Email", bot: "N/A" },
  { name: "Anti-Agency", category: "High Fashion & Editorial", url: "mailto:casting@antiagency.co.uk", method: "Email", bot: "N/A" },
  { name: "Ugly Models", category: "High Fashion & Editorial", url: "https://www.ugly.org/wanabee", method: "Form", bot: "Standard" },
  { name: "D1 Models", category: "High Fashion & Editorial", url: "mailto:scout@d1models.com", method: "Email", bot: "N/A" },
  { name: "W Model Management", category: "Commercial & Lifestyle", url: "https://www.wmgmt.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Forte Model Management", category: "Commercial & Lifestyle", url: "https://www.fortemodelmanagement.com/apply", method: "Form", bot: "Standard" },
  { name: "MiLK Management", category: "Commercial & Lifestyle", url: "https://www.milkmanagement.co.uk/apply/", method: "Form", bot: "Standard" },
  { name: "Wilhelmina Models London", category: "Commercial & Lifestyle", url: "https://www.wilhelmina.com/become-a-model/", method: "Form", bot: "Medium" },
  { name: "Nevs Model Agency", category: "Commercial & Lifestyle", url: "https://www.nevsmodels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "MOT Models", category: "Commercial & Lifestyle", url: "mailto:models@motmodel.com", method: "Email", bot: "N/A" },
  { name: "Sandra Reynolds Agency", category: "Commercial & Lifestyle", url: "https://www.sandrareynolds.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "BMA Models", category: "Commercial & Lifestyle", url: "https://www.bmamodels.com/apply", method: "Form", bot: "Standard" },
  { name: "Base Models", category: "Commercial & Lifestyle", url: "https://www.basemodels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Vision Models London", category: "Commercial & Lifestyle", url: "https://www.vision-models.com/join-us", method: "Form / Upload", bot: "Standard" },
  { name: "Brother Models", category: "Commercial & Lifestyle", url: "https://www.brothermodels.com/contact", method: "Form or Email", bot: "Standard" },
  { name: "Present Model Management", category: "Commercial & Lifestyle", url: "https://www.presentmodelmanagement.com/be-discovered", method: "Form", bot: "Standard" },
  { name: "777 Casting", category: "Commercial & Lifestyle", url: "mailto:contact@777casting.com", method: "Email", bot: "N/A" },
  { name: "Source Models", category: "Commercial & Lifestyle", url: "https://www.sourcemodels.co.uk/apply-to-join", method: "Form", bot: "Standard" },
  { name: "Fresh Agents", category: "Commercial & Lifestyle", url: "https://www.freshagents.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "MK Model Management", category: "Commercial & Lifestyle", url: "mailto:info@mkmodelmanagement.com", method: "Email", bot: "N/A" },
  { name: "Bame Models", category: "Commercial & Lifestyle", url: "https://www.bamemodels.com/apply", method: "Form", bot: "Standard" },
  { name: "Grace & Galor", category: "Commercial & Lifestyle", url: "mailto:children@graceandgalor.com", method: "Email", bot: "N/A" },
  { name: "Bruce and Brown", category: "Commercial & Lifestyle", url: "mailto:newapplicant@bruceandbrown.com", method: "Email", bot: "N/A" },
  { name: "Norrie Carr Agency", category: "Commercial & Lifestyle", url: "mailto:info@norriecarr.com", method: "Email", bot: "N/A" },
  { name: "Scallywags Agency", category: "Commercial & Lifestyle", url: "https://www.scallywags.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Ray & Robin", category: "Commercial & Lifestyle", url: "https://www.rayandrobin.com/apply", method: "Form", bot: "Standard" },
  { name: "Actual Talent", category: "Commercial & Lifestyle", url: "mailto:info@actualtalent.co.uk", method: "Email", bot: "N/A" },
  { name: "J'adore Models Manchester", category: "Regional", url: "https://www.jadoremodels.co.uk/apply", method: "Form / Email / Walk-in", bot: "Standard" },
  { name: "Industry Model Management", category: "Regional", url: "mailto:MODEL@INDUSTRYMODELS.CO.UK", method: "Email", bot: "N/A" },
  { name: "Manchester Model Agency (MMA)", category: "Regional", url: "https://www.manchestermodelagency.com/join-us", method: "Form", bot: "Standard" },
  { name: "Nemesis Models", category: "Regional", url: "https://www.nemesismodels.com/apply", method: "Form", bot: "Standard" },
  { name: "Mustard Models", category: "Regional", url: "https://www.mustardmodels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Colours Agency", category: "Regional", url: "https://www.coloursagency.com/apply", method: "Form", bot: "Standard" },
  { name: "Model Team", category: "Regional", url: "mailto:models@modelteam.co.uk", method: "Email", bot: "N/A" },
  { name: "Tartan Models", category: "Regional", url: "https://www.tartanmodels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Gingersnap Models", category: "Regional", url: "https://www.gingersnap.co.uk/become-a-model", method: "Form", bot: "Standard" },
  { name: "Catwalk Model Management", category: "Regional", url: "https://www.catwalk-models.co.uk/application-form/", method: "Form", bot: "Standard" },
  { name: "Maverick Models", category: "Regional", url: "https://www.maverickmodels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Alan Sharman Agency", category: "Regional", url: "mailto:info@alansharmanagency.com", method: "Email", bot: "N/A" },
  { name: "PHA Model Management", category: "Regional", url: "https://www.pha-agency.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "VAUHAUS", category: "Regional", url: "https://www.vauhaus.co.uk", method: "Open Call Only", bot: "N/A" },
  { name: "Talent Management", category: "Regional", url: "https://www.talentmanagement.com/register/", method: "Form", bot: "Standard" },
  { name: "Junction 8 Models", category: "Regional", url: "https://www.junction8model.com/register", method: "Form", bot: "Standard" },
  { name: "Bonnie & Betty", category: "Regional", url: "https://www.bonnieandbetty.com/join", method: "Form", bot: "Standard" },
  { name: "HF Management", category: "Regional", url: "https://www.hfmgmt.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Daisy & Dukes", category: "Regional", url: "https://www.daisyanddukes.com/join-us", method: "Form", bot: "Standard" },
  { name: "Uni-versal Extras", category: "Regional", url: "https://www.universalextras.co.uk", method: "Mobile App / Online Profile", bot: "Standard" },
  { name: "Casting Collective", category: "Regional", url: "https://www.castingcollective.co.uk/artistes/urgent-casting-calls", method: "Online Form", bot: "Standard" },
  { name: "Real People Casting", category: "Regional", url: "https://www.realpeople.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Mentor Model Agency", category: "Regional", url: "https://www.mentormodelagency.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Develop Model Management", category: "Regional", url: "https://www.develop-models.com/apply", method: "Form", bot: "Standard" },
  { name: "All Talent Agency", category: "Regional", url: "https://www.alltalentagency.co.uk/apply", method: "Form / Email", bot: "Standard" },
  { name: "FAD Models", category: "Regional", url: "https://www.fadmodels.co.uk/apply", method: "Form / Walk-in", bot: "Standard" },
  { name: "AS Agency", category: "Regional", url: "https://www.asagency.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Phoenix Casting", category: "Regional", url: "https://www.phoenixcasting.tv/apply", method: "Portal", bot: "Portal login" },
  { name: "West Model Management", category: "Regional", url: "https://www.westmodelmanagement.com/apply", method: "Form", bot: "Standard" },
  { name: "Code 3 Models", category: "Regional", url: "https://www.code3models.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Emkai Models (94Models)", category: "Regional", url: "https://www.94models.com/contact", method: "Contact Form / Email", bot: "Standard" },
  { name: "Twenty Five Model Mgmt", category: "Regional", url: "mailto:info@25modelmanagement.com", method: "Email", bot: "N/A" },
  { name: "Casting South West", category: "Regional", url: "https://www.castingsouthwest.co.uk", method: "Contact Check", bot: "N/A" },
  { name: "South West Talent", category: "Regional", url: "https://www.southwesttalent.co.uk/apply", method: "Contact / Form", bot: "Standard" },
  { name: "Mosaic Model Management", category: "Regional", url: "https://www.mosaicmodels.co.uk/apply", method: "Form / Email", bot: "Standard" },
  { name: "Power Model Management", category: "Regional", url: "mailto:info@powermodels.co.uk", method: "Email", bot: "N/A" },
  { name: "Moonwind Modelling", category: "Regional", url: "mailto:info@moonwind.co.uk", method: "Email", bot: "N/A" },
  { name: "Bizzy Kidz Agency", category: "Child & Teen", url: "https://bizzykidz.com/apply-to-join/", method: "Form", bot: "Standard" },
  { name: "Urban Angels", category: "Child & Teen", url: "https://www.urbanangelsagency.com/apply", method: "Form", bot: "Standard" },
  { name: "Kids London", category: "Child & Teen", url: "https://www.kidslondonltd.com/how-to-apply", method: "Form", bot: "Standard" },
  { name: "Ology Kids Casting", category: "Child & Teen", url: "https://www.ologykidscasting.com/apply", method: "Form + Assessment", bot: "Standard" },
  { name: "ACA Models", category: "Child & Teen", url: "https://www.acamodels.com/apply", method: "Form", bot: "Standard" },
  { name: "Nova Eire", category: "Child & Teen", url: "https://www.novaeire.com/apply", method: "Form", bot: "Standard" },
  { name: "Style Academy", category: "Child & Teen", url: "mailto:info@styleacademy.com", method: "Email", bot: "N/A" },
  { name: "Shelley Lowry Talent", category: "Child & Teen", url: "mailto:submissions@shelleylowry.com", method: "Email", bot: "N/A" },
  { name: "Alphabet Kidz", category: "Child & Teen", url: "https://www.alphabetkidz.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Tiny Angels", category: "Child & Teen", url: "https://www.tinyangels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Childsplay", category: "Child & Teen", url: "https://childsplayclothing.com/pages/model-search", method: "Form", bot: "Standard" },
  { name: "MA4B Baby Models", category: "Child & Teen", url: "https://www.modelagency4baby.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Fit Angels", category: "Child & Teen", url: "https://www.fitangels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Bizzykidz Agency", category: "Child & Teen", url: "https://www.bizzykidzagency.com/apply", method: "Form", bot: "Standard" },
  { name: "KidsTalent", category: "Child & Teen", url: "https://www.kidstalent.agency/apply", method: "Form", bot: "Standard" },
  { name: "GModels", category: "Niche Specialist", url: "mailto:lisa@gmodels.co.uk", method: "Email", bot: "N/A" },
  { name: "Oxygen Models", category: "Niche Specialist", url: "https://www.oxygenmodels.com/apply", method: "Form", bot: "Standard" },
  { name: "Viva Model Management", category: "Niche Specialist", url: "mailto:london@viva-london.com", method: "Email", bot: "N/A" },
  { name: "Next Management London", category: "Niche Specialist", url: "https://www.nextmanagement.com/be-discovered", method: "Form", bot: "Standard" },
  { name: "Salt Model Management", category: "Niche Specialist", url: "https://www.saltmodelmanagement.com/become-a-model", method: "Form", bot: "Standard" },
  { name: "TTM Management", category: "Niche Specialist", url: "https://www.ttmmanagement.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "The Hive Management", category: "Niche Specialist", url: "https://www.thehivemanagement.com/be-discovered", method: "Form", bot: "Standard" },
  { name: "Real People Agency", category: "Niche Specialist", url: "mailto:agency@realpeople.co.uk", method: "Email", bot: "N/A" },
  { name: "11:14 Agency", category: "Niche Specialist", url: "mailto:hi@1114agency.com", method: "Email", bot: "N/A" },
  { name: "Salt & Pepper Models", category: "Niche Specialist", url: "https://www.saltandpeppermodels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Zone Models", category: "Niche Specialist", url: "https://www.zone-models.com/apply", method: "Form", bot: "Standard" },
  { name: "Elliott Brown Agency", category: "Niche Specialist", url: "https://www.elliottbrownagency.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Maureen Martin Models", category: "Niche Specialist", url: "mailto:info@maureenmartinmodels.co.uk", method: "Email", bot: "N/A" },
  { name: "W Athletic", category: "Niche Specialist", url: "http://www.wathletic.com/contact-us/", method: "Email / Contact", bot: "N/A" },
  { name: "Sports Models UK", category: "Niche Specialist", url: "https://www.sportsmodels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "M Models Management", category: "Niche Specialist", url: "https://www.m-models.co.uk/apply-now", method: "Form", bot: "Standard" },
  { name: "Mustard Model Agency", category: "Niche Specialist", url: "https://www.bigmustard.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Alpha Agency", category: "Niche Specialist", url: "https://www.alphaagency.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "New Idol Models", category: "Niche Specialist", url: "https://www.newidolmodel.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Emmjs Model Management", category: "Niche Specialist", url: "https://www.emmjsmodelmanagement.co.uk/contact", method: "Form/Contact", bot: "Standard" },
  { name: "SHH Talent", category: "Niche Specialist", url: "https://www.shhtalent.com/apply", method: "Form", bot: "Standard" },
  { name: "Atlantis Modelling Agency", category: "Niche Specialist", url: "https://www.atlantismodellingagency.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "RMG Models", category: "Niche Specialist", url: "https://www.rmg-models.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Valkyrie Models", category: "Niche Specialist", url: "https://www.valkyriemodels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Blake Models", category: "Niche Specialist", url: "mailto:info@blakemodels.co.uk", method: "Email", bot: "N/A" },
  { name: "Bondi Talent", category: "Niche Specialist", url: "https://www.bonditalent.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "PK Model Agency", category: "Niche Specialist", url: "https://www.pkmodelagency.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Aspire Model Management", category: "Niche Specialist", url: "http://www.aspiremodelmanagement.co.uk/contact", method: "Form/Contact", bot: "Standard" },
  { name: "Eclipse Model Management", category: "Niche Specialist", url: "https://www.eclipsemodelmanagement.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Mentor Model Agency", category: "Niche Specialist", url: "https://www.mentormodelagency.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "DK Models", category: "Niche Specialist", url: "https://www.dkmodels.net/apply", method: "Form", bot: "Standard" },
  { name: "LMP Models", category: "Niche Specialist", url: "https://www.lmpmodels.com/contact", method: "Form/Contact", bot: "Standard" },
  { name: "SSP Agency", category: "Niche Specialist", url: "https://www.sspagency.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Little Red Dog", category: "Niche Specialist", url: "https://www.littlereddog.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Connect Management", category: "Niche Specialist", url: "https://www.connectmgt.com/apply", method: "Form", bot: "Standard" },
  { name: "Bee Talent", category: "Niche Specialist", url: "https://www.beetalent.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Ours Agency", category: "Niche Specialist", url: "mailto:hello@oursagency.co.uk", method: "Email", bot: "N/A" },
  { name: "TwentyTwo Talent", category: "Niche Specialist", url: "https://www.twentytwotalent.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Brood Management", category: "Niche Specialist", url: "mailto:broodapplication@aol.com", method: "Email", bot: "N/A" },
  { name: "Brown and Mills", category: "Niche Specialist", url: "https://www.brownandmills.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "BMA Artists", category: "Niche Specialist", url: "https://www.bmaartists.com/apply", method: "Form", bot: "Standard" },
  { name: "The Bureau", category: "Niche Specialist", url: "https://www.the-bureau.com/apply", method: "Form", bot: "Standard" },
  { name: "In House Models", category: "Niche Specialist", url: "https://www.inhousemodels.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Flair Talent", category: "Niche Specialist", url: "https://www.flairtalent.com/apply", method: "Form", bot: "Standard" },
  { name: "Norrie Carr Agency", category: "Niche Specialist", url: "https://www.norriecarr.com/apply", method: "Form", bot: "Standard" },
  { name: "Superior Model Management", category: "Niche Specialist", url: "https://www.superiormodelmanagement.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Model Team", category: "Niche Specialist", url: "https://www.modelteam.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Fusion Management", category: "Niche Specialist", url: "https://www.fusionmng.com/apply", method: "Form", bot: "Standard" },
  { name: "Hired Hands Models", category: "Niche: Parts & Fittings", url: "https://www.hiredhandsmodels.com/apply", method: "Form", bot: "Standard" },
  { name: "Fittings Division", category: "Niche: Parts & Fittings", url: "https://www.fittingsdivision.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Artimis Fitting Models", category: "Niche: Parts & Fittings", url: "https://www.artimis.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "BMA Hands", category: "Niche: Parts & Fittings", url: "https://www.bmahands.com/apply", method: "Form", bot: "Standard" },
  { name: "Derma Models", category: "Niche: Parts & Fittings", url: "https://www.dermamodels.co.uk/register", method: "Registration Form", bot: "N/A" },
  { name: "The Extras Dept", category: "TV Extras & Casting", url: "https://www.theextrasdept.com/register", method: "Form", bot: "Standard" },
  { name: "Face Model & Casting", category: "TV Extras & Casting", url: "mailto:info@face-agency.co.uk", method: "Email", bot: "N/A" },
  { name: "Wilkins Casting Agency", category: "TV Extras & Casting", url: "mailto:info@wilkinscastingagency.co.uk", method: "Email", bot: "N/A" },
  { name: "Uni-versal Extras", category: "TV Extras & Casting", url: "https://www.universalextras.co.uk/apply", method: "App/Portal", bot: "App-based" },
  { name: "Ray Knight Casting", category: "TV Extras & Casting", url: "https://www.rayknight.co.uk/apply", method: "Portal", bot: "Login wall" },
  { name: "The Casting Collective", category: "TV Extras & Casting", url: "https://www.castingcollective.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Two 10 Casting", category: "TV Extras & Casting", url: "https://www.two10casting.com/apply", method: "Portal", bot: "Portal login" },
  { name: "Extra People", category: "TV Extras & Casting", url: "https://www.extra-people.com/apply", method: "Portal", bot: "Portal login" },
  { name: "Piece of Cake Casting", category: "TV Extras & Casting", url: "https://www.pieceofcakecasting.com/apply", method: "Form", bot: "Standard" },
  { name: "ZBD Talent", category: "TV Extras & Casting", url: "https://www.zbdtalent.com/apply", method: "Form", bot: "Standard" },
  { name: "Rachel's People", category: "TV Extras & Casting", url: "https://www.rachelspeople.co.uk/apply", method: "Contact", bot: "Standard" },
  { name: "Impact Models", category: "TV Extras & Casting", url: "mailto:apply@impactmodelsagency.co.uk", method: "Email", bot: "N/A" },
  { name: "Model Students", category: "TV Extras & Casting", url: "https://www.modelstudents.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Creative Casting", category: "TV Extras & Casting", url: "https://www.creativecasting.tv/register", method: "Form", bot: "Standard" },
  { name: "Envisage Casting", category: "TV Extras & Casting", url: "https://www.envisagecastingagency.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Casting Tree", category: "TV Extras & Casting", url: "https://www.castingtree.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Take 1 Casting", category: "TV Extras & Casting", url: "https://www.take1casting.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "The Eye Casting", category: "TV Extras & Casting", url: "https://www.theeyecasting.com/join", method: "Form", bot: "Standard" },
  { name: "Atlantis Modelling", category: "Micro Boutique", url: "https://www.atlantismodelling.com/apply", method: "Form", bot: "Standard" },
  { name: "Executional", category: "Micro Boutique", url: "https://www.executional.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Mint People", category: "Micro Boutique", url: "https://www.mint-people.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Splendid", category: "Micro Boutique", url: "https://www.splendid.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Iconic Faces Collective", category: "Micro Boutique", url: "https://www.iconicfacescollective.com/apply", method: "Form", bot: "Standard" },
  { name: "ZJELL Model Agency", category: "Micro Boutique", url: "https://www.zjell.com/apply", method: "Form", bot: "Standard" },
  { name: "Nova Artists", category: "Micro Boutique", url: "https://www.novaartists.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Belfast Talent", category: "Micro Boutique", url: "mailto:diane@belfasttalent.com", method: "Email", bot: "N/A" },
  { name: "Capulet", category: "Micro Boutique", url: "https://www.capulet.co.uk/apply", method: "Contact", bot: "Standard" },
  { name: "Gilbert & Payne", category: "Micro Boutique", url: "https://www.gilbertandpayne.com/apply", method: "Contact", bot: "Standard" },
  { name: "Michelle Blair Management", category: "Micro Boutique", url: "https://www.michelleblairmanagement.co.uk/apply", method: "Contact", bot: "Standard" },
  { name: "Mostyn & Cross", category: "Micro Boutique", url: "https://www.mostynandcross.com/apply", method: "Contact", bot: "Standard" },
  { name: "Nic Knight Management", category: "Micro Boutique", url: "https://www.nicknightmanagement.com/apply", method: "Contact", bot: "Standard" },
  { name: "Hemingways", category: "Micro Boutique", url: "mailto:info@hemingways.co.uk", method: "Email", bot: "N/A" },
  { name: "Glenbeigh Models", category: "Micro Boutique", url: "mailto:info@glenbeighmodels.co.uk", method: "Email", bot: "N/A" },
  { name: "Perception Models", category: "Micro Boutique", url: "https://www.perceptionmodels.com/apply", method: "Form", bot: "Standard" },
  { name: "Ulla Models", category: "Micro Boutique", url: "https://www.ullamodels.com/apply", method: "Form", bot: "Standard" },
  { name: "Go-Models UK", category: "Micro Boutique", url: "https://www.go-models.com/apply", method: "Portal", bot: "Standard" },
  { name: "Freelancer Club", category: "Micro Boutique", url: "https://www.freelancerclub.net/apply", method: "Portal", bot: "Standard" },
  { name: "Chapter Management", category: "Micro Boutique", url: "https://www.chaptermgmt.co.uk/contact", method: "Contact Form / Email", bot: "Standard" },
  { name: "Flair Events", category: "Promo & Event Staff", url: "https://www.eventstaffing.co.uk/join-us", method: "Form", bot: "Standard" },
  { name: "Push Promotions", category: "Promo & Event Staff", url: "https://www.pushpromotions.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Elpromotions", category: "Promo & Event Staff", url: "https://www.elpromotions.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Tidy Promotions", category: "Promo & Event Staff", url: "https://www.tidypromo.com/join", method: "Form", bot: "Standard" },
  { name: "Event Staffing Agency", category: "Promo & Event Staff", url: "https://www.eventsstaffingagency.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Host Staffing", category: "Promo & Event Staff", url: "https://www.host-staffing.co.uk/apply", method: "Form", bot: "Standard" },
  { name: "Platinum Promotions", category: "Promo & Event Staff", url: "https://www.platinum-promotions.co.uk/apply", method: "Form", bot: "Standard" },
];

// Dedupe by domain (keep first occurrence which has better category info)
function dedupeByDomain(list) {
    const seen = new Set();
    return list.filter(a => {
        const d = getDomain(a.url);
        const key = d || a.url; // for mailto use the full url
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

(async () => {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  SYNC — 277-Agency Master List                 ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    const uniqueMaster = dedupeByDomain(MASTER);
    console.log("Master list: " + MASTER.length + " entries (" + uniqueMaster.length + " unique)\n");

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

    let updated = 0, inserted = 0, emailOnly = 0, skipped = 0;

    // Process each master entry
    for (const entry of uniqueMaster) {
        const domain = getDomain(entry.url);
        const isEmail = entry.url && entry.url.startsWith("mailto:");
        const isNA = !entry.url || entry.url === "N/A";

        if (isNA) { skipped++; continue; }

        const existingAgency = domain ? byDomain[domain] : null;

        if (existingAgency) {
            // Update with category, method, bot protection
            const updateData = {
                category: entry.category,
                application_method: entry.method,
                bot_protection: entry.bot,
                name: entry.name, // use the master list name
            };
            // Update URL if it differs
            const curUrl = (existingAgency.application_url || "").replace(/\/+$/, "");
            const newUrl = entry.url.replace(/\/+$/, "");
            if (curUrl !== newUrl && !isEmail) {
                updateData.application_url = entry.url;
                updateData.selector_map = null; // clear for re-mapping
            }

            const { error } = await sb.from("agencies").update(updateData).eq("id", existingAgency.id);
            if (!error) updated++;
            else console.log("  ❌ Update " + entry.name + ": " + error.message);
        } else {
            // New agency — insert
            const insertData = {
                name: entry.name,
                application_url: isEmail ? null : entry.url,
                website_url: isEmail ? null : (domain ? "https://" + domain : null),
                location: "UK",
                status: "active",
                category: entry.category,
                application_method: entry.method,
                bot_protection: entry.bot,
            };
            // For email-only, store the email in description
            if (isEmail) {
                insertData.description = "Email: " + entry.url.replace("mailto:", "");
                insertData.application_url = entry.url;
            }

            const { error } = await sb.from("agencies").insert(insertData);
            if (!error) {
                inserted++;
                if (isEmail) emailOnly++;
            } else {
                console.log("  ❌ Insert " + entry.name + ": " + error.message);
            }
        }
    }

    // Final count
    const { count } = await sb.from("agencies")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

    console.log("\n═══════════════════════════════════════════════════");
    console.log("📊 SYNC RESULTS");
    console.log("═══════════════════════════════════════════════════");
    console.log("  🔄 Updated existing: " + updated);
    console.log("  ✨ New agencies added: " + inserted + " (" + emailOnly + " email-only)");
    console.log("  ⏭️  Skipped (N/A): " + skipped);
    console.log("  📦 Total active agencies: " + count);

    // Category breakdown
    const { data: allAgencies } = await sb.from("agencies")
        .select("category, application_method")
        .eq("status", "active");

    const cats = {};
    const methods = {};
    allAgencies.forEach(a => {
        cats[a.category || "Uncategorized"] = (cats[a.category || "Uncategorized"] || 0) + 1;
        methods[a.application_method || "Unknown"] = (methods[a.application_method || "Unknown"] || 0) + 1;
    });

    console.log("\n── By Category ──────────────────────────────────");
    Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log("  " + v + "  " + k));

    console.log("\n── By Method ────────────────────────────────────");
    Object.entries(methods).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log("  " + v + "  " + k));

    console.log("\n═══════════════════════════════════════════════════\n");
    process.exit(0);
})();
