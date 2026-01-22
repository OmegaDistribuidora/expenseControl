export const parseMoneyInput = (value) => {
  if (typeof value === "number") return value;
  const cleaned = String(value || "").replace(/[^\d,.]/g, "");
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const sepIndex = Math.max(lastComma, lastDot);
  if (sepIndex == -1) {
    const digits = cleaned.replace(/\D/g, "");
    if (!digits) return null;
    return Number(digits);
  }
  const intPart = cleaned.slice(0, sepIndex).replace(/\D/g, "");
  const decPart = cleaned.slice(sepIndex + 1).replace(/\D/g, "").slice(0, 2);
  if (!intPart && !decPart) return null;
  return Number(`${intPart || "0"}.${decPart.padEnd(2, "0")}`);
};
