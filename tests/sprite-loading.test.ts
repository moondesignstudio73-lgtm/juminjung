import assert from "node:assert/strict";
import test from "node:test";
import { beginSpriteLoad, canDisplaySprite, completeSpriteLoad, failSpriteLoad, shouldDisplaySpritePlaceholder } from "../game/sprite-load-manager.ts";

const eleanor = "/juminjung/assets/characters/eleanor.png";
const walter = "/juminjung/assets/characters/walter.png";
const mia = "/juminjung/assets/characters/mia.png";

test("Eleanor is hidden until her exact sprite finishes loading", () => {
  assert.equal(canDisplaySprite(eleanor, beginSpriteLoad(eleanor)), false);
  assert.equal(canDisplaySprite(eleanor, completeSpriteLoad(eleanor)), true);
});

test("Walter never reuses Eleanor while his sprite is loading", () => {
  assert.equal(canDisplaySprite(walter, completeSpriteLoad(eleanor)), false);
  assert.equal(canDisplaySprite(walter, beginSpriteLoad(walter)), false);
  assert.equal(canDisplaySprite(walter, completeSpriteLoad(walter)), true);
});

test("Mia never reuses Walter while her sprite is loading", () => {
  assert.equal(canDisplaySprite(mia, completeSpriteLoad(walter)), false);
  assert.equal(canDisplaySprite(mia, completeSpriteLoad(mia)), true);
});

test("loading keeps the lobby empty and errors use only the generic placeholder", () => {
  assert.equal(canDisplaySprite(walter, beginSpriteLoad(walter)), false);
  assert.equal(shouldDisplaySpritePlaceholder(walter, beginSpriteLoad(walter)), false);
  assert.equal(shouldDisplaySpritePlaceholder(walter, failSpriteLoad(walter)), true);
  assert.equal(canDisplaySprite(walter, failSpriteLoad(walter)), false);
});

test("an error from an obsolete request cannot replace the current visitor", () => {
  assert.equal(shouldDisplaySpritePlaceholder(mia, failSpriteLoad(walter)), false);
});
