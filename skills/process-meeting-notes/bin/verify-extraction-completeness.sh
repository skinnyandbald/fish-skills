#!/usr/bin/env bash
# Verify L10 action items >= expected items after accounting for skipped items
# Usage: verify-extraction-completeness.sh <combined_count> <skipped_count> <l10_file>
#
# combined_count = Fireflies items + additional transcript-extracted items
# skipped_count  = items the user explicitly chose not to track
# l10_file       = path to the generated L10 markdown file

set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "Usage: verify-extraction-completeness.sh <combined_count> <skipped_count> <l10_file>"
  echo "  combined_count: total items from Fireflies + transcript analysis"
  echo "  skipped_count:  items user explicitly chose not to track"
  echo "  l10_file:       path to the generated L10 markdown file"
  exit 1
fi

COMBINED_COUNT="$1"
SKIPPED_COUNT="$2"
L10_FILE="$3"

# Validate that counts are numeric
if ! [[ "$COMBINED_COUNT" =~ ^[0-9]+$ ]]; then
  echo "FAIL: combined_count must be a non-negative integer, got: $COMBINED_COUNT"
  exit 1
fi

if ! [[ "$SKIPPED_COUNT" =~ ^[0-9]+$ ]]; then
  echo "FAIL: skipped_count must be a non-negative integer, got: $SKIPPED_COUNT"
  exit 1
fi

if [ ! -f "$L10_FILE" ]; then
  echo "FAIL: L10 file not found at $L10_FILE"
  exit 1
fi

if [ "$SKIPPED_COUNT" -gt "$COMBINED_COUNT" ]; then
  echo "FAIL: skipped_count ($SKIPPED_COUNT) cannot exceed combined_count ($COMBINED_COUNT)"
  exit 1
fi

EXPECTED=$((COMBINED_COUNT - SKIPPED_COUNT))

# Count checkboxes only within the Action Items section (not the whole file)
# Uses dash-only format to enforce canonical L10 checkbox style (- [ ])
L10_COUNT=$(awk '/^## Action Items/{flag=1; next} /^## /{flag=0} flag' "$L10_FILE" | grep -Ec '^[[:space:]]*-[[:space:]]*\[[ xX]\]' || true)

echo "Combined extraction count (Fireflies + transcript): $COMBINED_COUNT"
echo "Skipped by user: $SKIPPED_COUNT"
echo "Expected in L10: $EXPECTED"
echo "L10 action item count: $L10_COUNT"

if [ "$L10_COUNT" -lt "$EXPECTED" ]; then
  MISSING=$((EXPECTED - L10_COUNT))
  echo "FAIL: L10 is missing $MISSING action item(s)"
  echo "The L10 must contain at least as many items as (combined - skipped)."
  echo "Re-check the transcript analysis and add missing items."
  exit 1
fi

echo "PASS: L10 action item count ($L10_COUNT) >= expected ($EXPECTED)"
exit 0
