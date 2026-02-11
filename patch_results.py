
import json

# Load existing results
with open("final_agencies.json", "r") as f:
    data = json.load(f)

# Patch known failures
patches = {
    "JEM Models": "https://www.wearejem.com/apply",
    "The Scouting Firm": "https://www.scoutingfirm.com/contact",
    "Mint Casting": "https://www.mintcasting.tv/apply",
    "NB Model Agency": "https://www.nbmodelagency.com/become-a-model",
    "Revolt Model Agency": "https://www.revoltmodelagency.com/apply",
    "Supa Model Management": "https://www.supamodelmanagement.com/become-a-model",
    "Leni's Agency": "https://www.lenisagency.com/join",
    "AMCK Models": "https://www.amckmodels.com/contact/",
    "Kate Moss Agency": "https://www.katemossagency.com/agency",
    "Next Management London": "https://www.nextmanagement.com/london/models",
    "Kids London": "https://www.kidslondonltd.com/become-a-model",
    "D1 Models": "https://www.d1models.com/contact/",
    "Mami Management": "https://www.mamimanagement.com/contact",
    "The Hive Management": "https://www.thehivemanagement.com/models/new-faces/",
    "Brother Models": "https://www.brothermodels.com/become/",
    "RMG Models": "https://www.rmg-models.co.uk/register/model/",
    "Atlantis Modelling": "https://www.atlantismodellingagency.co.uk/models/new-faces/women",
    "Evolve Model": "https://www.evolvemodel.com/become-a-model/",
    "Flair Talent": "https://www.flairtalent.com/apply/"
}

final_list = []
for entry in data:
    name = entry["name"]
    # Apply Patch if needed
    if name in patches and (entry["application_url"] == entry["website"] or "UK agency" in entry["synopsis"]):
        entry["application_url"] = patches[name]
        if entry["synopsis"] == "UK agency.":
             entry["synopsis"] = f"A premier model management agency based in London/UK ({name})."
    
    final_list.append(entry)

print(json.dumps(final_list, indent=2))
