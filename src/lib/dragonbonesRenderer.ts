/**
 * DragonBones renderer — singleton factory with cache guard.
 *
 * Key design decisions:
 * - PixiFactory is a global singleton in dragonbones-pixijs; calling
 *   parseDragonBonesData / parseTextureAtlasData more than once with the
 *   same name throws "already registered" errors and corrupts state.
 *   We guard with a simple boolean flag per character.
 * - advanceTime() must be called every frame via the PIXI ticker.
 *   We set that up once here so CanvasEditor doesn't have to.
 */

import * as PIXI from "pixi.js";
import { PixiFactory } from "dragonbones-pixijs";
export type { PixiArmatureDisplay } from "dragonbones-pixijs";

const _BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Multi-character registry ────────────────────────────────────────────────
export interface CharacterDef {
  id: string;
  label: string;            // Display name shown in the UI
  icon: string;             // Emoji icon for character selector
  thumbnailUrl: string;     // Preview image shown in the character picker card
  armatureName: string;     // must match armature[0].name in the ske.json
  dragonBonesName: string;  // top-level "name" field in the ske.json — used to namespace factory lookups
  skeUrl: string;
  texUrl: string;
  imgUrl: string;
  /** Approximate un-scaled AABB used to size the canvas proxy. */
  dbHeight: number;
  dbWidth: number;
  /** Animation groups for this character, shown in the panel */
  animationGroups: Array<{
    label: string;
    color: string;
    animations: Array<{
      name: string;
      icon: string;
      /** Human-readable label; falls back to name if omitted */
      label?: string;
      /** Override which CHARACTER_DEFS entry to load for this specific animation */
      characterId?: string;
    }>;
  }>;
}

export const CHARACTER_DEFS: Record<string, CharacterDef> = {
  character: {
    id: "character",
    label: "Xter",
    icon: "🧑",
    thumbnailUrl: `${_BASE}/dragonbones/characte_2_tex.png`,
    armatureName: "character",
    dragonBonesName: "character",
    skeUrl: `${_BASE}/dragonbones/characte_2_ske.json`,
    texUrl: `${_BASE}/dragonbones/characte_2_tex.json`,
    imgUrl: `${_BASE}/dragonbones/characte_2_tex.png`,
    dbHeight: 945,
    dbWidth: 324,
    animationGroups: [
      {
        label: "Locomotion",
        color: "#6366f1",
        animations: [
          { name: "Idle",  icon: "🧍" },
          { name: "walk",  icon: "🚶" },
          { name: "run",   icon: "🏃" },
          { name: "jump",  icon: "🦘" },
        ],
      },
      {
        label: "Gestures",
        color: "#06b6d4",
        animations: [
          { name: "wave",       icon: "👋" },
          { name: "handshake",  icon: "🤝" },
          { name: "point",      icon: "👉" },
          { name: "nod",        icon: "🙂" },
          { name: "shake_head", icon: "🙅" },
          { name: "look_up",    icon: "👀" },
        ],
      },
      {
        label: "Sitting & Rest",
        color: "#8b5cf6",
        animations: [
          { name: "sit_down",       icon: "🪑" },
          { name: "sit_idle",       icon: "😌" },
          { name: "cross_legs",     icon: "🧘" },
          { name: "swing_legs_out", icon: "🦵" },
          { name: "lay_down",       icon: "🛌" },
          { name: "pull_blanket",   icon: "🛏️" },
          { name: "fall_asleep",    icon: "😴" },
        ],
      },
      {
        label: "Morning Routine",
        color: "#f97316",
        animations: [
          { name: "yawn",    icon: "🥱" },
          { name: "stretch", icon: "🙆" },
          { name: "rub_eyes", icon: "😪" },
        ],
      },
      {
        label: "Activities",
        color: "#10b981",
        animations: [
          { name: "eat",          icon: "🍽️" },
          { name: "drink",        icon: "🥤" },
          { name: "flip_food",    icon: "🍳" },
          { name: "wipe_table",   icon: "🧹" },
          { name: "read_book",    icon: "📖" },
          { name: "desk_stretch", icon: "💺" },
          { name: "pick_up_box",  icon: "📦" },
          { name: "put_on_shirt", icon: "👕" },
        ],
      },
    ],
  },

  // ── Xter 2: jump / sit / swim — each animation lives in its own skeleton ──
  xter2: {
    id: "xter2",
    label: "Xter 2",
    icon: "🏃",
    thumbnailUrl: `${_BASE}/dragonbones/jumpxter/JUmp_tex.png`,
    // armatureName / skeUrl / etc. are per-animation via characterId override below
    armatureName: "Armature",
    dragonBonesName: "JUmp",
    skeUrl: `${_BASE}/dragonbones/jumpxter/JUmp_ske.json`,
    texUrl: `${_BASE}/dragonbones/jumpxter/JUmp_tex.json`,
    imgUrl: `${_BASE}/dragonbones/jumpxter/JUmp_tex.png`,
    dbHeight: 1105,
    dbWidth: 420,
    animationGroups: [
      {
        label: "Actions",
        color: "#ec4899",
        animations: [
          { name: "animtion0", label: "Jump",  icon: "🦘", characterId: "jumpxter" },
          { name: "animtion0", label: "Sit",   icon: "🪑", characterId: "sittingxter" },
          { name: "animtion0", label: "Swim",  icon: "🏊", characterId: "swimmingxter" },
        ],
      },
    ],
  },

  // ── The 3 separate skeleton files below are kept for loadCharacter() internals ──
  // They are NOT shown in the UI — xter2 above merges them visually.
  sittingxter: {
    id: "sittingxter",
    label: "Sitting Xter",
    icon: "🪑",
    thumbnailUrl: `${_BASE}/dragonbones/sittingxter/sittingxter_tex.png`,
    armatureName: "Armature",
    dragonBonesName: "sittingxter",
    skeUrl: `${_BASE}/dragonbones/sittingxter/sittingxter_ske.json`,
    texUrl: `${_BASE}/dragonbones/sittingxter/sittingxter_tex.json`,
    imgUrl: `${_BASE}/dragonbones/sittingxter/sittingxter_tex.png`,
    dbHeight: 620,
    dbWidth: 420,
    animationGroups: [],
  },

  swimmingxter: {
    id: "swimmingxter",
    label: "Swimming Xter",
    icon: "🏊",
    thumbnailUrl: `${_BASE}/dragonbones/swimmingxter/swimmingxter_tex.png`,
    armatureName: "Armature",
    dragonBonesName: "swimmingxter",
    skeUrl: `${_BASE}/dragonbones/swimmingxter/swimmingxter_ske.json`,
    texUrl: `${_BASE}/dragonbones/swimmingxter/swimmingxter_tex.json`,
    imgUrl: `${_BASE}/dragonbones/swimmingxter/swimmingxter_tex.png`,
    dbHeight: 700,
    dbWidth: 520,
    animationGroups: [],
  },

  jumpxter: {
    id: "jumpxter",
    label: "Jumping Xter",
    icon: "🦘",
    thumbnailUrl: `${_BASE}/dragonbones/jumpxter/JUmp_tex.png`,
    armatureName: "Armature",
    dragonBonesName: "JUmp",
    skeUrl: `${_BASE}/dragonbones/jumpxter/JUmp_ske.json`,
    texUrl: `${_BASE}/dragonbones/jumpxter/JUmp_tex.json`,
    imgUrl: `${_BASE}/dragonbones/jumpxter/JUmp_tex.png`,
    dbHeight: 1105,
    dbWidth: 420,
    animationGroups: [],
  },
};

