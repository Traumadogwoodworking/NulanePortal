export type DamageAreaCategory = "Exterior" | "Interior" | "Engine Bay";

export type DamageAreaOption = {
  code: string;
  name: string;
  category: DamageAreaCategory;
  aliases: string[];
};

export type DamageTypeOption = {
  code: string;
  name: string;
};

export type DamageSeverityOption = {
  value: string;
  label: string;
};

export const DAMAGE_AREAS: DamageAreaOption[] = [
  { code: "03", name: "Front Bumper", category: "Exterior", aliases: ["front bumper", "bumper front", "front cover", "bumper", "front end"] },
  { code: "05", name: "Front Bumper Guard", category: "Exterior", aliases: ["front guard", "bumper strip front", "front trim"] },
  { code: "27", name: "Hood", category: "Exterior", aliases: ["bonnet", "engine hood", "hood panel"] },
  { code: "24", name: "Headlights", category: "Exterior", aliases: ["headlight", "front lights", "head lamp", "headlamp", "lights"] },
  { code: "25", name: "Fog/Driving/Spot Light", category: "Exterior", aliases: ["fog light", "driving lights", "spot lights", "auxiliary lights"] },
  { code: "20", name: "Windshield", category: "Exterior", aliases: ["front windshield", "windscreen", "front glass", "windshield"] },
  { code: "80", name: "Cowl", category: "Exterior", aliases: ["cowl panel", "windshield cowl", "wiper area"] },
  { code: "04", name: "Rear Bumper", category: "Exterior", aliases: ["rear bumper", "bumper rear", "back bumper", "rear end"] },
  { code: "06", name: "Rear Bumper Guard", category: "Exterior", aliases: ["rear guard", "bumper strip rear", "rear trim"] },
  { code: "52", name: "Deck Lid/Tailgate/Hatchback", category: "Exterior", aliases: ["trunk", "tailgate", "hatchback", "deck lid", "boot"] },
  { code: "45", name: "Tail Lights", category: "Exterior", aliases: ["tail light", "rear lights", "back lights", "taillights"] },
  { code: "21", name: "Rear Glass", category: "Exterior", aliases: ["rear windshield", "back glass", "rear window"] },
  { code: "10", name: "Left Front Door", category: "Exterior", aliases: ["driver door", "front left door", "left front door", "door", "driver side door"] },
  { code: "11", name: "Left Rear Door", category: "Exterior", aliases: ["left back door", "rear left door", "left passenger door"] },
  { code: "14", name: "Left Front Fender", category: "Exterior", aliases: ["front left fender", "left front fender", "left wing", "fender"] },
  { code: "15", name: "Left Quarter Panel/Pickup Box", category: "Exterior", aliases: ["left rear panel", "rear left quarter", "left quarter"] },
  { code: "82", name: "Rear Left Fender", category: "Exterior", aliases: ["rear left fender", "left rear wing"] },
  { code: "08", name: "Door - Back Cargo - Left", category: "Exterior", aliases: ["left back cargo door", "rear left cargo", "left cargo back"] },
  { code: "12", name: "Right Front Door", category: "Exterior", aliases: ["passenger door", "front right door", "right front door", "passenger side door"] },
  { code: "13", name: "Right Rear Door", category: "Exterior", aliases: ["right back door", "rear right door", "right passenger door"] },
  { code: "16", name: "Right Front Fender", category: "Exterior", aliases: ["front right fender", "right front fender", "right wing"] },
  { code: "17", name: "Right Quarter Panel/Pickup Box", category: "Exterior", aliases: ["right rear panel", "rear right quarter", "right quarter"] },
  { code: "83", name: "Rear Right Fender", category: "Exterior", aliases: ["rear right fender", "right rear wing"] },
  { code: "07", name: "Door - Back Cargo - Right", category: "Exterior", aliases: ["right back cargo door", "rear right cargo", "right cargo back"] },
  { code: "09", name: "Door - Cargo - Right", category: "Exterior", aliases: ["right cargo door", "cargo door right", "right side cargo"] },
  { code: "37", name: "Roof", category: "Exterior", aliases: ["roof panel", "roof top", "car roof"] },
  { code: "53", name: "Sunroof/T-Top", category: "Exterior", aliases: ["moon roof", "sun roof", "sliding roof", "t-top"] },
  { code: "56", name: "Vinyl/Convertible Top/Tonneau Cover", category: "Exterior", aliases: ["convertible top", "soft top", "tonneau cover", "vinyl top"] },
  { code: "30", name: "Outside Left Mirror", category: "Exterior", aliases: ["driver mirror", "left mirror", "driver side mirror", "mirror"] },
  { code: "31", name: "Outside Right Mirror", category: "Exterior", aliases: ["passenger mirror", "right mirror", "passenger side mirror"] },
  { code: "01", name: "Antenna/Antenna Base", category: "Exterior", aliases: ["radio antenna", "antenna base", "aerial", "antenna"] },
  { code: "22", name: "Grille", category: "Exterior", aliases: ["front grille", "grill", "front grill"] },
  { code: "35", name: "Rocker Panel/Outer Sill - Left", category: "Exterior", aliases: ["left rocker panel", "left side sill", "left outer sill"] },
  { code: "36", name: "Rocker Panel/Outer Sill - Right", category: "Exterior", aliases: ["right rocker panel", "right side sill", "right outer sill"] },
  { code: "38", name: "Running Board/Step - Left", category: "Exterior", aliases: ["left running board", "left step", "left side step"] },
  { code: "39", name: "Running Board/Step - Right", category: "Exterior", aliases: ["right running board", "right step", "right side step"] },
  { code: "42", name: "Splash Panel/Spoiler - Front", category: "Exterior", aliases: ["front spoiler", "front air dam", "front splash guard"] },
  { code: "64", name: "Spoiler/Deflector - Rear", category: "Exterior", aliases: ["rear spoiler", "rear wing", "rear deflector"] },
  { code: "65", name: "Luggage Rack/Drip Rail", category: "Exterior", aliases: ["roof rack", "luggage rack", "drip rail", "roof rails"] },
  { code: "81", name: "Gas Cap/Cover", category: "Exterior", aliases: ["fuel cap", "gas cap", "fuel door", "gas door"] },
  { code: "92", name: "License Plate Bracket", category: "Exterior", aliases: ["license bracket", "plate bracket", "license mount"] },
  { code: "59", name: "Wipers - All", category: "Exterior", aliases: ["windshield wipers", "wiper blades", "wipers"] },
  { code: "32", name: "Major Damage/Auction", category: "Exterior", aliases: ["major damage", "auction vehicle", "total loss", "severe damage"] },
  { code: "62", name: "Entire Vehicle", category: "Exterior", aliases: ["whole vehicle", "complete vehicle", "full vehicle", "entire car"] },
  { code: "78", name: "Right Front Tire", category: "Exterior", aliases: ["front right tire", "passenger front tire", "right front tire", "tire", "front tire"] },
  { code: "79", name: "Right Front Wheel/Rim", category: "Exterior", aliases: ["front right wheel", "passenger front wheel", "right front rim"] },
  { code: "72", name: "Left Front Tire", category: "Exterior", aliases: ["front left tire", "driver front tire", "left front tire"] },
  { code: "73", name: "Left Front Wheel/Rim", category: "Exterior", aliases: ["front left wheel", "driver front wheel", "left front rim", "wheel", "rim"] },
  { code: "74", name: "Left Rear Tire", category: "Exterior", aliases: ["rear left tire", "driver rear tire", "left rear tire"] },
  { code: "75", name: "Left Rear Wheel/Rim", category: "Exterior", aliases: ["rear left wheel", "driver rear wheel", "left rear rim"] },
  { code: "76", name: "Right Rear Tire", category: "Exterior", aliases: ["rear right tire", "passenger rear tire", "right rear tire"] },
  { code: "77", name: "Right Rear Wheel/Rim", category: "Exterior", aliases: ["rear right wheel", "passenger rear wheel", "right rear rim"] },
  { code: "57", name: "Wheel Covers/Caps/Rings", category: "Exterior", aliases: ["hubcaps", "wheel caps", "center caps", "wheel rings"] },
  { code: "94", name: "Seat - Front Left", category: "Interior", aliases: ["driver seat", "left front seat", "drivers seat", "seat"] },
  { code: "95", name: "Seat - Front Right", category: "Interior", aliases: ["passenger seat", "right front seat", "front passenger seat"] },
  { code: "96", name: "Seat - Rear", category: "Interior", aliases: ["back seat", "rear bench", "back seats", "second row"] },
  { code: "18", name: "Floor Mats - Front", category: "Interior", aliases: ["front mats", "driver floor mat", "passenger floor mat", "mat", "floor mat"] },
  { code: "19", name: "Floor Mats - Rear", category: "Interior", aliases: ["back mats", "rear mats", "back floor mats"] },
  { code: "68", name: "Carpet - Front", category: "Interior", aliases: ["driver carpet", "front floor carpet", "passenger carpet", "carpet"] },
  { code: "97", name: "Carpet - Rear", category: "Interior", aliases: ["back carpet", "rear floor carpet", "back floor"] },
  { code: "66", name: "Dash/Instrument Panel", category: "Interior", aliases: ["dashboard", "dash", "instrument panel", "dash panel", "cockpit"] },
  { code: "93", name: "Steering Wheel/Airbag", category: "Interior", aliases: ["steering", "wheel", "steering column", "airbag"] },
  { code: "26", name: "Headliner", category: "Interior", aliases: ["roof lining", "ceiling", "interior roof", "headlining"] },
  { code: "69", name: "Center Post - Right", category: "Interior", aliases: ["right center post", "b pillar right", "center pillar right"] },
  { code: "70", name: "Center Post - Left", category: "Interior", aliases: ["left center post", "b pillar left", "center pillar left"] },
  { code: "71", name: "Corner Post", category: "Interior", aliases: ["corner pillar", "a pillar", "c pillar"] },
  { code: "23", name: "Throw-In Items", category: "Interior", aliases: ["throw-in", "throw in", "throwins", "accessories", "accessory bag", "included items", "extras"] },
  { code: "55", name: "Cargo Area - Other", category: "Interior", aliases: ["cargo area", "trunk space", "cargo compartment"] },
  { code: "61", name: "Pickup Box - Interior", category: "Interior", aliases: ["truck bed interior", "pickup bed", "bed liner"] },
  { code: "33", name: "Audio/Video Player", category: "Interior", aliases: ["audio player", "stereo", "music system", "infotainment"] },
  { code: "34", name: "TV/DVD Screen", category: "Interior", aliases: ["tv screen", "dvd player", "navigation screen", "monitor"] },
  { code: "49", name: "CD Changer - Separate Unit", category: "Interior", aliases: ["cd changer", "music changer", "disc player"] },
  { code: "58", name: "Radio Speakers", category: "Interior", aliases: ["radio speakers", "audio speakers", "sound system", "speaker"] },
  { code: "85", name: "Communication/GPS Unit", category: "Interior", aliases: ["gps", "navigation", "communication system", "nav unit"] },
  { code: "67", name: "Cigarette Lighter/Ash Tray", category: "Interior", aliases: ["lighter", "power outlet", "ashtray", "12v outlet"] },
  { code: "28", name: "Keys", category: "Interior", aliases: ["car keys", "ignition key", "key set"] },
  { code: "29", name: "Keyless Remote", category: "Interior", aliases: ["keyless remote", "remote control", "key remote", "fob"] },
  { code: "86", name: "Parking Sonar System", category: "Interior", aliases: ["parking sensors", "sonar system", "proximity sensors"] },
  { code: "98", name: "Interior - Other", category: "Interior", aliases: ["interior other", "misc interior", "other internal parts"] },
  { code: "99", name: "Engine Compartment", category: "Engine Bay", aliases: ["engine bay", "motor compartment", "engine other", "engine", "motor", "eng", "compartment"] },
  { code: "02", name: "Battery/Box", category: "Engine Bay", aliases: ["car battery", "battery box", "power source", "battery"] },
  { code: "40", name: "Spare Tire/Wheel", category: "Engine Bay", aliases: ["spare wheel", "emergency tire", "donut tire", "spare"] },
  { code: "44", name: "Gas Tank", category: "Engine Bay", aliases: ["fuel tank", "gas tank", "fuel system", "tank"] },
  { code: "54", name: "Under Carriage", category: "Engine Bay", aliases: ["undercarriage", "under body", "chassis components", "underneath"] },
  { code: "84", name: "Tools/Jack/Spare Mount", category: "Engine Bay", aliases: ["tools", "jack", "spare mount", "tire lock"] },
];

