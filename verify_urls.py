
import requests
import time
import json

candidates = [
    # High Confidence / Found in snippets
    "https://www.thehivemanagement.com",
    "https://www.presentmodelmanagement.com",
    "https://www.boundary-london.com",
    "https://www.brothermodels.com",
    "https://www.rmg-models.co.uk",
    "https://www.atlantismodellingagency.co.uk",
    "https://www.evolvemodel.com",
    "https://www.flairtalent.com",
    "https://www.bigmustard.co.uk",
    "https://www.modelmode.co.uk",
    "https://www.vauhaus.co.uk",
    "https://www.modelsdirect.com",
    "https://www.maverickmodels.co.uk",
    "https://www.coloursagency.com",
    "https://www.modelteam.co.uk",
    "https://www.alltalentagency.co.uk",
    "https://www.tartanmodels.co.uk",
    "https://www.d1models.com",
    "https://www.supamodelmanagement.com",
    "https://www.oxygenmodels.com",
    "https://www.establishedmodels.com",
    "https://www.lenisagency.com",
    "https://www.duomodelmgmt.com",
    "https://www.bridgeagency.com",
    "https://www.1114agency.com", 
    "https://www.twtmgmt.com", 
    "https://www.perceptionmodels.com", 
    "https://www.jemmodels.com", 
    "https://www.muumaa.com", 
    "https://www.thescoutingfirm.com",  
    "https://www.anonmodels.com", 
    "https://www.citizenmodels.com",
    "https://www.finchimage.com",
    "https://www.memmanagement.com",
    "https://www.paolas.com",
    "https://www.thecrowdmodels.com",
    "https://www.wefolk.com",
    "https://www.apmmodels.com",
    "https://www.mintcasting.co.uk",
    "https://www.littleallstars.co.uk",
    "https://www.7even.co.uk",
    "https://www.realpeople.co.uk",
    "https://www.krmanagement.co.uk",
    "https://www.onemanagement.com",
    "https://www.3mmodels.com",
    "https://www.kmamodels.com",
    "https://www.perspectivemanagement.com",
    "https://www.fmkmodelling.com",
    "https://www.elysianstudio.co.uk",
    "https://www.nbrepresentation.co.uk",
    "https://www.top-ex.com", 
    "https://www.revoltmodelagency.com", 
    "https://www.mamimanagement.com", 
    "https://www.chaptermanagement.com",
    "https://www.menacemodelmanagement.com",
    "https://www.xdirectn.com",
    "https://www.storymodelmanagement.com",
    "https://www.namedmodels.com",
    "https://www.titaniummanagement.com",
    "https://www.amckmodels.com",
    "https://www.genesismodels.co.uk",
    "https://www.swaymodels.co.uk"
]

# Known list to exclude
known_keywords = [
    "stormmanagement", "elitemodel", "models1", "premiermodelmanagement", 
    "selectmodel", "imgmodels", "wilhelmina", "tessmanagement", 
    "milkmanagement", "viva-paris", "immmodels", "motmodel", 
    "zone-models", "visionmodels", "basemodels", "prm-agency", 
    "nevsmodels", "thesquadmanagement", "crumbagency", "antiagency", 
    "firstmodelmanagement", "lindenstaub", "wmodel", "bmamodels", 
    "sandrareynolds", "bodylondon", "fortemodelmanagement", "gingersnap", 
    "bamemodels", "zebedeetalent", "ugly", "contactmodels", 
    "bossmodelmanagement", "industrymodels", "jadoremodels", 
    "nemesismodels", "savagemanagement", "immagencygroup", 
    "profile-models", "hastings-management", "oxfordmodels", 
    "graceandgalor", "bonnieandbetty", "scallywags", "sourcemodels"
]

valid_new = []

print(f"Checking {len(candidates)} candidates...")

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

for url in candidates:
    # Check if known
    is_known = False
    for k in known_keywords:
        if k in url:
            is_known = True
            break
    if is_known:
        print(f"SKIPPING KNOWN: {url}")
        continue

    try:
        # Just HEAD request with timeout
        r = requests.head(url, headers=headers, timeout=5, allow_redirects=True)
        if r.status_code < 400 or r.status_code == 403:
             # 403 often means "exists but bot protection" - accept it for now as "found"
            print(f"VALID: {url} ({r.status_code})")
            valid_new.append(url)
        elif r.status_code == 404:
             # Try without 'www'
             alt_url = url.replace("www.", "")
             r2 = requests.head(alt_url, headers=headers, timeout=5, allow_redirects=True)
             if r2.status_code < 400 or r2.status_code == 403:
                 print(f"VALID ALT: {alt_url} ({r2.status_code})")
                 valid_new.append(alt_url)
             else:
                 print(f"INVALID: {url} ({r.status_code})")
        else:
            print(f"INVALID: {url} ({r.status_code})")
    except Exception as e:
        print(f"ERROR: {url} - {e}")
    
    time.sleep(0.1)

print("\n--- FINAL JSON LIST ---")
print(json.dumps(valid_new))
