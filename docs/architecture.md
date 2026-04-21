# Architecture

## Overview

Gmail Focus Assistant is a hybrid system:

1. **Rules-first ingestion**
   - sender/domain checks
   - Gmail categories
   - known allowlists and blocklists
   - manual workflow label preservation

2. **Priority classification**
   - action needed
   - important service/finance/shipping/calendar/opportunity
   - commercial and low priority
   - ambiguous review bucket

3. **Optional AI layer**
   - used only for ambiguous mail
   - summarization and response drafting only where useful
   - never auto-send

4. **Digest layer**
   - morning and optional evening summaries
   - user-facing surfacing of what matters

## Design goals

- First glance should emphasize truly important mail
- Low-value mail should leave the inbox automatically
- Important transactional mail should remain visible
- Personal and manual labels should always win over automation
- Every automation should be explainable and easy to tune

## Safety model

- Rules run before AI
- AI is never the only source of truth for critical flows
- Drafts only, no autonomous sending
- Logging for actions and AI decisions
- Small rollout with tuning after observation

## Main components

### Gmail labels
Core labels will encode workflow state and priority.

### Google Apps Script
Handles Gmail reads, labeling, archiving, digests, and optional draft creation.

### Config layer
Stores sender/domain exceptions, thresholds, and policy decisions.

### Logs
Sheet-based or file-based logging for audit and tuning.

## Suggested workflow

- On schedule, inspect recent inbox threads
- Apply deterministic rules
- Archive obvious commercial clutter
- Preserve visible important mail
- Send ambiguous items to review or AI classification
- Produce summary digest