export const DAMAGE_SEVERITIES: DamageSeverityOption[] = [
  { value: "1", label: '1 - ≤1" (≤3 cm)' },
  { value: "2", label: '2 - >1" to ≤3" (3–8 cm)' },
  { value: "3", label: '3 - >3" to ≤6" (8–15 cm)' },
  { value: "4", label: '4 - >6" to ≤12" (15–30 cm)' },
  { value: "5", label: '5 - >12" (≥30 cm)' },
  { value: "6", label: "6 - Missing / Major Damage" },
];

const DAMAGE_TYPE_SETS: Record<string, DamageTypeOption[]> = {
  body: [
    { code: "04", name: "DENTED - PAINT BROKEN" },
    { code: "14", name: "DENTED - PAINT NOT DAMAGED" },
    { code: "09", name: "SCUFFED" },
    { code: "12", name: "SCRATCHED" },
    { code: "07", name: "GOUGED" },
    { code: "06", name: "CRACKED" },
    { code: "01", name: "BENT" },
    { code: "02", name: "BROKEN/MAJOR DAMAGE" },
    { code: "08", name: "MISSING" },
    { code: "18", name: "MOLDING/WEATHER STRIP DAMAGED" },
    { code: "19", name: "MOLDING/WEATHER STRIP MISSING" },
    { code: "38", name: "HARDWARE LOOSENED" },
    { code: "29", name: "CONTAMINATION" },
  ],
  glass: [
    { code: "20", name: "GLASS - CRACKED" },
    { code: "22", name: "GLASS - CHIPPED" },
    { code: "23", name: "GLASS - SCRATCHED" },
    { code: "21", name: "GLASS - BROKEN" },
    { code: "08", name: "MISSING" },
    { code: "29", name: "CONTAMINATION" },
  ],
  lights: [
    { code: "21", name: "GLASS - BROKEN" },
    { code: "20", name: "GLASS - CRACKED" },
    { code: "22", name: "GLASS - CHIPPED" },
    { code: "23", name: "GLASS - SCRATCHED" },
    { code: "24", name: "MARKER LIGHT/TURN LIGHT DAMAGE" },
    { code: "08", name: "MISSING" },
    { code: "02", name: "BROKEN/MAJOR DAMAGE" },
    { code: "29", name: "CONTAMINATION" },
  ],
  tires: [
    { code: "11", name: "PUNCTURED" },
    { code: "13", name: "TORN" },
    { code: "03", name: "CUT" },
    { code: "09", name: "SCUFFED" },
    { code: "08", name: "MISSING" },
    { code: "02", name: "BROKEN/MAJOR DAMAGE" },
    { code: "29", name: "CONTAMINATION" },
  ],
  wheels: [
    { code: "04", name: "DENTED - PAINT BROKEN" },
    { code: "14", name: "DENTED - PAINT NOT DAMAGED" },
    { code: "12", name: "SCRATCHED" },
    { code: "01", name: "BENT" },
    { code: "09", name: "SCUFFED" },
    { code: "02", name: "BROKEN/MAJOR DAMAGE" },
    { code: "08", name: "MISSING" },
    { code: "29", name: "CONTAMINATION" },
  ],
  seats: [
    { code: "13", name: "TORN" },
    { code: "10", name: "INTERIOR STAINED/SOILED" },
    { code: "11", name: "PUNCTURED" },
    { code: "12", name: "SCRATCHED" },
    { code: "02", name: "BROKEN/MAJOR DAMAGE" },
    { code: "08", name: "MISSING" },
    { code: "29", name: "CONTAMINATION" },
  ],
  interiorHard: [
    { code: "06", name: "CRACKED" },
    { code: "12", name: "SCRATCHED" },
    { code: "09", name: "SCUFFED" },
    { code: "02", name: "BROKEN/MAJOR DAMAGE" },
    { code: "08", name: "MISSING" },
    { code: "29", name: "CONTAMINATION" },
  ],
  engine: [
    { code: "01", name: "BENT" },
    { code: "02", name: "BROKEN/MAJOR DAMAGE" },
    { code: "08", name: "MISSING" },
    { code: "12", name: "SCRATCHED" },
    { code: "29", name: "CONTAMINATION" },
    { code: "30", name: "FLUID SPILLAGE EXTERIOR" },
  ],
  floor: [
    { code: "10", name: "INTERIOR STAINED/SOILED" },
    { code: "13", name: "TORN" },
    { code: "12", name: "SCRATCHED" },
    { code: "03", name: "CUT" },
    { code: "08", name: "MISSING" },
    { code: "29", name: "CONTAMINATION" },
  ],
};

