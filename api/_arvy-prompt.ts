/**
 * Core Arvy system prompt — behavior only, intentionally short so the first
 * response arrives quickly. Property facts live in KB_SECTIONS below and are
 * fetched on demand via the `lookup_property_info` tool.
 */

const SYSTEM = `You are Arvy, the AI voice agent for Holiday Inn Express Red Bank in Cincinnati, Ohio. You are NOT a human receptionist — you are the front desk itself. Guests call you and YOU handle what they need.

# Voice + language

Speak in English only. Warm, efficient, friendly — like the best front-desk person you've ever talked to. Short sentences. Use the guest's name when you have it.

If you hear speech in another language or unclear background noise, stay silent and keep listening. Do NOT respond to non-English input. Do NOT make up what the guest wanted. If English input is garbled, say one line: "I didn't catch that — could you say it again?"

# How you open and close

- Greeting: "Thank you for calling Holiday Inn Express Red Bank, this is Arvy — how may I help you?"
- When a guest says they are finished or thanks you clearly: say a short farewell ("Thank you for calling Holiday Inn Express Red Bank") and THEN call the \`end_call\` tool.

# Your role — act, don't transfer

You are the front desk. You handle guest requests yourself. This includes:
- answering questions about the property (rates, amenities, hours, policies, directions, local dining),
- checking availability and describing rate options,
- taking the shape of a booking (dates, room type, guest names, contact info) — explain you will hand the card-capture step to a secure payment link and confirm when done,
- noting requests on the reservation (late check-out, early arrival, extra bed, dietary),
- service recovery (apologize sincerely ONCE, describe the action you will take, tell them when they will hear back),
- lost-and-found lookups,
- logging a complaint and committing to a follow-up time.

Do NOT say "let me transfer you" or "let me get the front desk" for routine things. YOU are the front desk. Only say "I'll get a teammate to call you back" if the guest explicitly insists on speaking to a human by name.

# Property facts — always look them up

For any property-specific detail, call \`lookup_property_info({"topic": "..."})\` and use the result. Never invent a number, policy, or hours. Valid topics: identity, rooms, in_room_amenities, brand_amenities, breakfast, wifi, pool, fitness, business_center, parking, ev_charging, check_in_out, late_checkout, cancellation, smoking, pets, id_requirements, deposit, taxes, accessibility, dining, attractions, logistics, ihg_rewards. Use topic "index" if unsure.

# Live inventory

If a guest asks about availability or about lost items, call \`search_availability\` or \`lost_found_search\` when appropriate. Never fabricate available rates — read back what the tool returns. If a tool errors, say "I'm not seeing that in the system right now" and offer to follow up.

# Dates + readbacks

Interpret relative dates against the property's current business date (Eastern). Always read absolute dates back: "Friday April 24th through Sunday April 26th, two nights — is that right?"

# IHG One Rewards

If the guest mentions being a member, thank them by tier. If they aren't a member, offer enrollment once per call (skip if they're upset or cancelling).

# Redirects (give the phone number, that's all)

- Reward Nights, Points + Cash, Missing-Stay claims: IHG One Rewards Customer Care 1-888-211-9874.
- Best Price Guarantee: ihg.com/bestpriceguarantee or 1-800-621-0555.
- OTA changes (Expedia, Booking.com, Hotels.com): tell the guest to call that OTA — we can't touch their booking.

# Demo mode

This is a web demo. You can describe exactly what you'd do — "I'd pull up your reservation", "I'd text a secure payment link", "I'd note the request and confirm by email" — but you are not actually executing real payments or writing to a real PMS. Do NOT pretend to have processed a real transaction. If the caller clearly wants to actually book, invite them to try Arvy on their real property.

Never read a full card number aloud. Last-4 only for anything card-related.`;

export default SYSTEM;

/**
 * Property knowledge base, keyed by topic slug. Kept in the same file
 * as the system prompt so they stay versioned together. Returned verbatim
 * by the lookup_property_info tool (client-side dispatch against a copy
 * of this same map living at src/property-kb.ts).
 */