export const DEFAULT_CHARACTER_ID = "character";

// Per-character load state
const _factoryReadyByCharacter: Record<string, boolean> = {};
const _loadPromiseByCharacter: Record<string, Promise<void> | null> = {};

/**
 * Walk a JSON string and return the index of the character immediately after
 * the first complete top-level JSON value.
 */
function findFirstJsonEnd(s: string): number {
  let i = 0;
  const len = s.length;
  while (i < len && (s[i] === " " || s[i] === "\t" || s[i] === "\n" || s[i] === "\r")) i++;
  if (i === len) return -1;
  const opener = s[i];
  if (opener !== "{" && opener !== "[") return -1;
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  for (; i < len; i++) {
    const ch = s[i];
    if (inString) {
      if (ch === "\\") { i++; }
      else if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; }
    else if (ch === opener) { depth++; }
    else if (ch === closer) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

async function fetchJson(url: string, label: string): Promise<unknown> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`[DragonBones] Failed to fetch ${label}: HTTP ${r.status} - ${url}`);
  const ct = r.headers.get("content-type") ?? "";
  if (ct.includes("text/html")) {
    throw new Error(`[DragonBones] Server returned HTML instead of JSON for ${label}. Check "${url}".`);
  }
  const raw = await r.text();
  try {
    return JSON.parse(raw);
  } catch {
    const end = findFirstJsonEnd(raw);
    if (end !== -1 && end < raw.length) {
      const trimmed = raw.slice(0, end);
      try {
        const parsed = JSON.parse(trimmed);
        console.warn(`[DragonBones] ${label} had ${raw.length - end} trailing bytes discarded.`);
        return parsed;
      } catch { /* fall through */ }
    }
    throw new Error(
      `[DragonBones] Failed to parse ${label} JSON from "${url}". ` +
      `First 200 chars: ${raw.slice(0, 200)}`
    );
  }
}