const AREA_TO_TYPE_GROUP: Record<string, keyof typeof DAMAGE_TYPE_SETS> = {
  "03": "body",
  "04": "body",
  "05": "body",
  "06": "body",
  "07": "body",
  "08": "body",
  "09": "body",
  "10": "body",
  "11": "body",
  "12": "body",
  "13": "body",
  "14": "body",
  "15": "body",
  "16": "body",
  "17": "body",
  "18": "floor",
  "19": "floor",
  "20": "glass",
  "21": "glass",
  "22": "lights",
  "23": "interiorHard",
  "24": "lights",
  "25": "lights",
  "26": "interiorHard",
  "27": "body",
  "28": "engine",
  "29": "engine",
  "30": "body",
  "31": "body",
  "32": "body",
  "33": "interiorHard",
  "34": "interiorHard",
  "35": "body",
  "36": "body",
  "37": "body",
  "38": "body",
  "39": "body",
  "40": "engine",
  "42": "body",
  "44": "engine",
  "45": "lights",
  "49": "interiorHard",
  "52": "body",
  "53": "glass",
  "54": "engine",
  "55": "interiorHard",
  "56": "body",
  "57": "wheels",
  "58": "interiorHard",
  "59": "body",
  "61": "interiorHard",
  "62": "body",
  "64": "body",
  "65": "body",
  "66": "interiorHard",
  "67": "interiorHard",
  "68": "floor",
  "69": "interiorHard",
  "70": "interiorHard",
  "71": "interiorHard",
  "72": "tires",
  "73": "wheels",
  "74": "tires",
  "75": "wheels",
  "76": "tires",
  "77": "wheels",
  "78": "tires",
  "79": "wheels",
  "80": "body",
  "81": "body",
  "82": "body",
  "83": "body",
  "84": "engine",
  "85": "interiorHard",
  "86": "interiorHard",
  "92": "body",
  "93": "interiorHard",
  "94": "seats",
  "95": "seats",
  "96": "seats",
  "97": "floor",
  "98": "interiorHard",
  "99": "engine",
};

export function getDamageTypeOptionsForArea(areaCode: string | ""): DamageTypeOption[] {
  if (!areaCode) {
    return [];
  }
  const key = AREA_TO_TYPE_GROUP[areaCode];
  return key ? DAMAGE_TYPE_SETS[key] : DAMAGE_TYPE_SETS.body;
}

export function findDamageAreaOption(value: string | ""): DamageAreaOption | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return DAMAGE_AREAS.find((area) => area.code === normalized || area.name === normalized) ?? null;
}

export function findDamageTypeOption(areaCode: string | "", value: string | ""): DamageTypeOption | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return getDamageTypeOptionsForArea(areaCode).find((type) => type.code === normalized || type.name === normalized) ?? null;
}
