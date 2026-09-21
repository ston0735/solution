export const PARTIAL_WRAP_PARTS = {
  mirrors: {
    label: "兩側後視鏡",
    promptLabel: "both exterior side mirrors",
  },
  roof: {
    label: "車頂",
    promptLabel: "the entire exterior roof panel only",
  },
  spoiler: {
    label: "尾翼",
    promptLabel: "the rear spoiler or rear wing only",
  },
  frontLowerBumper: {
    label: "前保桿下緣",
    promptLabel: "the lower lip and lower edge of the front bumper only",
  },
} as const;

export const PARTIAL_WRAP_FINISHES = {
  blackout: {
    label: "黑化",
    promptLabel: "deep neutral black automotive vinyl wrap, with no purple, blue, green, or colored cast",
  },
  carbon_fiber: {
    label: "碳纖維",
    promptLabel: "realistic black carbon-fiber vinyl film with a subtle fine woven pattern, natural clear-coat sheen, and no colored tint",
  },
} as const;

export type PartialWrapPartId = keyof typeof PARTIAL_WRAP_PARTS;
export type PartialWrapFinish = keyof typeof PARTIAL_WRAP_FINISHES;
export type PartialWrapCustomization = {
  part: PartialWrapPartId;
  finish: PartialWrapFinish;
};

export const PARTIAL_WRAP_PART_LIST = Object.entries(PARTIAL_WRAP_PARTS).map(([id, value]) => ({
  id: id as PartialWrapPartId,
  ...value,
}));
