#!/bin/bash
# map_remaining.sh — Process remaining unmapped agencies one by one
# Each runs in its own process so a crash doesn't stop the loop

cd "$(dirname "$0")"

# agency_id | url pairs for unmapped agencies (https first, http last)
AGENCIES=(
  "4c2aabfc-b313-4831-a490-6b602148d6a6|https://www.beetalent.co.uk/apply"
  "a2deedd9-0cae-47b1-8a13-a4effe653202|https://www.capulet.co.uk/apply"
  "10cd3534-3a4a-4cc0-9af4-ee4c0c6313f1|https://www.fortemodelmanagement.com/apply"
  "47e82e6f-bd1a-40a7-9203-cf86192b56b0|https://www.littlereddog.co.uk/apply"
  "030e705d-80ad-4d67-9540-9a56665b51fc|https://www.lmpmodels.com/contact"
  "f4133d5f-0484-42a8-97d1-c59ab17a2408|https://www.manchestermodelagency.com/join-us"
  "ce6429cb-71e0-49d8-9978-d791449d911f|https://www.mentormodelagency.co.uk/apply"
  "6b75d4c7-1e60-4ccf-8c50-33582d4463ee|https://www.mustardmodels.co.uk/apply"
  "abdd0015-c5be-4f0d-b7c9-5bce8c9026ed|https://www.prm-agency.com/become-a-model"
  "8941b874-b664-4707-b6f1-76100fd28d2f|https://www.sportsmodels.co.uk/apply"
  "4b9b8d59-03f9-45f0-9c29-fea64af96aa4|https://www.superiormodelmanagement.co.uk/apply"
  "0cd747c0-2b83-4b93-913c-3b23ed4debc6|https://www.tinyangels.co.uk/apply"
  "083edd2e-a785-48b6-81df-71677dc69001|https://www.ullamodels.com/apply"
  "0cf14e4d-6e30-4b0c-b350-026751d03fd7|https://www.atlantismodelling.com/apply"
  "9e173ee3-1df9-4145-8807-ae0c230623b3|http://www.aspiremodelmanagement.co.uk/contact"
  "2a95f00f-1e1c-440a-b1d8-2318a88da187|http://www.wathletic.com/contact-us/"
)

total=${#AGENCIES[@]}
success=0
failed=0

echo "═══════════════════════════════════════════"
echo "  Mapping $total remaining agencies"
echo "═══════════════════════════════════════════"

for i in "${!AGENCIES[@]}"; do
  IFS='|' read -r id url <<< "${AGENCIES[$i]}"
  n=$((i + 1))
  echo ""
  echo "[$n/$total] $url"
  echo "────────────────────────────────────────"

  # Run map_one.js; || true ensures we always continue on failure/crash
  node map_one.js "$id" "$url" && {
    echo "  ✅ Success"
    ((success++))
  } || {
    echo "  ❌ Failed"
    ((failed++))
  }

  # Brief pause between agencies
  sleep 3
done

echo ""
echo "═══════════════════════════════════════════"
echo "  Done: $success success, $failed failed"
echo "═══════════════════════════════════════════"
