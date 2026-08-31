export type SpriteLoadState = {
  asset: string | null;
  status: "loading" | "ready" | "error";
};

export const beginSpriteLoad = (asset: string | null): SpriteLoadState => ({ asset, status: "loading" });
export const completeSpriteLoad = (asset: string): SpriteLoadState => ({ asset, status: "ready" });
export const failSpriteLoad = (asset: string | null): SpriteLoadState => ({ asset, status: "error" });

export function canDisplaySprite(requestedAsset: string | null, state: SpriteLoadState): boolean {
  return Boolean(requestedAsset) && state.status === "ready" && state.asset === requestedAsset;
}

export function shouldDisplaySpritePlaceholder(requestedAsset: string | null, state: SpriteLoadState): boolean {
  return state.status === "error" && state.asset === requestedAsset;
}