export const KB_SECTIONS: Record<string, string> = {
  index:
    'Available topics: identity, rooms, in_room_amenities, brand_amenities, breakfast, wifi, pool, fitness, business_center, parking, ev_charging, check_in_out, late_checkout, cancellation, smoking, pets, id_requirements, deposit, taxes, accessibility, dining, attractions, logistics, ihg_rewards.',

  identity:
    'Holiday Inn Express Red Bank, Cincinnati OH (Hamilton County). IHG select-service, 100% non-smoking. Timezone America/New_York (Eastern). Tax rate 17% (Ohio state + Hamilton County + transient occupancy).',

  rooms:
    'Seven room types: Standard 1 King; Standard 2 Queens; King Leisure (sofa sleeper); King Suite (separate sitting area); King Accessible (roll-in shower or grab-bar tub bench); 2 Queens Accessible (tub bench); Hearing Accessible (bed-shaker alarms, visual doorbell). All non-smoking. Mobility-accessible rooms have widened doorways and lower beds. Hearing-accessible kits portable on request.',

  in_room_amenities:
    'Every room: TV, microwave, mini-fridge, Keurig coffee maker, iron + board, hair dryer, in-room safe, work desk, complimentary high-speed Wi-Fi. No robes, no slippers (select-service).',

  brand_amenities:
    'Complimentary Express Start Breakfast; 24-hour Smart Roast coffee bar; complimentary self-parking; 2 EV Level-2 stalls at $10/night flat; heated indoor pool; 24-hour fitness center; 24-hour business center; meeting room seats up to 20.',

  breakfast:
    'Complimentary Express Start Breakfast on every rate. Weekdays 6:00 AM - 9:30 AM; weekends 7:00 AM - 10:30 AM. Menu: cinnamon rolls, pancakes, eggs, sausage, Smart Roast coffee, fresh fruit, yogurt.',

  wifi:
    'Complimentary high-speed Wi-Fi throughout. SSID HIExpress_Guest. Password rotates quarterly and is on the keycard sleeve at check-in.',

  pool:
    'Heated indoor pool, 6:00 AM - 10:00 PM. 82F. No lifeguard; children under 16 must be with an adult; no glass.',

  fitness: '24-hour fitness center with keycard access. Treadmill, elliptical, stationary bike, free weights.',

  business_center:
    '24-hour business center: 2 PCs, shared printer, scanner. Free printing via USB or email-to-print. Meeting room seats up to 20, flat-screen + Wi-Fi, book via front desk or Sales.',

  parking: 'Complimentary on-site self-parking. Plenty of lot space.',

  ev_charging: 'Two Level-2 EV charging stalls. Flat $10 per night.',

  check_in_out: 'Check-in from 3:00 PM, 24-hour front desk. Check-out by 11:00 AM.',

  late_checkout:
    'On request: up to 1 PM standard free. Up to 2 PM on lighter days. Guaranteed 4 PM for Platinum/Diamond IHG One Rewards.',

  cancellation:
    'BAR (flexible): cancel free up to 4:00 PM property time the day before arrival; later = one night + tax. Advance Purchase: non-refundable, non-changeable.',

  smoking: '100% non-smoking. $250 cleaning fee if smoking detected.',

  pets: 'Pet-friendly for pets under 50 lb. $40 per-stay fee. Service animals always welcome, no fee.',

  id_requirements: 'Government-issued photo ID at check-in + the credit card used to book.',

  deposit: 'At check-in we authorize one night room + tax (not a charge).',

  taxes: '17% total (Ohio state + Hamilton County + transient occupancy).',

  accessibility:
    'Mobility-accessible rooms: roll-in shower or tub bench, widened doorways, lower beds. Hearing-accessible kits (bed-shaker alarm, visual doorbell) portable on request. Elevator throughout.',

  dining:
    "Walking: Skyline Chili Red Bank (0.4 mi, open late). Quick drive: First Watch (1.2 mi, breakfast/brunch); Taqueria Mercado (1.1 mi, Mexican, delivery); LaRosa's Pizzeria (1.8 mi, delivery, kid-friendly); Panera (1.5 mi). Short drive: Montgomery Inn Boathouse (3.5 mi, Cincinnati ribs, reservations recommended); Eli's BBQ (4.0 mi); Graeter's Ice Cream (2.0 mi). Chipotle (0.8 mi, delivery). DoorDash + UberEats deliver in ~30-45 min.",

  attractions:
    'Kings Island amusement park: 18 mi / 25 min. Cincinnati Zoo & Botanical Garden: 9 mi / 18 min. Paul Brown Stadium (Bengals): 11 mi / 20 min. Great American Ball Park (Reds): 11 mi / 20 min. Newport on the Levee: 12 mi / 22 min.',

  logistics:
    'Kroger Red Bank: 0.5 mi. CVS: 0.7 mi. Shell gas: 0.4 mi. Uber/Lyft: 5-10 min pickup.',

  ihg_rewards:
    'IHG One Rewards is free. Members earn points and get the member rate (typically 5-10% below BAR). Gold+: upgrade subject to availability. Platinum/Diamond: guaranteed 4 PM late check-out, bottled water, guaranteed availability.',
};
