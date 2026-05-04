// AUTO-GENERATED from voice-agent/src/arryve_voice_agent/tools.py
// Re-run scripts/sync-tools.sh after editing the voice-agent schemas.
// Schemas mirror automation/src/server.ts FLOWS exactly (snake_case ↔ kebab-case).
// Excluded: tools whose dispatch lives outside automation (Gmail-backed: send_info_email,
//   send_folio_followup_email).

import { Type } from '@google/genai';

export const PMS_TOOL_DECLARATIONS = [
  {
    name: "add_stay_remark",
    description: "Attach a free-text remark to a reservation (late-arrival notes, special requests).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "remark": { type: Type.STRING, description: "Remark body; max 1000 chars." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no mutation \u2014 verify only." }
      },
      required: ["res", "remark"],
    },
  },
  {
    name: "send_confirmation",
    description: "Email the confirmation letter for a reservation. Defaults to the primary email on file.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "emails": { type: Type.ARRAY, description: "Override email recipients; omit to use primary on file.", items: { type: Type.STRING } },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no send." }
      },
      required: ["res"],
    },
  },
  {
    name: "cancel_qualify",
    description: "Check whether a reservation is eligible for cancellation. Pre-confirm step.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." }
      },
      required: ["res"],
    },
  },
  {
    name: "cancel_reasons",
    description: "List the cancellation reason codes applicable for this reservation.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." }
      },
      required: ["res"],
    },
  },
  {
    name: "cancel_reservation",
    description: "Cancel a reservation. Requires explicit confirm=true, fired only AFTER the voice confirm-gate classifies the caller's verbal yes at STT confidence \u2265 0.8.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "reason": { type: Type.STRING, description: "Cancel reason key or {id: uuid}. Use cancel_reasons first to pick." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true; set only after verbal confirm of readback." },
        "remarks": { type: Type.STRING, description: "Operator remarks if the reason requires it." }
      },
      required: ["res", "reason", "confirm"],
    },
  },
  {
    name: "modify_dates",
    description: "Change a reservation's check-in/check-out dates. Fired only AFTER the caller verbally confirms the readback (old vs new dates + price).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "checkIn": { type: Type.STRING, description: "New check-in date YYYY-MM-DD." },
        "checkOut": { type: Type.STRING, description: "New check-out date YYYY-MM-DD." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no mutation." }
      },
      required: ["res", "checkIn", "checkOut"],
    },
  },
  {
    name: "rate_details",
    description: "Read-only snapshot of a reservation's rate, dates, and guest counts. Used for the modify-dates confirm-gate readback.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." }
      },
      required: ["res"],
    },
  },
  {
    name: "search_availability",
    description: "Check bookable rates for a date range.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "checkIn": { type: Type.STRING, description: "YYYY-MM-DD" },
        "checkOut": { type: Type.STRING, description: "YYYY-MM-DD" },
        "adults": { type: Type.INTEGER, description: "Default 1." },
        "children": { type: Type.INTEGER, description: "Default 0." },
        "rooms": { type: Type.INTEGER, description: "Default 1." },
        "maxOffers": { type: Type.INTEGER, description: "Cap the returned offers, default 5." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, return stay dimensions only." }
      },
      required: ["checkIn", "checkOut"],
    },
  },
  {
    name: "search_by_phone",
    description: "Look up reservations by a phone number. Primary caller-identification handshake. Returns ambiguous=true when >1 match \u2014 voice agent must disambiguate by name/dates.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "phone": { type: Type.STRING, description: "Free-form phone; digit-only match is included server-side." },
        "maxResults": { type: Type.INTEGER, description: "Default 5." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: ["phone"],
    },
  },
  {
    name: "read_folio",
    description: "Read a structured snapshot of a reservation's folio \u2014 folio number, total charges (incl. tax), net payments, balance, pending/posted line-item counts. API-first via GET /reservations/{resId}; verified live 2026-04-22. Use for S-59 in-house balance inquiry and the modify/check-out confirm readbacks. PCI-safe: no PAN ever exposed. Per-line descriptions live on the async guest-folio-v2 report and are NOT yet wired \u2014 flow surfaces totals + counts, which are enough for balance readbacks.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, returns empty-folio shape." }
      },
      required: ["res"],
    },
  },
  {
    name: "advanced_search",
    description: "Combined-filter reservation search (name / email / phone / conf# / room# / date range / status). At least one filter required. Used for S-62 failed-booking recovery ('did my reservation go through?') and for disambiguating guests the caller-ID alone can't identify.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "name": { type: Type.STRING, description: "Full name (first + last as a single string)." },
        "firstName": { type: Type.STRING, description: "First name only." },
        "lastName": { type: Type.STRING, description: "Last name only." },
        "email": { type: Type.STRING, description: "Guest email." },
        "phone": { type: Type.STRING, description: "Free-form phone." },
        "confirmationNumber": { type: Type.STRING, description: "HK confirmation number (TK42\u2026)." },
        "roomNumber": { type: Type.STRING, description: "Currently-assigned room number." },
        "checkInFrom": { type: Type.STRING, description: "Check-in window start YYYY-MM-DD." },
        "checkInTo": { type: Type.STRING, description: "Check-in window end YYYY-MM-DD." },
        "status": { type: Type.STRING, description: "BOOKED | CHECKED_IN | DEPARTED | CANCELLED." },
        "maxResults": { type: Type.INTEGER, description: "Default 10." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: [],
    },
  },
  {
    name: "lost_found_search",
    description: "Search the Lost & Found dashboard by date range, status, previous room, or keyword. Powers S-41 post-stay inquiries. Returns matches with {id, status, description, location, roomNumber, lostDate, foundDate} \u2014 voice agent reads back distinguishing details (color, keyword match) to confirm a hit before arranging return.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "status": { type: Type.STRING, description: "ALL | LOST | FOUND. Default ALL." },
        "fromDate": { type: Type.STRING, description: "YYYY-MM-DD; default today-90 days." },
        "toDate": { type: Type.STRING, description: "YYYY-MM-DD; default today." },
        "roomNumber": { type: Type.STRING, description: "Guest's prior room (client-side filter)." },
        "keyword": { type: Type.STRING, description: "Free-text match against description + location." },
        "maxResults": { type: Type.INTEGER, description: "Default 10." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: [],
    },
  },
  {
    name: "modify_room_type",
    description: "Change a reservation's room type (PRE-ARRIVAL only). Fired after the verbal confirm gate. In-house guests return 'not-qualified' \u2014 voice agent warm-transfers per playbook S-35. Pass newRoomTypeCode (e.g. OBUN) or newRoomTypeId; the flow resolves code\u2192UUID via the qualify endpoint.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "newRoomTypeCode": { type: Type.STRING, description: "Target room-type code (OWCN, KBUN, OBUN, CSTN, XOTN, \u2026). Alternative: newRoomTypeId." },
        "newRoomTypeId": { type: Type.STRING, description: "Target room-type UUID." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit." },
        "reason": { type: Type.STRING, description: "Room-move reason (GUEST_REQUEST_UPGRADE | GUEST_REQUEST_MOVE | LOYALTY_COURTESY | OPERATIONAL | MAINTENANCE)." },
        "remarks": { type: Type.STRING, description: "Free-text remark required by HK." },
        "complimentary": { type: Type.BOOLEAN, description: "True for elite / loyalty courtesy upgrade." },
        "skipConfirmationMail": { type: Type.BOOLEAN, description: "Skip the auto-generated confirmation email (default true)." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, qualify + consent only (no commit)." }
      },
      required: ["res", "confirm"],
    },
  },
  {
    name: "attach_loyalty_number",
    description: "Attach an IHG One Rewards / Business Edge membership number to a reservation. Every IHG-member call touches this. Echoes tier + member name for readback. Set lookupOnly=true to pre-validate the number + compute the thank-you line before the confirm gate \u2014 in that mode the flow returns `search-ok` with the resolved tier/name/email and does NOT attach. The attach POST is not yet live-captured; non-lookupOnly calls return `pending-commit-capture` \u2014 warm-transfer per that status.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "membershipNumber": { type: Type.STRING, description: "Digits-only membership number." },
        "program": { type: Type.STRING, description: "IHG_ONE_REWARDS | IHG_BUSINESS_EDGE. Default IHG_ONE_REWARDS." },
        "lookupOnly": { type: Type.BOOLEAN, description: "If true, only run the Phase-1 loyalty lookup (returns search-ok + tier)." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: ["res", "membershipNumber"],
    },
  },
  {
    name: "add_additional_guest",
    description: "Add a named traveller to a reservation so the desk can issue a key. Returns 'over-occupancy' when HK rejects for capacity; voice agent then offers a room-type upsell (S-22). Returns 'invalid-date' when the reservation's check-in is same-day or invalid for adding guests.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "firstName": { type: Type.STRING, description: "First name." },
        "lastName": { type: Type.STRING, description: "Last name." },
        "kind": { type: Type.STRING, description: "ADULT | CHILD. Default ADULT." },
        "email": { type: Type.STRING, description: "Optional." },
        "phone": { type: Type.STRING, description: "Optional." },
        "startDate": { type: Type.STRING, description: "YYYY-MM-DD check-in date. Auto-resolved from the reservation when omitted." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: ["res", "firstName", "lastName"],
    },
  },
  {
    name: "pet_add",
    description: "Add a pet to a reservation. Enforces HIE Red Bank policy (dogs under 50 lb) locally and returns 'over-weight-limit' / 'species-not-allowed' escalation states. Service animals bypass those gates. The per-stay fee is read live from HK's pet-policy endpoint (no hardcoded override).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "petName": { type: Type.STRING, description: "Pet's name." },
        "weightLb": { type: Type.NUMBER, description: "Weight in pounds." },
        "species": { type: Type.STRING, description: "DOG | CAT | OTHER. Default DOG." },
        "serviceAnimal": { type: Type.BOOLEAN, description: "True bypasses weight/species gate + fee; marks as SERVICE ANIMAL in HK." },
        "startDate": { type: Type.STRING, description: "YYYY-MM-DD. Defaults to the reservation's check-in date." },
        "endDate": { type: Type.STRING, description: "YYYY-MM-DD. Defaults to the reservation's check-out date." },
        "folioId": { type: Type.STRING, description: "Override default folio (Folio 1). Rare." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, preview only (no commit)." }
      },
      required: ["res", "petName", "weightLb"],
    },
  },
  {
    name: "addon_add",
    description: "Add a stay addon (crib, bassinet, rollaway) to the reservation. HK returns the addons configured at the property; the fee is live-read (not hardcoded). Returns 'not-configured-at-property' when the property has no a la carte addons, or 'out-of-stock' with availableOptions[] when the requested kind isn't in the qualified list (voice agent can offer alternatives).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "kind": { type: Type.STRING, description: "CRIB | ROLLAWAY | BASSINET." },
        "nights": { type: Type.INTEGER, description: "Optional. Quantity/nights for the addon." },
        "startDate": { type: Type.STRING, description: "YYYY-MM-DD. Defaults to reservation check-in." },
        "endDate": { type: Type.STRING, description: "YYYY-MM-DD. Defaults to reservation check-out." },
        "folioId": { type: Type.STRING, description: "Override default folio (Folio 1). Rare." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, preview only (no commit)." }
      },
      required: ["res", "kind"],
    },
  },
  {
    name: "apply_tax_exempt",
    description: "Apply a tax-exemption code to a reservation (S-11 government per-diem, S-32 in-house tax-exempt). Voice agent should pre-validate by calling with dryRun=true first \u2014 the flow reads HK's `applicable-tax-exempts` endpoint and returns availableCodes[] so you can confirm the guest's code is supported. Returns 'no-active-shift' when the property has no open shift (warm-transfer to desk). Does NOT upload the certificate \u2014 add a Stay Remark noting docs expected.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "exemptionCode": { type: Type.STRING, description: "Exemption code (e.g. OH-GOV-2026)." },
        "exemptionId": { type: Type.STRING, description: "Exemption UUID (alternative to code)." },
        "scope": { type: Type.STRING, description: "RESERVATION (all folios) | FOLIO (specific). Default RESERVATION." },
        "folioId": { type: Type.STRING, description: "Required when scope=FOLIO." },
        "taxTypeIds": { type: Type.ARRAY, description: "Specific tax-type UUIDs. Omit to exempt all taxes.", items: { type: Type.STRING } },
        "remarks": { type: Type.STRING, description: "Optional audit remark." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, only returns availableCodes[]." }
      },
      required: ["res"],
    },
  },
  {
    name: "reinstate_no_show",
    description: "Reinstate a reservation that rolled to No Show by waiving the no-show fee (S-43). Only valid while property's Current Business Date still equals the original check-in date \u2014 otherwise returns `cbd-mismatch` and the agent rebooks. HK may still refuse the waive (past its internal window or already settled) \u2014 `not-qualified` surfaces that so the voice agent warm-transfers. confirm=false returns `qualified` with the no-show verification for the readback; confirm=true commits the PUT /no-show/waive.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "originalCheckIn": { type: Type.STRING, description: "YYYY-MM-DD." },
        "currentBusinessDate": { type: Type.STRING, description: "YYYY-MM-DD (property CBD)." },
        "remark": { type: Type.STRING, description: "Audit-log remark written into sub_status_remark on the reservation." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit the waive." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS mutation." }
      },
      required: ["res", "originalCheckIn", "currentBusinessDate"],
    },
  },
  {
    name: "email_folio",
    description: "Email folio(s) to the guest. Uses primary email on file by default; pass emailOverride (string or array, comma/semicolon separated strings also accepted) for alternate recipients. By default emails ALL folios as a single consolidated PDF (folioView=CONSOLIDATED). Set folioView=SPLIT to get one PDF per folio. Returns 'no-email-on-file' if the reservation lacks a primary email and none was passed \u2014 voice agent: collect an email. invoiceFormat=true is preserved but the Proforma-Invoice path hasn't been captured yet (still routed through the consolidated email endpoint).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "emailOverride": { type: Type.STRING, description: "One or more emails. Array, or comma/semicolon separated." },
        "folioIds": { type: Type.ARRAY, description: "Specific folio UUIDs. Omit to email all folios.", items: { type: Type.STRING } },
        "folioView": { type: Type.STRING, description: "CONSOLIDATED (one PDF) | SPLIT (one per folio). Default CONSOLIDATED." },
        "invoiceFormat": { type: Type.BOOLEAN, description: "Proforma Invoice format (corporate receipts, S-58). Currently routed through the same endpoint." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: ["res"],
    },
  },
  {
    name: "post_charge",
    description: "Post a one-off charge to the folio (PUT /reservations/{res}/charges/execute; verified live 2026-04-22). Validates the code against /charge-types before committing; auto-resolves the default folio via /reservations/{res}. Returns 'code-not-found' + availableCodes[] when the spoken code isn't configured, 'code-inactive' for deprecated codes, 'over-agent-threshold' when the amount exceeds $100 (warm-transfer), or 'no-default-folio' when the reservation has no folios. Confirm-gated: confirm=false returns 'dry-run' with the resolved chargeTypeId + folioId for readback; confirm=true fires the real commit.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "chargeCode": { type: Type.STRING, description: "Charge code (e.g. '1000' or name match)." },
        "chargeTypeId": { type: Type.STRING, description: "Charge-type UUID (alternative to code)." },
        "description": { type: Type.STRING, description: "Optional display label for the folio line." },
        "amountUsd": { type: Type.NUMBER, description: "Amount in USD." },
        "quantity": { type: Type.INTEGER, description: "Quantity; default 1." },
        "postDate": { type: Type.STRING, description: "YYYY-MM-DD; default today." },
        "folioId": { type: Type.STRING, description: "Folio UUID. Omit for auto-resolve to default." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit the charge." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, charge-type lookup + folio resolve only." }
      },
      required: ["res", "amountUsd"],
    },
  },
  {
    name: "adjust_charge",
    description: "Adjust / reduce a disputed folio line (S-39) via POST /reservations/{res}/adjust-charges/v3; verified live 2026-04-22. Under-threshold only ($50 default); over-threshold warm-transfers. Resolves the adjustmentCode (CORRECTION / MANAGER DISCRETION / SERVICE RECOVERY / \u2026) against GET /adjustment-codes/applicable?charge_id=<id>; returns 'no-applicable-policy' + availableCodes when none match. Requires an open shift \u2014 HK 420 maps to 'no-active-shift'. Confirm-gated: confirm=false returns 'qualified' with the resolved codeId; confirm=true fires the POST.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "chargeId": { type: Type.STRING, description: "Folio charge (line) UUID to adjust." },
        "adjustAmountUsd": { type: Type.NUMBER, description: "Adjustment amount in USD." },
        "adjustmentType": { type: Type.STRING, description: "DIRECT_ADJUSTMENT_INCL_TAX (default) | DIRECT_ADJUSTMENT_EXCL_TAX." },
        "reason": { type: Type.STRING, description: "Free-text remark for the audit log." },
        "adjustmentCode": { type: Type.STRING, description: "Keyword match against the applicable list (e.g. 'CORRECTION')." },
        "adjustmentCodeId": { type: Type.STRING, description: "Direct adjustment-code UUID (overrides keyword)." },
        "agentThresholdUsd": { type: Type.NUMBER, description: "Override default $50 threshold." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: ["res", "chargeId", "adjustAmountUsd", "reason", "confirm"],
    },
  },
  {
    name: "housekeeping_work_order",
    description: "Dispatch Housekeeping (S-49/S-50). Resolves roomNumber \u2192 roomId via /dashboard/housekeeping, then for PRIORITY_CLEAN / STAY_OVER_CLEAN fires POST /housekeeping/housekeeping-schedules/mark-dirty {ids} to queue HSK service (verified live 2026-04-22). HK 400 \"Completed schedule is present\" maps to `already-processed` (idempotent no-op). AMENITY_DELIVERY / DND_SET / SKIP_CLEANING commit endpoints still pending \u2014 return `pending-commit-capture` for warm-transfer. Confirm-gated.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "roomNumber": { type: Type.STRING, description: "Room number." },
        "kind": { type: Type.STRING, description: "AMENITY_DELIVERY | PRIORITY_CLEAN | DND_SET | SKIP_CLEANING | STAY_OVER_CLEAN." },
        "description": { type: Type.STRING, description: "Human-readable description." },
        "priority": { type: Type.STRING, description: "URGENT | NORMAL | LOW." },
        "guestWaiting": { type: Type.BOOLEAN, description: "If true, bumps priority to URGENT." },
        "skipDate": { type: Type.STRING, description: "YYYY-MM-DD (for SKIP_CLEANING)." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit the mutation." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: ["roomNumber", "kind", "description"],
    },
  },
  {
    name: "maintenance_work_order",
    description: "Open a Maintenance work order for a room / public area (S-35 / S-56 secondary). API-first end-to-end via POST /maintenance/maintenance-issues/create; verified live 2026-04-22. Category resolves against the GM bucket on /maintenance-codes/applicable; location resolves to an area UUID via /common-areas (or a room UUID via /dashboard/housekeeping when the location is a room number). OUT_OF_SERVICE / flagOos still forces a warm-transfer (supervisor auth). Confirm-gated: confirm=false returns `qualified` with resolved IDs for readback.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "location": { type: Type.STRING, description: "Room # or common-area name (e.g. 'Lobby'). Alternative: use areaId / roomId." },
        "areaId": { type: Type.STRING, description: "Direct HK area UUID (overrides location lookup)." },
        "roomId": { type: Type.STRING, description: "Direct HK room UUID (when location is a specific room)." },
        "category": { type: Type.STRING, description: "HVAC | PLUMBING | ELECTRICAL | FURNITURE | TV_TECH | OTHER." },
        "issueType": { type: Type.STRING, description: "OUT_OF_ORDER | GENERAL_MAINTENANCE | OUT_OF_SERVICE. Default GENERAL_MAINTENANCE. OUT_OF_SERVICE forces warm-transfer (supervisor auth)." },
        "maintenanceCodeId": { type: Type.STRING, description: "Direct HK maintenance-code UUID (overrides category-based lookup). Codes like PLUMBING, TV NOT WORKING, DOOR LOCK BROKEN live inside a bucket (GM/OOO/OOS)." },
        "description": { type: Type.STRING, description: "Human-readable description." },
        "priority": { type: Type.STRING, description: "URGENT | NORMAL | LOW." },
        "activeOccupancy": { type: Type.BOOLEAN, description: "Guest is currently in the room; bumps to URGENT by default." },
        "flagOos": { type: Type.BOOLEAN, description: "True forces warm-transfer (supervisor auth needed to mark room OOS)." },
        "from": { type: Type.STRING, description: "YYYY-MM-DD start date; default today." },
        "to": { type: Type.STRING, description: "YYYY-MM-DD end date; default tomorrow." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit the issue." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: ["category", "description"],
    },
  },
  {
    name: "send_payments_web_link",
    description: "Send a short-lived HK Payments Web Link via SMS so the guest can enter card details on an HK-hosted page. Arvy never hears or logs the PAN. Primary payment path for S-06, S-07, S-08, S-12, S-26, S-60. Runs upfront input validation (invalid-amount, invalid-phone). HK Payments Web Link is not enabled on the training tenant, so real sends return `pending-commit-capture` \u2014 on that status the orchestrator falls back to Twilio Pay.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "amountUsd": { type: Type.NUMBER, description: "Total charge in USD (tax-inclusive)." },
        "phone": { type: Type.STRING, description: "Guest phone (E.164 or free-form)." },
        "description": { type: Type.STRING, description: "Short label shown on the HK payment page." },
        "ttlMinutes": { type: Type.INTEGER, description: "Link TTL; default 15." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no SMS is sent." }
      },
      required: ["res", "amountUsd", "phone"],
    },
  },
  {
    name: "update_payment_source",
    description: "Attach a tokenized card to a reservation's guarantee. Use after successful Web Link capture (webLinkCaptured=true) OR after Twilio Pay fallback returns a token (token + cardLast4). Agent never sees the PAN. Confirm-gated. Commit endpoint not yet live-captured \u2014 real calls return `pending-commit-capture` and the agent warm-transfers.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "token": { type: Type.STRING, description: "Gateway token from Twilio Pay; never a raw PAN." },
        "cardLast4": { type: Type.STRING, description: "Last 4 of the card (for verbal readback + audit)." },
        "webLinkCaptured": { type: Type.BOOLEAN, description: "True after the Web Link webhook has flipped to captured." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: ["res", "confirm"],
    },
  },
  {
    name: "void_authorization",
    description: "Release a pending card authorization (e.g. before swapping to a new card). Already-captured auths require a refund and warm-transfer to desk. Commit endpoint (including the captured-vs-pending check on Authorization History) not yet live-captured \u2014 real calls return `pending-commit-capture` and the agent warm-transfers.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "authorizationId": { type: Type.STRING, description: "The auth id visible on Folio \u2192 Authorization History." },
        "reason": { type: Type.STRING, description: "Audit-log reason." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: ["res", "authorizationId", "reason", "confirm"],
    },
  },
  {
    name: "card_decline_replace",
    description: "Mid-stay card replacement after a decline (S-60). Agent walks the guest through a new card via Web Link or Twilio Pay, then fires this flow to attach the replacement. Same PAN-free invariants as update_payment_source. Wraps update_payment_source; propagates its `pending-commit-capture` status.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "declinedCardLast4": { type: Type.STRING, description: "Last-4 of the declined card." },
        "declineReason": { type: Type.STRING, description: "Gateway decline reason if surfaced." },
        "token": { type: Type.STRING, description: "Gateway token for replacement card." },
        "newCardLast4": { type: Type.STRING, description: "Last-4 of the replacement." },
        "webLinkCaptured": { type: Type.BOOLEAN, description: "True if the replacement came via the Web Link path." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: ["res", "declinedCardLast4", "confirm"],
    },
  },
  {
    name: "create_booking",
    description: "Individual Booking for BAR / Member / AAA / Senior / Gov / Corporate rate plans. New-booking wizard commit NOT yet live-captured \u2014 non-dryRun confirm=true returns `pending-commit-capture` and the agent warm-transfers. confirm=false returns `qualified` for readback. Reservation is UNGUARANTEED on `ok` \u2014 agent must attach a card via send_payments_web_link + update_payment_source (W6 path). For Advance Purchase use create_booking_ap.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "checkIn": { type: Type.STRING, description: "YYYY-MM-DD." },
        "checkOut": { type: Type.STRING, description: "YYYY-MM-DD." },
        "adults": { type: Type.INTEGER, description: "" },
        "children": { type: Type.INTEGER, description: "" },
        "roomType": { type: Type.STRING, description: "Exact display name on Offers page (e.g. 'Standard King')." },
        "ratePlanDisplayName": { type: Type.STRING, description: "Rate plan display_name from rate-plans.yaml." },
        "ratePlanKey": { type: Type.STRING, description: "bar | member | aaa | senior | government | corporate." },
        "guestFirstName": { type: Type.STRING, description: "" },
        "guestLastName": { type: Type.STRING, description: "" },
        "guestPhone": { type: Type.STRING, description: "" },
        "guestEmail": { type: Type.STRING, description: "" },
        "loyaltyNumber": { type: Type.STRING, description: "Optional inline attach during guest step." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to Confirm Booking." },
        "dryRun": { type: Type.BOOLEAN, description: "If true, no PMS call." }
      },
      required: ["checkIn", "checkOut", "adults", "roomType", "ratePlanDisplayName", "ratePlanKey", "guestFirstName", "guestLastName", "guestPhone", "confirm"],
    },
  },
  {
    name: "create_booking_ap",
    description: "Advance Purchase (prepaid, non-refundable, non-changeable). Agent MUST have fired the W6 Web Link capture BEFORE firing this with confirm=true and set webLinkCaptured=true, otherwise it returns 'prepay-required-but-skipped'. Commit NOT yet live-captured \u2014 confirmed calls return `pending-commit-capture` and the agent warm-transfers. The confirm-gate readback MUST have included 'non-refundable and non-changeable' verbatim.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "checkIn": { type: Type.STRING, description: "YYYY-MM-DD." },
        "checkOut": { type: Type.STRING, description: "YYYY-MM-DD." },
        "adults": { type: Type.INTEGER, description: "" },
        "children": { type: Type.INTEGER, description: "" },
        "roomType": { type: Type.STRING, description: "" },
        "guestFirstName": { type: Type.STRING, description: "" },
        "guestLastName": { type: Type.STRING, description: "" },
        "guestPhone": { type: Type.STRING, description: "" },
        "guestEmail": { type: Type.STRING, description: "" },
        "loyaltyNumber": { type: Type.STRING, description: "" },
        "webLinkCaptured": { type: Type.BOOLEAN, description: "True when the W6 Web Link webhook has flipped to captured." },
        "confirm": { type: Type.BOOLEAN, description: "" },
        "dryRun": { type: Type.BOOLEAN, description: "" }
      },
      required: ["checkIn", "checkOut", "adults", "roomType", "guestFirstName", "guestLastName", "guestPhone", "confirm"],
    },
  },
  {
    name: "create_booking_company",
    description: "Company direct-bill booking. Pre-flights via apply-corporate-id to resolve companyName / companyCode / companyId against /companies; surfaces `company-not-found` when there's no match. Booking commit NOT yet live-captured \u2014 confirmed calls return `pending-commit-capture` and the agent warm-transfers. Incidentals attach post-booking via W6.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "companyName": { type: Type.STRING, description: "Exact company name as profiled in HK \u2192 Companies." },
        "companyId": { type: Type.STRING, description: "Optional direct HK company UUID." },
        "companyCode": { type: Type.STRING, description: "Optional HK companies[].code (lookup key for apply-corporate-id)." },
        "checkIn": { type: Type.STRING, description: "" },
        "checkOut": { type: Type.STRING, description: "" },
        "adults": { type: Type.INTEGER, description: "" },
        "children": { type: Type.INTEGER, description: "" },
        "roomType": { type: Type.STRING, description: "" },
        "guestFirstName": { type: Type.STRING, description: "Traveller first name." },
        "guestLastName": { type: Type.STRING, description: "Traveller last name." },
        "guestPhone": { type: Type.STRING, description: "" },
        "guestEmail": { type: Type.STRING, description: "" },
        "loyaltyNumber": { type: Type.STRING, description: "IHG Business Edge or IHG One Rewards number." },
        "source": { type: Type.STRING, description: "HK Source dropdown value (e.g. 'IHG Business Edge')." },
        "confirm": { type: Type.BOOLEAN, description: "" },
        "dryRun": { type: Type.BOOLEAN, description: "" }
      },
      required: ["companyName", "checkIn", "checkOut", "adults", "roomType", "guestFirstName", "guestLastName", "guestPhone", "confirm"],
    },
  },
  {
    name: "book_walk_in",
    description: "Same-day walk-in booking. HK captures first-night up-front, so agent MUST have fired W6 Web Link capture first and set webLinkCaptured=true \u2014 otherwise flow returns `needs-capture`. Wizard commit NOT yet live-captured \u2014 confirmed calls with capture return `pending-commit-capture` and the agent warm-transfers.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "arrivalDate": { type: Type.STRING, description: "YYYY-MM-DD; must equal property CBD." },
        "adults": { type: Type.INTEGER, description: "" },
        "children": { type: Type.INTEGER, description: "" },
        "roomType": { type: Type.STRING, description: "" },
        "ratePlanDisplayName": { type: Type.STRING, description: "" },
        "guestFirstName": { type: Type.STRING, description: "" },
        "guestLastName": { type: Type.STRING, description: "" },
        "guestPhone": { type: Type.STRING, description: "" },
        "guestEmail": { type: Type.STRING, description: "" },
        "loyaltyNumber": { type: Type.STRING, description: "" },
        "webLinkCaptured": { type: Type.BOOLEAN, description: "True when the W6 Web Link webhook has flipped to captured." },
        "confirm": { type: Type.BOOLEAN, description: "" },
        "dryRun": { type: Type.BOOLEAN, description: "" }
      },
      required: ["arrivalDate", "adults", "roomType", "ratePlanDisplayName", "guestFirstName", "guestLastName", "guestPhone", "confirm"],
    },
  },
  {
    name: "book_third_party",
    description: "Third-party payer booking (S-16). Traveller is the primary guest; cardholder is a different person whose signed CCA form must return before check-in. Wizard + CCA-email commit NOT yet live-captured \u2014 confirmed calls return `pending-commit-capture` with ccaFormSent=false and the agent warm-transfers.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "travellerFirstName": { type: Type.STRING, description: "" },
        "travellerLastName": { type: Type.STRING, description: "" },
        "travellerPhone": { type: Type.STRING, description: "" },
        "travellerEmail": { type: Type.STRING, description: "" },
        "cardholderFirstName": { type: Type.STRING, description: "" },
        "cardholderLastName": { type: Type.STRING, description: "" },
        "cardholderEmail": { type: Type.STRING, description: "" },
        "cardholderPhone": { type: Type.STRING, description: "" },
        "checkIn": { type: Type.STRING, description: "" },
        "checkOut": { type: Type.STRING, description: "" },
        "adults": { type: Type.INTEGER, description: "" },
        "children": { type: Type.INTEGER, description: "" },
        "roomType": { type: Type.STRING, description: "" },
        "ratePlanDisplayName": { type: Type.STRING, description: "" },
        "loyaltyNumber": { type: Type.STRING, description: "" },
        "confirm": { type: Type.BOOLEAN, description: "" },
        "dryRun": { type: Type.BOOLEAN, description: "" }
      },
      required: ["travellerFirstName", "travellerLastName", "travellerPhone", "cardholderFirstName", "cardholderLastName", "cardholderEmail", "cardholderPhone", "checkIn", "checkOut", "adults", "roomType", "ratePlanDisplayName", "confirm"],
    },
  },
  {
    name: "apply_corporate_id",
    description: "Look up a Corporate ID against the property's /companies catalog. Returns the matched HK company (id/name/type) plus raw credit-limit + AR values so the agent can read them back. Statuses: ok, id-not-found, company-mismatch (expectedCompanyName disagrees). This is a qualification step only \u2014 call create_booking_company with the resolved matchedCompanyId afterward to actually book.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "corporateId": { type: Type.STRING, description: "ID as shown in HK Companies." },
        "expectedCompanyName": { type: Type.STRING, description: "If provided, flow returns 'company-mismatch' on disagreement." },
        "dryRun": { type: Type.BOOLEAN, description: "" }
      },
      required: ["corporateId"],
    },
  },
  {
    name: "check_in_staging",
    description: "Pre-register a guest over the phone (S-31). Initializes HK's check-in session (POST /check-in/start \u2014 verified live 2026-04-22) and stamps a 'PRE-REGISTERED by Arvy' stay-remark. The desk resumes the session in-person to walk Terms + Registration + Signature. `multi-room-blocked` when HK refuses multi-room parents. Set initSession=false to stamp the remark only without touching session state. Confirm-gated: confirm=false returns `qualified` for readback.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "splitPaymentIntent": { type: Type.STRING, description: "Free-text note for the desk (S-33 split-payment staging)." },
        "initSession": { type: Type.BOOLEAN, description: "Default true. Set false to skip POST /check-in/start and only stamp the remark." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit." },
        "dryRun": { type: Type.BOOLEAN, description: "" }
      },
      required: ["res"],
    },
  },
  {
    name: "check_out_staging",
    description: "Express check-out (S-37). Initializes HK's check-out session (POST /check-out/start \u2014 verified live 2026-04-22) and stamps a 'CHECK-OUT pre-confirmed by Arvy' stay-remark. The desk finalizes card capture + key return in-person. `multi-room-blocked` when HK refuses multi-room parents. Confirm-gated.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "captureRemaining": { type: Type.BOOLEAN, description: "Informational \u2014 noted on the stay-remark for the desk. No charges are posted by this flow." },
        "emailOverride": { type: Type.STRING, description: "Override folio-email recipient; noted on the stay-remark." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to initiate check-out." },
        "dryRun": { type: Type.BOOLEAN, description: "" }
      },
      required: ["res", "confirm"],
    },
  },
  {
    name: "early_checkout_staging",
    description: "Early check-out mid-stay (S-38). Four branches: waive_fee | apply_fee | charge_remaining | prepaid_ap. Initializes the HK check-out session (POST /check-out/start; verified live 2026-04-22) and stamps a stay-remark with the branch instruction so the desk finalizes the fee handling at the guest's departure. Policy guards: waive_fee over $150 returns 'waiver-over-threshold'; today >= departure returns 'no-nights-to-forfeit'; multi-room parents return 'multi-room-blocked'. Confirm-gated.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Reservation UUID." },
        "todayDate": { type: Type.STRING, description: "YYYY-MM-DD; today per property's CBD." },
        "originalDepartureDate": { type: Type.STRING, description: "YYYY-MM-DD." },
        "branch": { type: Type.STRING, description: "waive_fee | apply_fee | charge_remaining | prepaid_ap." },
        "waiverAgentThresholdUsd": { type: Type.NUMBER, description: "Override default $150 agent waiver threshold." },
        "feeUsdHint": { type: Type.NUMBER, description: "Optional fee figure Arvy has been told so the threshold guard can fire without a live HK fee badge read." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit." },
        "dryRun": { type: Type.BOOLEAN, description: "" }
      },
      required: ["res", "todayDate", "originalDepartureDate", "branch", "confirm"],
    },
  },
  {
    name: "enroll_ihg_loyalty",
    description: "Enroll a new IHG One Rewards member mid-call (S-18). Runs upfront field validation (invalid-email, invalid-address) so the agent can re-collect. The enrollment commit is NOT yet live-captured \u2014 training tenant lacks the IHG integration. Non-dryRun valid calls return `pending-commit-capture` \u2014 warm-transfer per that status. Once the commit endpoint is captured the `ok` / `email-already-exists` / `portal-unhealthy` branches will re-open.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Optional reservation UUID \u2014 flow attaches the number via attach_loyalty_number afterward if present." },
        "firstName": { type: Type.STRING, description: "" },
        "lastName": { type: Type.STRING, description: "" },
        "email": { type: Type.STRING, description: "" },
        "phone": { type: Type.STRING, description: "" },
        "addressLine1": { type: Type.STRING, description: "" },
        "addressLine2": { type: Type.STRING, description: "" },
        "city": { type: Type.STRING, description: "" },
        "state": { type: Type.STRING, description: "" },
        "postalCode": { type: Type.STRING, description: "" },
        "country": { type: Type.STRING, description: "ISO-2 country code (e.g. US)." },
        "dateOfBirth": { type: Type.STRING, description: "YYYY-MM-DD; required in some markets." },
        "dryRun": { type: Type.BOOLEAN, description: "" }
      },
      required: ["firstName", "lastName", "email", "phone", "addressLine1", "city", "state", "postalCode", "country"],
    },
  },
  {
    name: "lost_found_create_inquiry",
    description: "Log a forward-looking L&F inquiry when lost_found_search returned no match (S-41 no-match branch). Housekeeping flags the item if found later. Wires to POST /lost-found/lost (guest-reported) or /lost-found/found (staff-logged); verified live 2026-04-22. Validates location against the property's common-areas and returns `location-not-found` with availableAreas[] on mismatch. Confirm-gated: confirm=false returns `qualified` for readback; confirm=true fires the commit.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "res": { type: Type.STRING, description: "Optional reservation UUID for context linkage." },
        "guestName": { type: Type.STRING, description: "" },
        "guestPhone": { type: Type.STRING, description: "" },
        "guestEmail": { type: Type.STRING, description: "" },
        "itemDescription": { type: Type.STRING, description: "Short label \u2014 what HK surfaces as item_type on the L&F list view." },
        "detailsNote": { type: Type.STRING, description: "Optional longer description." },
        "kind": { type: Type.STRING, description: "LOST (guest-reported; default) | FOUND (staff-logged)." },
        "location": { type: Type.STRING, description: "Common-area name (e.g. 'Lobby', 'Pool') \u2014 resolved to UUID." },
        "locationId": { type: Type.STRING, description: "Common-area UUID (alternative to location name)." },
        "roomId": { type: Type.STRING, description: "Direct HK room UUID (goes into the commit body's room_id)." },
        "date": { type: Type.STRING, description: "YYYY-MM-DD; default today. Becomes date_lost or date_found." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit." },
        "dryRun": { type: Type.BOOLEAN, description: "" }
      },
      required: ["itemDescription"],
    },
  },
  {
    name: "lost_found_arrange_return",
    description: "Arrange shipping for a matched L&F item (S-41 match branch). Requires a card captured via the W6 path (webLinkCaptured=true OR paymentToken + paymentCardLast4). Confirm-gated. Commit endpoint (arrange-return POST) is NOT yet live-captured \u2014 real confirmed calls with a capture return `pending-commit-capture` and the agent warm-transfers. The `high-value-requires-signature` branch will re-open once the endpoint is wired.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "itemId": { type: Type.STRING, description: "L&F item id from lost_found_search." },
        "guestName": { type: Type.STRING, description: "" },
        "shippingAddressLine1": { type: Type.STRING, description: "" },
        "shippingAddressLine2": { type: Type.STRING, description: "" },
        "city": { type: Type.STRING, description: "" },
        "state": { type: Type.STRING, description: "" },
        "postalCode": { type: Type.STRING, description: "" },
        "country": { type: Type.STRING, description: "" },
        "paymentToken": { type: Type.STRING, description: "Gateway token from Twilio Pay." },
        "paymentCardLast4": { type: Type.STRING, description: "" },
        "webLinkCaptured": { type: Type.BOOLEAN, description: "True when the card came via the HK Web Link path." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true to commit." },
        "dryRun": { type: Type.BOOLEAN, description: "" }
      },
      required: ["itemId", "guestName", "shippingAddressLine1", "city", "state", "postalCode", "country", "confirm"],
    },
  },
  {
    name: "queue_manual_booking",
    description: "Booking-fallback queue. Call this ONLY after create_booking, create_booking_ap, or create_booking_company returned ok=false (or 'pending-commit-capture'). Records the booking in the dashboard's manual queue so front-desk staff can commit it in HotelKey by hand. Returns an MQ-XXXXXX reference. After this succeeds, read the guest a confirmation: 'You're all set, [GuestFirstName]. Your reservation is confirmed and we'll send the details to your email shortly.' Do NOT mention the system issue \u2014 staff will commit the booking before check-in. Pass the same booking parameters you tried with create_booking, plus the error reason.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        "checkIn": { type: Type.STRING, description: "YYYY-MM-DD." },
        "checkOut": { type: Type.STRING, description: "YYYY-MM-DD." },
        "adults": { type: Type.INTEGER, description: "" },
        "children": { type: Type.INTEGER, description: "" },
        "roomType": { type: Type.STRING, description: "Exact display name on Offers page (e.g. 'Standard King')." },
        "ratePlanDisplayName": { type: Type.STRING, description: "" },
        "ratePlanKey": { type: Type.STRING, description: "bar | member | aaa | senior | government | corporate | ap." },
        "guestFirstName": { type: Type.STRING, description: "" },
        "guestLastName": { type: Type.STRING, description: "" },
        "guestPhone": { type: Type.STRING, description: "" },
        "guestEmail": { type: Type.STRING, description: "" },
        "loyaltyNumber": { type: Type.STRING, description: "" },
        "corporateId": { type: Type.STRING, description: "If corporate-rate booking." },
        "companyName": { type: Type.STRING, description: "" },
        "reason": { type: Type.STRING, description: "Short error string from the failed booking call (e.g. 'create_booking returned automation 503')." },
        "confirm": { type: Type.BOOLEAN, description: "Must be true. Acknowledges that the guest will be told the booking is confirmed." }
      },
      required: ["checkIn", "checkOut", "adults", "roomType", "ratePlanDisplayName", "ratePlanKey", "guestFirstName", "guestLastName", "guestPhone", "reason", "confirm"],
    },
  }
];

