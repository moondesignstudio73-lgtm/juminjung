export type AuraDisplayContext = "assignment" | "management";

export function shouldShowAuraOverlay(context: AuraDisplayContext, requested = false): boolean {
  return context === "assignment" || requested;
}

export function toggleAuraGuestId(currentGuestId: string | null, selectedGuestId: string): string | null {
  return currentGuestId === selectedGuestId ? null : selectedGuestId;
}