/** One-time load + parse of a given character's DragonBones data into the global factory. */
async function ensureFactoryLoaded(characterId: string = DEFAULT_CHARACTER_ID): Promise<void> {
  if (_factoryReadyByCharacter[characterId]) return;
  const pending = _loadPromiseByCharacter[characterId];
  if (pending) return pending;

  const def = CHARACTER_DEFS[characterId];
  if (!def) throw new Error(`[DragonBones] Unknown character id: ${characterId}`);

  const loadPromise = (async () => {
    const [skeletonData, atlasData] = await Promise.all([
      fetchJson(def.skeUrl, `${characterId} skeleton`),
      fetchJson(def.texUrl, `${characterId} atlas`),
    ]);

    let texture: PIXI.Texture;
    try {
      texture = await PIXI.Assets.load(def.imgUrl);
    } catch {
      const res = await fetch(def.imgUrl);
      if (!res.ok) throw new Error(`Failed to load texture: ${res.status} ${def.imgUrl}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      texture = await PIXI.Assets.load(objectUrl);
    }

    const factory = PixiFactory.factory;
    factory.parseDragonBonesData(skeletonData);
    factory.parseTextureAtlasData(atlasData, texture);

    _factoryReadyByCharacter[characterId] = true;
    console.log(`[DragonBones] Factory loaded successfully for "${characterId}".`);
  })();

  _loadPromiseByCharacter[characterId] = loadPromise;
  return loadPromise;
}

/** Hook the PIXI ticker to advance DragonBones time. Call once per PIXI app. */
export function hookPixiTicker(app: PIXI.Application): void {
  app.ticker.add(() => {
    if (Object.values(_factoryReadyByCharacter).some(Boolean)) {
      PixiFactory.factory.dragonBones?.advanceTime(app.ticker.deltaMS / 1000);
    }
  });
}

/**
 * Build a new armature display for the given character + animation name.
 */
export async function loadCharacter(
  animationName?: string,
  characterId: string = DEFAULT_CHARACTER_ID
): Promise<{
  display: import("dragonbones-pixijs").PixiArmatureDisplay;
  animations: string[];
}> {
  await ensureFactoryLoaded(characterId);

  const def = CHARACTER_DEFS[characterId];
  const factory = PixiFactory.factory;
  const armatureName = def.armatureName;
  const dragonBonesName = def.dragonBonesName;

  const display = factory.buildArmatureDisplay(armatureName, dragonBonesName);
  if (!display) throw new Error(`[DragonBones] Could not build armature: ${armatureName} (characterId=${characterId})`);

  (display as any).debugDraw = false;

  for (const slot of display.armature.getSlots()) {
    if (slot.name.toLowerCase().includes("iktarget") || slot.name.toLowerCase().includes("ik_target")) {
      slot.displayIndex = -1;
    }
  }

  const animations: string[] = display.animation.animationNames;
  const target =
    animations.find((a) => a.toLowerCase() === (animationName ?? "").toLowerCase()) ??
    animations[0];

  if (target) {
    display.animation.play(target, 0);
    console.log("[DragonBones] Playing:", target, "| Available:", animations);
  }

  return { display, animations };
}

// ─── Prop armature names ─────────────────────────────────────────────────────
export const PROP_ARMATURE_NAMES = ["chair", "tshirt", "car", "food", "long_broom", "cup"] as const;
export type PropName = typeof PROP_ARMATURE_NAMES[number];

const PROP_AABB: Record<PropName, { w: number; h: number }> = {
  chair:      { w: 240, h: 340 },
  tshirt:     { w: 200, h: 300 },
  car:        { w: 600, h: 250 },
  food:       { w: 240, h: 140 },
  long_broom: { w: 80,  h: 380 },
  cup:        { w: 90,  h: 120 },
};

const PROP_ROOT_OFFSET: Record<PropName, { x: number; y: number }> = {
  chair:      { x: 120, y: 340 },
  tshirt:     { x: 100, y: 300 },
  car:        { x: 300, y: 250 },
  food:       { x: 120, y: 140 },
  long_broom: { x:  40, y: 380 },
  cup:        { x:  45, y: 120 },
};

const PROP_TARGET_H: Record<PropName, number> = {
  chair:      160,
  tshirt:     140,
  car:        160,
  food:        80,
  long_broom: 200,
  cup:         70,
};

export async function loadProp(
  propName: PropName,
  animationName?: string
): Promise<{
  display: import("dragonbones-pixijs").PixiArmatureDisplay;
  animations: string[];
  dbScale: number;
  proxyW: number;
  proxyH: number;
  offsetX: number;
  offsetY: number;
}> {
  // Props live in the main "character" factory data (inject_props.py bakes them in)
  await ensureFactoryLoaded(DEFAULT_CHARACTER_ID);

  const factory = PixiFactory.factory;
  const display = factory.buildArmatureDisplay(propName);
  if (!display) throw new Error(`[DragonBones] Could not build prop armature: ${propName}`);

  (display as any).debugDraw = false;

  const aabb = PROP_AABB[propName];
  const root = PROP_ROOT_OFFSET[propName];
  const targetH = PROP_TARGET_H[propName];
  const dbScale = targetH / aabb.h;
  const proxyW  = Math.round(aabb.w * dbScale);
  const proxyH  = targetH;
  const offsetX = Math.round(root.x * dbScale);
  const offsetY = Math.round(root.y * dbScale);

  display.scale.set(dbScale);

  const animations: string[] = display.animation.animationNames;
  const target =
    animations.find((a) => a.toLowerCase() === (animationName ?? "").toLowerCase()) ??
    animations[0];

  if (target) {
    display.animation.play(target, 0);
    console.log(`[DragonBones] Prop '${propName}' playing: ${target}`);
  }

  return { display, animations, dbScale, proxyW, proxyH, offsetX, offsetY };
}