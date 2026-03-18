import { type FamilyFocus } from "@/features/learning/facts";

export function normalizeFocusParam(
  value?: string | string[]
): FamilyFocus | null {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (rawValue === "mixed") {
    return "mixed";
  }

  const numericValue = Number(rawValue);

  if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 10) {
    return numericValue as Exclude<FamilyFocus, "mixed">;
  }

  return null;
}

export function stringifyFocusParam(focus: FamilyFocus) {
  return `${focus}`;
}
