/**
 * Browser-side copy of the HIE Red Bank knowledge base.
 *
 * The server side copy lives at api/_arvy-prompt.ts (KB_SECTIONS). We
 * duplicate it here so Arvy's `lookup_property_info` tool calls resolve
 * locally (sub-millisecond) instead of paying a Vercel round-trip per
 * lookup. Keep the two in sync when KB content changes.
 */

export const KB_SECTIONS: Record<string, string> = {
  index:
    'Available topics: identity, rooms, in_room_amenities, brand_amenities, breakfast, wifi, pool, fitness, business_center, parking, ev_charging, check_in_out, late_checkout, cancellation, smoking, pets, id_requirements, deposit, taxes, accessibility, dining, attractions, logistics, ihg_rewards, quiet_hours, enrollment_url.',

  identity:
    'Holiday Inn Express Red Bank, Cincinnati OH (Hamilton County). IHG select-service, 100% non-smoking. Timezone America/New_York (Eastern). Tax rate 17% (Ohio state + Hamilton County + transient occupancy).',

  rooms:
    'Seven room types: Standard 1 King; Standard 2 Queens; King Leisure (sofa sleeper); King Suite (separate sitting area); King Accessible (roll-in shower or grab-bar tub bench); 2 Queens Accessible (tub bench); Hearing Accessible (bed-shaker alarms, visual doorbell). All non-smoking. Mobility-accessible rooms also have widened doorways and lower beds. Hearing-accessible kits are portable on request.',

  in_room_amenities:
    'Every room: TV, microwave, mini-fridge, Keurig coffee maker, iron + board, hair dryer, in-room safe, work desk, complimentary high-speed Wi-Fi. No robes, no slippers (select-service).',

  brand_amenities:
    'Complimentary Express Start Breakfast; 24-hour Smart Roast coffee bar; complimentary self-parking; 2 EV Level-2 stalls at $10/night flat; heated indoor pool; 24-hour fitness center; 24-hour business center; meeting room seats up to 20.',

  breakfast:
    'Complimentary Express Start Breakfast on every rate. Weekdays 6:00 AM - 9:30 AM; weekends 7:00 AM - 10:30 AM. Menu includes cinnamon rolls, pancakes, eggs, sausage, Smart Roast coffee, fresh fruit, yogurt.',

  wifi:
    'Complimentary high-speed Wi-Fi throughout the hotel. SSID HIExpress_Guest. Password changes quarterly and is on the in-room keycard sleeve - front desk can confirm the current value.',

  pool:
    'Heated indoor pool, 6:00 AM - 10:00 PM. Water temperature 82F. No lifeguard on duty; children under 16 must be accompanied by an adult. No glass in pool area.',

  fitness:
    '24-hour fitness center with keycard access. Equipment: treadmill, elliptical, stationary bike, free weights.',

  business_center:
    '24-hour business center with 2 PCs, a shared printer, and a scanner. Printing is free - USB or email-to-print. Meeting room seats up to 20; flat-screen for presentations, Wi-Fi; book through front desk or Sales.',

  parking: 'Complimentary on-site self-parking for all guests. Plenty of lot space.',

  ev_charging: 'Two Level-2 EV charging stalls on site. Flat $10 per night.',

  check_in_out:
    'Check-in from 3:00 PM. 24-hour front desk. Check-out by 11:00 AM.',

  late_checkout:
    'Late check-out available on request. Standard up to 1 PM free. Up to 2 PM on lighter days. Guaranteed 4 PM for Platinum and Diamond IHG One Rewards members.',

  cancellation:
    'BAR (flexible) rate: cancel free up to 4:00 PM property time the day before arrival; later = one night plus tax. Advance Purchase rate: non-refundable and non-changeable.',

  smoking:
    '100% non-smoking property. $250 cleaning fee if smoking is detected in the room.',

  pets:
    'Pet-friendly for pets under 50 lb. $40 per-stay fee. Service animals always welcome at no fee.',

  id_requirements:
    'Government-issued photo ID required at check-in, plus the credit card used to book.',

  deposit:
    'At check-in we authorize one night room + tax on the card (not a charge).',

  taxes: '17% total (Ohio state, Hamilton County, transient occupancy).',

  accessibility:
    'Mobility-accessible rooms (roll-in shower or tub bench, widened doorways, lower beds). Hearing-accessible kits (bed-shaker alarm, visual doorbell) are portable on request. Elevator access throughout.',

  dining:
    "Within walking distance: Skyline Chili Red Bank (0.4 mi, Cincinnati chili, open late). Quick-drive: First Watch (1.2 mi, breakfast/brunch); Taqueria Mercado (1.1 mi, Mexican, delivery); LaRosa's Pizzeria (1.8 mi, delivery, kid-friendly); Panera (1.5 mi, salads/soups). Short drive: Montgomery Inn Boathouse (3.5 mi, iconic Cincinnati ribs, river views, dinner reservations recommended); Eli's BBQ (4.0 mi, brisket/pulled pork, counter service); Graeter's Ice Cream (2.0 mi, local institution). Fast-casual: Chipotle (0.8 mi, delivery). DoorDash and UberEats both deliver throughout Red Bank in ~30-45 minutes.",

  attractions:
    'Kings Island amusement park - 18 mi / 25 min. Cincinnati Zoo & Botanical Garden - 9 mi / 18 min. Paul Brown Stadium (Bengals) - 11 mi / 20 min. Great American Ball Park (Reds) - 11 mi / 20 min. Newport on the Levee - 12 mi / 22 min.',

  logistics:
    'Grocery: Kroger Red Bank (0.5 mi). Pharmacy: CVS (0.7 mi). Gas: Shell (0.4 mi). Rideshare: Uber and Lyft both 5-10 minute pickup.',

  ihg_rewards:
    'IHG One Rewards is free to join. Members earn points on direct stays and get access to the member rate (usually 5-10% below BAR). Gold and higher: upgrade subject to availability. Platinum/Diamond: guaranteed 4 PM late check-out, bottled water, guaranteed room availability.',

  quiet_hours: 'Standard quiet hours are 10:00 PM to 7:00 AM.',

  enrollment_url: 'IHG One Rewards enrollment: https://www.ihg.com/one-rewards/join',
};

export function lookupPropertyInfo(topic: string): string {
  const key = (topic || '').toLowerCase().replace(/\s+/g, '_');
  const direct = KB_SECTIONS[key];
  if (direct) return direct;
  // Simple keyword fallbacks so Arvy can use looser topic names.
  const aliases: Record<string, string> = {
    wifi_password: 'wifi',
    internet: 'wifi',
    checkin: 'check_in_out',
    check_in: 'check_in_out',
    checkout: 'check_in_out',
    check_out: 'check_in_out',
    restaurants: 'dining',
    food: 'dining',
    pet_policy: 'pets',
    dogs: 'pets',
    cats: 'pets',
    tax: 'taxes',
    gym: 'fitness',
    workout: 'fitness',
    ev: 'ev_charging',
    charging: 'ev_charging',
    rewards: 'ihg_rewards',
    loyalty: 'ihg_rewards',
  };
  const aliased = aliases[key];
  if (aliased && KB_SECTIONS[aliased]) return KB_SECTIONS[aliased];
  return `No KB entry for "${topic}". Call lookup_property_info with topic "index" to see the available sections.`;
}