export const PMS_TOOL_NAMES: readonly string[] = [
  "add_stay_remark",
  "send_confirmation",
  "cancel_qualify",
  "cancel_reasons",
  "cancel_reservation",
  "modify_dates",
  "rate_details",
  "search_availability",
  "search_by_phone",
  "read_folio",
  "advanced_search",
  "lost_found_search",
  "modify_room_type",
  "attach_loyalty_number",
  "add_additional_guest",
  "pet_add",
  "addon_add",
  "apply_tax_exempt",
  "reinstate_no_show",
  "email_folio",
  "post_charge",
  "adjust_charge",
  "housekeeping_work_order",
  "maintenance_work_order",
  "send_payments_web_link",
  "update_payment_source",
  "void_authorization",
  "card_decline_replace",
  "create_booking",
  "create_booking_ap",
  "create_booking_company",
  "book_walk_in",
  "book_third_party",
  "apply_corporate_id",
  "check_in_staging",
  "check_out_staging",
  "early_checkout_staging",
  "enroll_ihg_loyalty",
  "lost_found_create_inquiry",
  "lost_found_arrange_return",
  "queue_manual_booking",
];

/** snake_case Gemini name → kebab-case automation flow name */
export function toolNameToFlow(name: string): string {
  return name.replace(/_/g, '-');
}
