const URGENT_KEYWORDS = [
  "fire",
  "flood",
  "gas leak",
  "carbon monoxide",
  "no heat",
  "burst pipe",
  "water everywhere",
  "security",
  "break-in",
  "emergency",
  "smell gas",
];

export type UrgencyFlag = {
  isUrgent: boolean;
  matched: string[];
};

export function detectUrgency(text: string): UrgencyFlag {
  const lower = text.toLowerCase();
  const matched = URGENT_KEYWORDS.filter((keyword) => lower.includes(keyword));
  return {
    isUrgent: matched.length > 0,
    matched,
  };
}
