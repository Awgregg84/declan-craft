/* ===================== Blocks, items, recipes ===================== */
const B = {
  AIR: 0, STONE: 1, GRASS: 2, DIRT: 3, COBBLE: 4, OAK_PLANKS: 5, BEDROCK: 6, WATER: 7, LAVA: 8, SAND: 9, GRAVEL: 10,
  GOLD_ORE: 11, IRON_ORE: 12, COAL_ORE: 13, OAK_LOG: 14, OAK_LEAVES: 15, GLASS: 16, DIAMOND_ORE: 17,
  BIRCH_LOG: 18, BIRCH_LEAVES: 19, SPRUCE_LOG: 20, SPRUCE_LEAVES: 21, BIRCH_PLANKS: 22, SPRUCE_PLANKS: 23,
  SNOW: 24, SNOWY_GRASS: 25, ICE: 26, CACTUS: 27, SANDSTONE: 28, CLAY: 29, BRICKS: 30, STONE_BRICKS: 31,
  MOSSY_COBBLE: 32, OBSIDIAN: 33, GLOWSTONE: 34, TNT: 35, CRAFTING_TABLE: 36, FURNACE: 37, FURNACE_LIT: 38,
  CHEST: 39, BOOKSHELF: 40, PUMPKIN: 41, JACK_O_LANTERN: 42, IRON_BLOCK: 43, GOLD_BLOCK: 44, DIAMOND_BLOCK: 45,
  COAL_BLOCK: 46, TORCH: 47, TALL_GRASS: 48, DANDELION: 49, POPPY: 50, CORNFLOWER: 51, DEAD_BUSH: 52,
  OAK_SAPLING: 53, BIRCH_SAPLING: 54, SPRUCE_SAPLING: 55, BED: 56,
  DOOR: 57, EMERALD_ORE: 58, EMERALD_BLOCK: 59,
  WOOL: 64, // 64..79
  NETHERRACK: 80, SOUL_SAND: 81, NETHER_QUARTZ_ORE: 82, QUARTZ_BLOCK: 83, NETHER_BRICKS: 84, NETHER_PORTAL: 85,
  MEGA_TNT: 86, ICE_TNT: 87, DIG_TNT: 88, PARTY_TNT: 89, CLUSTER_TNT: 90, DISPENSER: 91, LEVER: 92, BUTTON: 93, RAIL: 94,
  LAPIS_ORE: 95, LAPIS_BLOCK: 96, SUGAR_CANE: 97, SIGN: 98, ENCH_TABLE: 99, BREWING_STAND: 100, TV: 101, BOARD: 102,
  UNLOADED: 255,
};
const I = {
  STICK: 256, COAL: 257, IRON_INGOT: 258, GOLD_INGOT: 259, DIAMOND: 260, APPLE: 261,
  PORKCHOP: 262, COOKED_PORKCHOP: 263, BEEF: 264, STEAK: 265, CHICKEN: 266, COOKED_CHICKEN: 267,
  ROTTEN_FLESH: 268, GUNPOWDER: 269, FEATHER: 270, LEATHER: 271,
  TOOL: 272, // 272..287 = material*4 + kind
  DOOR: 290, EMERALD: 291, BREAD: 292,
  EGG: 293, // 293..309 spawn eggs, in EGG_MOBS order
  FLINT: 310, FLINT_AND_STEEL: 311, QUARTZ: 312, NETHER_BRICK: 313,
  BOW: 314, ARROW: 315, CROSSBOW: 316, CROSSBOW_LOADED: 317, ENDER_PEARL: 318, GHAST_TEAR: 319, FIRE_CHARGE: 320,
  MINECART: 321, CAR: 322, STRING: 323,
  SUGAR: 324, PAPER: 325, BOOK: 326, WRITABLE_BOOK: 327, WRITTEN_BOOK: 328, LAPIS: 329, GLASS_BOTTLE: 330, SHIELD: 331, FISHING_ROD: 332,
  COD: 333, COOKED_COD: 334, SALMON: 335, COOKED_SALMON: 336, TROPICAL_FISH: 337, PUFFERFISH: 338, BOAT: 339, SUBMARINE: 340, MAGMA_CREAM: 341, XP_BOTTLE: 342,
  POTION: 370, // 370..381 potions, 390..401 splash potions, in POTIONS order
  SPLASH: 390,
  ARMOR: 350, // 350..365 = material*4 + slot
};
const EGG_MOBS = ['pig', 'cow', 'sheep', 'chicken', 'zombie', 'creeper', 'villager', 'piglin', 'magma', 'enderman', 'ghast', 'cod', 'salmon', 'tropical', 'pufferfish'];
const MOB_NAMES = { piglin: 'Zombified Piglin', magma: 'Magma Cube', tropical: 'Tropical Fish' };
const mobName = m => MOB_NAMES[m] || m[0].toUpperCase() + m.slice(1);
const TOOL_MATS = ['wood', 'stone', 'iron', 'diamond'];
const TOOL_MAT_NAMES = ['Wooden', 'Stone', 'Iron', 'Diamond'];
const TOOL_KINDS = ['pickaxe', 'axe', 'shovel', 'sword'];
const TOOL_KIND_NAMES = ['Pickaxe', 'Axe', 'Shovel', 'Sword'];
const WOOL_NAMES = ['White', 'Orange', 'Magenta', 'Light Blue', 'Yellow', 'Lime', 'Pink', 'Gray',
  'Light Gray', 'Cyan', 'Purple', 'Blue', 'Brown', 'Green', 'Red', 'Black'];
const WOOL_COLORS = ['#e9ecec', '#f07613', '#bd44b3', '#3aafd9', '#f8c527', '#70b919', '#ed8dac', '#3e4447',
  '#8e8e86', '#158991', '#792aac', '#35399d', '#724728', '#546d1b', '#a12722', '#141519'];
const toolId = (mat, kind) => I.TOOL + mat * 4 + kind;
// armor: helmets, chestplates, leggings and boots in leather, gold, iron and diamond (as in Minecraft)
const ARMOR_MATS = ['leather', 'gold', 'iron', 'diamond'];
const ARMOR_SLOTS = ['helmet', 'chestplate', 'leggings', 'boots'];
const ARMOR_NAMES = [['Leather Cap', 'Leather Tunic', 'Leather Pants', 'Leather Boots'], ['Golden Helmet', 'Golden Chestplate', 'Golden Leggings', 'Golden Boots'],
  ['Iron Helmet', 'Iron Chestplate', 'Iron Leggings', 'Iron Boots'], ['Diamond Helmet', 'Diamond Chestplate', 'Diamond Leggings', 'Diamond Boots']];
const ARMOR_DEF = [[1, 3, 2, 1], [2, 5, 3, 1], [2, 6, 5, 2], [3, 8, 6, 3]];
const armorId = (mat, slot) => I.ARMOR + mat * 4 + slot;
// the inventory: 0-8 hotbar, 9-35 bag, 36-39 armor (helmet to boots), 40 the off-hand (shield) slot
const INV_SIZE = 41, ARMOR_INV = 36, OFFHAND = 40;

const R_NONE = 0, R_CUBE = 1, R_CROSS = 2, R_TORCH = 3, R_LIQUID = 4, R_CACTUS = 5, R_BED = 6, R_DOOR = 7, R_PORTAL = 8, R_RAIL = 9, R_LEVER = 10, R_BUTTON = 11, R_LOW = 12, R_BREW = 13;
const DOOR_BOXES = [[0, 0, 13 / 16, 1, 1, 1], [0, 0, 0, 3 / 16, 1, 1], [0, 0, 0, 1, 1, 3 / 16], [13 / 16, 0, 0, 1, 1, 1]];
const doorBox = d => DOOR_BOXES[((d & 3) + ((d & 4) ? 1 : 0)) & 3];
const BLOCKS = new Array(256).fill(null);
const OPAQUE = new Uint8Array(256), SOLID = new Uint8Array(256), FILTER = new Uint8Array(256), EMIT = new Uint8Array(256),
  AOCC = new Uint8Array(256), REPLACEABLE = new Uint8Array(256), LIQUID = new Uint8Array(256), RENDER = new Uint8Array(256),
  PASS = new Uint8Array(256), CULLSAME = new Uint8Array(256), TARGETABLE = new Uint8Array(256),
  SPECIAL = new Uint8Array(256);   // blocks with something drawn on top each frame (a floating book, words, a picture, a TV show)

function defBlock(id, name, o) {
  const d = Object.assign({
    id, name, tex: null, solid: true, opaque: true, render: R_CUBE, pass: 1, filter: 0, emit: 0,
    hardness: 1, tool: null, tier: 0, sound: 'stone', drop: id, replaceable: false, creative: true,
    cullSame: false, ao: undefined, box: null, facing: false, gravity: false, plant: null, fuel: 0, blast: 1,
  }, o);
  BLOCKS[id] = d;
  OPAQUE[id] = d.opaque ? 1 : 0; SOLID[id] = d.solid ? 1 : 0; FILTER[id] = d.filter; EMIT[id] = d.emit;
  AOCC[id] = d.ao !== undefined ? (d.ao ? 1 : 0) : (d.opaque ? 1 : 0);
  REPLACEABLE[id] = d.replaceable ? 1 : 0; LIQUID[id] = d.render === R_LIQUID ? 1 : 0; RENDER[id] = d.render;
  PASS[id] = d.pass; CULLSAME[id] = d.cullSame ? 1 : 0;
  TARGETABLE[id] = (id !== 0 && d.render !== R_LIQUID && id !== 255) ? 1 : 0;
  return d;
}
const PLANT_BOX = [0.2, 0, 0.2, 0.8, 0.8, 0.8];
defBlock(B.AIR, 'Air', { solid: false, opaque: false, render: R_NONE, pass: 0, hardness: 0, drop: null, replaceable: true, creative: false });
defBlock(B.STONE, 'Stone', { tex: 'stone', hardness: 1.5, tool: 'pickaxe', tier: 1, drop: B.COBBLE });
defBlock(B.GRASS, 'Grass Block', { tex: { top: 'grass_top', bottom: 'dirt', side: 'grass_side' }, hardness: 0.6, tool: 'shovel', sound: 'grass', drop: B.DIRT });
defBlock(B.DIRT, 'Dirt', { tex: 'dirt', hardness: 0.5, tool: 'shovel', sound: 'gravel' });
defBlock(B.COBBLE, 'Cobblestone', { tex: 'cobblestone', hardness: 2, tool: 'pickaxe', tier: 1 });
defBlock(B.OAK_PLANKS, 'Oak Planks', { tex: 'oak_planks', hardness: 2, tool: 'axe', sound: 'wood', fuel: 7.5 });
defBlock(B.BEDROCK, 'Bedrock', { tex: 'bedrock', hardness: -1, drop: null, blast: 1e9 });
defBlock(B.WATER, 'Water', { tex: 'water', solid: false, opaque: false, render: R_LIQUID, pass: 2, filter: 2, hardness: -1, drop: null, replaceable: true, cullSame: true, blast: 1e9 });
defBlock(B.LAVA, 'Lava', { tex: 'lava', solid: false, opaque: false, render: R_LIQUID, pass: 1, filter: 1, emit: 15, hardness: -1, drop: null, replaceable: true, cullSame: true, blast: 1e9 });
defBlock(B.SAND, 'Sand', { tex: 'sand', hardness: 0.5, tool: 'shovel', sound: 'sand', gravity: true });
defBlock(B.GRAVEL, 'Gravel', { tex: 'gravel', hardness: 0.6, tool: 'shovel', sound: 'gravel', gravity: true });
defBlock(B.GOLD_ORE, 'Gold Ore', { tex: 'gold_ore', hardness: 3, tool: 'pickaxe', tier: 3 });
defBlock(B.IRON_ORE, 'Iron Ore', { tex: 'iron_ore', hardness: 3, tool: 'pickaxe', tier: 2 });
defBlock(B.COAL_ORE, 'Coal Ore', { tex: 'coal_ore', hardness: 3, tool: 'pickaxe', tier: 1, drop: I.COAL, xp: [0, 2] });
defBlock(B.OAK_LOG, 'Oak Log', { tex: { top: 'oak_log_top', bottom: 'oak_log_top', side: 'oak_log' }, hardness: 2, tool: 'axe', sound: 'wood', fuel: 7.5 });
defBlock(B.OAK_LEAVES, 'Oak Leaves', { tex: 'oak_leaves', opaque: false, filter: 1, hardness: 0.2, sound: 'grass', drop: 'leaves', cullSame: true, ao: true });
defBlock(B.GLASS, 'Glass', { tex: 'glass', opaque: false, hardness: 0.3, sound: 'glass', drop: null, cullSame: true });
defBlock(B.DIAMOND_ORE, 'Diamond Ore', { tex: 'diamond_ore', hardness: 3, tool: 'pickaxe', tier: 3, drop: I.DIAMOND, xp: [3, 7] });
defBlock(B.BIRCH_LOG, 'Birch Log', { tex: { top: 'birch_log_top', bottom: 'birch_log_top', side: 'birch_log' }, hardness: 2, tool: 'axe', sound: 'wood', fuel: 7.5 });
defBlock(B.BIRCH_LEAVES, 'Birch Leaves', { tex: 'birch_leaves', opaque: false, filter: 1, hardness: 0.2, sound: 'grass', drop: 'leaves', cullSame: true, ao: true });
defBlock(B.SPRUCE_LOG, 'Spruce Log', { tex: { top: 'spruce_log_top', bottom: 'spruce_log_top', side: 'spruce_log' }, hardness: 2, tool: 'axe', sound: 'wood', fuel: 7.5 });
defBlock(B.SPRUCE_LEAVES, 'Spruce Leaves', { tex: 'spruce_leaves', opaque: false, filter: 1, hardness: 0.2, sound: 'grass', drop: 'leaves', cullSame: true, ao: true });
defBlock(B.BIRCH_PLANKS, 'Birch Planks', { tex: 'birch_planks', hardness: 2, tool: 'axe', sound: 'wood', fuel: 7.5 });
defBlock(B.SPRUCE_PLANKS, 'Spruce Planks', { tex: 'spruce_planks', hardness: 2, tool: 'axe', sound: 'wood', fuel: 7.5 });
defBlock(B.SNOW, 'Snow Block', { tex: 'snow', hardness: 0.2, tool: 'shovel', sound: 'snow' });
defBlock(B.SNOWY_GRASS, 'Snowy Grass', { tex: { top: 'snow', bottom: 'dirt', side: 'grass_side_snow' }, hardness: 0.6, tool: 'shovel', sound: 'snow', drop: B.DIRT });
defBlock(B.ICE, 'Ice', { tex: 'ice', opaque: false, pass: 2, filter: 2, hardness: 0.5, tool: 'pickaxe', sound: 'glass', drop: null, cullSame: true });
defBlock(B.CACTUS, 'Cactus', { tex: { top: 'cactus_top', bottom: 'cactus_bottom', side: 'cactus_side' }, opaque: false, render: R_CACTUS, hardness: 0.4, sound: 'wool', ao: false, box: [1 / 16, 0, 1 / 16, 15 / 16, 1, 15 / 16], plant: 'sand' });
defBlock(B.SANDSTONE, 'Sandstone', { tex: { top: 'sandstone_top', bottom: 'sandstone_bottom', side: 'sandstone' }, hardness: 0.8, tool: 'pickaxe', tier: 1 });
defBlock(B.CLAY, 'Clay', { tex: 'clay', hardness: 0.6, tool: 'shovel', sound: 'gravel' });
defBlock(B.BRICKS, 'Bricks', { tex: 'bricks', hardness: 2, tool: 'pickaxe', tier: 1 });
defBlock(B.STONE_BRICKS, 'Stone Bricks', { tex: 'stone_bricks', hardness: 1.5, tool: 'pickaxe', tier: 1 });
defBlock(B.MOSSY_COBBLE, 'Mossy Cobblestone', { tex: 'mossy_cobblestone', hardness: 2, tool: 'pickaxe', tier: 1 });
defBlock(B.OBSIDIAN, 'Obsidian', { tex: 'obsidian', hardness: 25, tool: 'pickaxe', tier: 4, blast: 1e9 });
defBlock(B.GLOWSTONE, 'Glowstone', { tex: 'glowstone', emit: 15, hardness: 0.3, sound: 'glass' });
defBlock(B.TNT, 'TNT', { tex: { top: 'tnt_top', bottom: 'tnt_bottom', side: 'tnt_side' }, hardness: 0, sound: 'grass', tnt: 'normal' });
defBlock(B.CRAFTING_TABLE, 'Crafting Table', { tex: { top: 'crafting_table_top', bottom: 'oak_planks', side: 'crafting_table_side', front: 'crafting_table_front' }, hardness: 2.5, tool: 'axe', sound: 'wood', facing: true, fuel: 7.5 });
defBlock(B.FURNACE, 'Furnace', { tex: { top: 'furnace_top', bottom: 'furnace_top', side: 'furnace_side', front: 'furnace_front' }, hardness: 3.5, tool: 'pickaxe', tier: 1, facing: true });
defBlock(B.FURNACE_LIT, 'Furnace', { tex: { top: 'furnace_top', bottom: 'furnace_top', side: 'furnace_side', front: 'furnace_front_lit' }, emit: 13, hardness: 3.5, tool: 'pickaxe', tier: 1, facing: true, drop: B.FURNACE, creative: false });
defBlock(B.CHEST, 'Chest', { tex: { top: 'chest_top', bottom: 'chest_top', side: 'chest_side', front: 'chest_front' }, hardness: 2.5, tool: 'axe', sound: 'wood', facing: true, fuel: 7.5 });
defBlock(B.BOOKSHELF, 'Bookshelf', { tex: { top: 'oak_planks', bottom: 'oak_planks', side: 'bookshelf' }, hardness: 1.5, tool: 'axe', sound: 'wood', fuel: 7.5 });
defBlock(B.PUMPKIN, 'Pumpkin', { tex: { top: 'pumpkin_top', bottom: 'pumpkin_top', side: 'pumpkin_side', front: 'pumpkin_face' }, hardness: 1, tool: 'axe', sound: 'wood', facing: true });
defBlock(B.JACK_O_LANTERN, "Jack o'Lantern", { tex: { top: 'pumpkin_top', bottom: 'pumpkin_top', side: 'pumpkin_side', front: 'jack_o_lantern' }, emit: 15, hardness: 1, tool: 'axe', sound: 'wood', facing: true });
defBlock(B.IRON_BLOCK, 'Block of Iron', { tex: 'iron_block', hardness: 5, tool: 'pickaxe', tier: 2, sound: 'metal' });
defBlock(B.GOLD_BLOCK, 'Block of Gold', { tex: 'gold_block', hardness: 3, tool: 'pickaxe', tier: 3, sound: 'metal' });
defBlock(B.DIAMOND_BLOCK, 'Block of Diamond', { tex: 'diamond_block', hardness: 5, tool: 'pickaxe', tier: 3, sound: 'metal' });
defBlock(B.COAL_BLOCK, 'Block of Coal', { tex: 'coal_block', hardness: 5, tool: 'pickaxe', tier: 1, fuel: 400 });
defBlock(B.TORCH, 'Torch', { tex: 'torch', solid: false, opaque: false, render: R_TORCH, emit: 14, hardness: 0, sound: 'wood', box: [0.4, 0, 0.4, 0.6, 0.62, 0.6], plant: 'torch' });
defBlock(B.TALL_GRASS, 'Tall Grass', { tex: 'tall_grass', solid: false, opaque: false, render: R_CROSS, hardness: 0, sound: 'grass', drop: 'seeds', replaceable: true, box: PLANT_BOX, plant: 'soil' });
defBlock(B.DANDELION, 'Dandelion', { tex: 'dandelion', solid: false, opaque: false, render: R_CROSS, hardness: 0, sound: 'grass', box: PLANT_BOX, plant: 'soil' });
defBlock(B.POPPY, 'Poppy', { tex: 'poppy', solid: false, opaque: false, render: R_CROSS, hardness: 0, sound: 'grass', box: PLANT_BOX, plant: 'soil' });
defBlock(B.CORNFLOWER, 'Cornflower', { tex: 'cornflower', solid: false, opaque: false, render: R_CROSS, hardness: 0, sound: 'grass', box: PLANT_BOX, plant: 'soil' });
defBlock(B.DEAD_BUSH, 'Dead Bush', { tex: 'dead_bush', solid: false, opaque: false, render: R_CROSS, hardness: 0, sound: 'grass', drop: I.STICK, replaceable: true, box: PLANT_BOX, plant: 'sand' });
defBlock(B.OAK_SAPLING, 'Oak Sapling', { tex: 'oak_sapling', solid: false, opaque: false, render: R_CROSS, hardness: 0, sound: 'grass', box: PLANT_BOX, plant: 'soil', fuel: 2.5 });
defBlock(B.BIRCH_SAPLING, 'Birch Sapling', { tex: 'birch_sapling', solid: false, opaque: false, render: R_CROSS, hardness: 0, sound: 'grass', box: PLANT_BOX, plant: 'soil', fuel: 2.5 });
defBlock(B.SPRUCE_SAPLING, 'Spruce Sapling', { tex: 'spruce_sapling', solid: false, opaque: false, render: R_CROSS, hardness: 0, sound: 'grass', box: PLANT_BOX, plant: 'soil', fuel: 2.5 });
defBlock(B.BED, 'Bed', { tex: { top: 'bed_top', bottom: 'oak_planks', side: 'bed_side', front: 'bed_end', back: 'bed_end' }, opaque: false, render: R_BED, hardness: 0.2, sound: 'wool', facing: true, ao: false, box: [0, 0, 0, 1, 9 / 16, 1] });
defBlock(B.EMERALD_ORE, 'Emerald Ore', { tex: 'emerald_ore', hardness: 3, tool: 'pickaxe', tier: 3, drop: I.EMERALD, xp: [3, 7] });
defBlock(B.EMERALD_BLOCK, 'Block of Emerald', { tex: 'emerald_block', hardness: 5, tool: 'pickaxe', tier: 3, sound: 'metal' });
defBlock(B.DOOR, 'Oak Door', { tex: 'door_bottom', opaque: false, render: R_DOOR, hardness: 3, tool: 'axe', sound: 'wood', drop: I.DOOR, creative: false, ao: false, boxFn: doorBox });
for (let i = 0; i < 16; i++) defBlock(B.WOOL + i, WOOL_NAMES[i] + ' Wool', { tex: 'wool_' + i, hardness: 0.8, sound: 'wool' });
defBlock(B.NETHERRACK, 'Netherrack', { tex: 'netherrack', hardness: 0.4, tool: 'pickaxe', tier: 1 });
defBlock(B.SOUL_SAND, 'Soul Sand', { tex: 'soul_sand', hardness: 0.5, tool: 'shovel', sound: 'sand', slow: 0.45 });
defBlock(B.NETHER_QUARTZ_ORE, 'Nether Quartz Ore', { tex: 'nether_quartz_ore', hardness: 3, tool: 'pickaxe', tier: 1, drop: I.QUARTZ, xp: [2, 5] });
defBlock(B.QUARTZ_BLOCK, 'Block of Quartz', { tex: { top: 'quartz_block_top', bottom: 'quartz_block_top', side: 'quartz_block_side' }, hardness: 0.8, tool: 'pickaxe', tier: 1 });
defBlock(B.NETHER_BRICKS, 'Nether Bricks', { tex: 'nether_bricks', hardness: 2, tool: 'pickaxe', tier: 1 });
// data: 0 = the portal's face runs along x (thin in z), 1 = along z (thin in x)
defBlock(B.NETHER_PORTAL, 'Nether Portal', { tex: 'nether_portal', solid: false, opaque: false, render: R_PORTAL, pass: 2, emit: 11, hardness: -1, drop: null, creative: false, ao: false, cullSame: true, blast: 1e9 });
TARGETABLE[B.NETHER_PORTAL] = 0;
// TNT that does different things (see 09k-tnt.js); Digging TNT digs a tunnel the way you faced when you placed it
defBlock(B.MEGA_TNT, 'Mega TNT', { tex: { top: 'mega_tnt_top', bottom: 'tnt_bottom', side: 'mega_tnt_side' }, hardness: 0, sound: 'grass', tnt: 'mega' });
defBlock(B.ICE_TNT, 'Ice TNT', { tex: { top: 'ice_tnt_top', bottom: 'ice_tnt_top', side: 'ice_tnt_side' }, hardness: 0, sound: 'glass', tnt: 'ice' });
defBlock(B.DIG_TNT, 'Digging TNT', { tex: { top: 'dig_tnt_top', bottom: 'tnt_bottom', side: 'dig_tnt_side', front: 'dig_tnt_front' }, hardness: 0, sound: 'grass', facing: true, tnt: 'dig' });
defBlock(B.PARTY_TNT, 'Party TNT', { tex: { top: 'party_tnt_top', bottom: 'party_tnt_top', side: 'party_tnt_side' }, hardness: 0, sound: 'wool', tnt: 'party' });
defBlock(B.CLUSTER_TNT, 'Cluster TNT', { tex: { top: 'cluster_tnt_top', bottom: 'tnt_bottom', side: 'cluster_tnt_side' }, hardness: 0, sound: 'grass', tnt: 'cluster' });
// data: 0-3 faces like a furnace, 4 = up, 5 = down. Shoots what is inside when a lever or button next to it is switched on.
defBlock(B.DISPENSER, 'Dispenser', { tex: { top: 'furnace_top', bottom: 'furnace_top', side: 'furnace_side', front: 'dispenser_front' }, hardness: 3.5, tool: 'pickaxe', tier: 1, facing: true });
// levers and buttons: data & 7 = the side their support is on (an index into DX/DY/DZ), data & 8 = on / pressed
const ATTACH_BOXES = { lever: [4, 0, 5, 12, 3, 11], button: [5, 0, 6, 11, 2, 10] };
function attachedBox(kind, data) {
  const b = ATTACH_BOXES[kind], f = data & 7, pressed = kind === 'button' && (data & 8);
  return attachBox(f, b[0], b[1], b[2], b[3], pressed ? 1 : b[4], b[5]).map(v => v / 16);
}
/* a box given as if its support were below (y up from the support), turned to face the support side f */
function attachBox(f, x0, y0, z0, x1, y1, z1) {
  switch (f) {
    case 2: return [x0, 16 - y1, z0, x1, 16 - y0, z1];   // support above
    case 0: return [16 - y1, x0, z0, 16 - y0, x1, z1];   // support at +x
    case 1: return [y0, x0, z0, y1, x1, z1];             // support at -x
    case 4: return [x0, z0, 16 - y1, x1, z1, 16 - y0];   // support at +z
    case 5: return [x0, z0, y0, x1, z1, y1];             // support at -z
    default: return [x0, y0, z0, x1, y1, z1];            // support below
  }
}
defBlock(B.LEVER, 'Lever', { tex: 'lever', solid: false, opaque: false, render: R_LEVER, hardness: 0.5, sound: 'wood', plant: 'attached', ao: false, boxFn: d => attachedBox('lever', d) });
defBlock(B.BUTTON, 'Button', { tex: 'button', solid: false, opaque: false, render: R_BUTTON, hardness: 0.5, sound: 'stone', plant: 'attached', ao: false, boxFn: d => attachedBox('button', d) });
// data: the rail's shape, 0-9 (see RAIL_EXITS in 09c-vehicles.js)
defBlock(B.RAIL, 'Rail', { tex: 'rail', solid: false, opaque: false, render: R_RAIL, hardness: 0.7, tool: 'pickaxe', sound: 'metal', plant: 'rail', ao: false, box: [0, 0, 0, 1, 2 / 16, 1] });
// lapis lazuli (for enchanting) deep down, and the enchanting table: 12 pixels tall, with a book floating above it
defBlock(B.LAPIS_ORE, 'Lapis Lazuli Ore', { tex: 'lapis_ore', hardness: 3, tool: 'pickaxe', tier: 2, drop: I.LAPIS, xp: [2, 5] });
defBlock(B.LAPIS_BLOCK, 'Block of Lapis Lazuli', { tex: 'lapis_block', hardness: 3, tool: 'pickaxe', tier: 2 });
defBlock(B.ENCH_TABLE, 'Enchanting Table', { tex: { top: 'ench_top', bottom: 'obsidian', side: 'ench_side' }, opaque: false, render: R_LOW, emit: 7, hardness: 5, tool: 'pickaxe', tier: 1, ao: false, box: [0, 0, 0, 1, 12 / 16, 1], low: 12, blast: 1e9 });
SPECIAL[B.ENCH_TABLE] = 1;
// the brewing stand: a brass rod on three stone feet (brews potions from water bottles)
defBlock(B.BREWING_STAND, 'Brewing Stand', { tex: 'brewing_item', solid: true, opaque: false, render: R_BREW, emit: 1, hardness: 0.5, tool: 'pickaxe', sound: 'metal', ao: false, box: [1 / 16, 0, 1 / 16, 15 / 16, 14 / 16, 15 / 16] });
// sugar cane grows up to 3 tall on grass, dirt or sand right next to water (paper and sugar come from it)
// signs: data 0-15 stand on the ground, turned in 16ths of a circle; 16-19 hang on a wall, facing like a furnace
const signBox = d => d < 16 ? [0.25, 0, 0.25, 0.75, 1, 0.75] : [[0, 0.25, 0, 1, 0.75, 0.125], [0.875, 0.25, 0, 1, 0.75, 1], [0, 0.25, 0.875, 1, 0.75, 1], [0, 0.25, 0, 0.125, 0.75, 1]][d & 3];
defBlock(B.SIGN, 'Sign', { tex: 'sign_item', solid: false, opaque: false, render: R_NONE, hardness: 1, tool: 'axe', sound: 'wood', plant: 'sign', ao: false, boxFn: signBox, fuel: 10 });
SPECIAL[B.SIGN] = 1;
// a TV faces you (data & 3) and is on when data & 4; a coloring board stands or hangs like a sign
defBlock(B.TV, 'TV', { tex: { top: 'tv_top', bottom: 'tv_side', side: 'tv_side', front: 'tv_front', back: 'tv_back' }, hardness: 1.5, sound: 'stone', facing: true });
SPECIAL[B.TV] = 1;
const boardBox = d => d < 16 ? [0.15, 0, 0.15, 0.85, 1, 0.85] : [[0, 0, 0, 1, 1, 0.125], [0.875, 0, 0, 1, 1, 1], [0, 0, 0.875, 1, 1, 1], [0, 0, 0, 0.125, 1, 1]][d & 3];
defBlock(B.BOARD, 'Coloring Board', { tex: 'board_item', solid: false, opaque: false, render: R_NONE, hardness: 1, tool: 'axe', sound: 'wood', plant: 'sign', ao: false, boxFn: boardBox, fuel: 10 });
SPECIAL[B.BOARD] = 1;
defBlock(B.SUGAR_CANE, 'Sugar Cane', { tex: 'sugar_cane', solid: false, opaque: false, render: R_CROSS, hardness: 0, sound: 'grass', box: [0.15, 0, 0.15, 0.85, 1, 0.85], plant: 'cane' });
defBlock(B.UNLOADED, 'Unloaded', { tex: 'stone', render: R_NONE, pass: 0, hardness: -1, creative: false, drop: null });
TARGETABLE[B.UNLOADED] = 0;

/* ---------- items ---------- */
const ITEMS = {};
function defItem(id, name, o) { ITEMS[id] = Object.assign({ id, name, tex: null, stack: 64, food: 0, tool: null, fuel: 0 }, o); }
defItem(I.STICK, 'Stick', { tex: 'stick', fuel: 2.5 });
defItem(I.COAL, 'Coal', { tex: 'coal', fuel: 40 });
defItem(I.IRON_INGOT, 'Iron Ingot', { tex: 'iron_ingot' });
defItem(I.GOLD_INGOT, 'Gold Ingot', { tex: 'gold_ingot' });
defItem(I.DIAMOND, 'Diamond', { tex: 'diamond' });
defItem(I.APPLE, 'Apple', { tex: 'apple', food: 4 });
defItem(I.PORKCHOP, 'Raw Porkchop', { tex: 'porkchop', food: 3 });
defItem(I.COOKED_PORKCHOP, 'Cooked Porkchop', { tex: 'cooked_porkchop', food: 8 });
defItem(I.BEEF, 'Raw Beef', { tex: 'beef', food: 3 });
defItem(I.STEAK, 'Steak', { tex: 'steak', food: 8 });
defItem(I.CHICKEN, 'Raw Chicken', { tex: 'chicken', food: 2 });
defItem(I.COOKED_CHICKEN, 'Cooked Chicken', { tex: 'cooked_chicken', food: 6 });
defItem(I.ROTTEN_FLESH, 'Rotten Flesh', { tex: 'rotten_flesh', food: 4 });
defItem(I.GUNPOWDER, 'Gunpowder', { tex: 'gunpowder' });
defItem(I.FEATHER, 'Feather', { tex: 'feather' });
defItem(I.LEATHER, 'Leather', { tex: 'leather' });
defItem(I.DOOR, 'Oak Door', { tex: 'door_item', fuel: 10 });
defItem(I.EMERALD, 'Emerald', { tex: 'emerald' });
defItem(I.BREAD, 'Bread', { tex: 'bread', food: 5 });
EGG_MOBS.forEach((m, i) => defItem(I.EGG + i, mobName(m) + ' Spawn Egg', { tex: 'egg_' + m, egg: m }));
defItem(I.FLINT, 'Flint', { tex: 'flint' });
defItem(I.FLINT_AND_STEEL, 'Flint and Steel', { tex: 'flint_and_steel', stack: 1, tool: { kind: 'lighter', tier: 0, speed: 1, dur: 64, dmg: 1, passive: true } });
defItem(I.QUARTZ, 'Nether Quartz', { tex: 'quartz' });
defItem(I.NETHER_BRICK, 'Nether Brick', { tex: 'nether_brick' });
// ranged weapons don't wear out from hitting or digging, only from shooting
defItem(I.BOW, 'Bow', { tex: 'bow', stack: 1, tool: { kind: 'bow', tier: 0, speed: 1, dur: 384, dmg: 1, ranged: true } });
defItem(I.ARROW, 'Arrow', { tex: 'arrow' });
defItem(I.CROSSBOW, 'Crossbow', { tex: 'crossbow', stack: 1, tool: { kind: 'crossbow', tier: 0, speed: 1, dur: 465, dmg: 1, ranged: true } });
defItem(I.CROSSBOW_LOADED, 'Crossbow (loaded)', { tex: 'crossbow_loaded', stack: 1, tool: { kind: 'crossbow', tier: 0, speed: 1, dur: 465, dmg: 1, ranged: true } });
defItem(I.ENDER_PEARL, 'Ender Pearl', { tex: 'ender_pearl', stack: 16 });
defItem(I.GHAST_TEAR, 'Ghast Tear', { tex: 'ghast_tear' });
defItem(I.FIRE_CHARGE, 'Fire Charge', { tex: 'fire_charge' });
defItem(I.MINECART, 'Minecart', { tex: 'minecart', stack: 1 });
defItem(I.CAR, 'Car', { tex: 'car', stack: 1 });
defItem(I.BOAT, 'Boat', { tex: 'boat', stack: 1 });
defItem(I.SUBMARINE, 'Submarine', { tex: 'submarine', stack: 1 });
defItem(I.STRING, 'String', { tex: 'string' });
defItem(I.SUGAR, 'Sugar', { tex: 'sugar' });
defItem(I.PAPER, 'Paper', { tex: 'paper' });
defItem(I.BOOK, 'Book', { tex: 'book' });
defItem(I.LAPIS, 'Lapis Lazuli', { tex: 'lapis' });
defItem(I.XP_BOTTLE, "Bottle o' Enchanting", { tex: 'xp_bottle' });
// fish, cooked and raw (a pufferfish poisons whoever eats it), and the rod to catch them
defItem(I.FISHING_ROD, 'Fishing Rod', { tex: 'fishing_rod', stack: 1, tool: { kind: 'rod', tier: 0, speed: 1, dur: 64, dmg: 1, passive: true } });
defItem(I.COD, 'Raw Cod', { tex: 'cod', food: 2 });
defItem(I.COOKED_COD, 'Cooked Cod', { tex: 'cooked_cod', food: 5 });
defItem(I.SALMON, 'Raw Salmon', { tex: 'salmon', food: 2 });
defItem(I.COOKED_SALMON, 'Cooked Salmon', { tex: 'cooked_salmon', food: 6 });
defItem(I.TROPICAL_FISH, 'Tropical Fish', { tex: 'tropical_fish', food: 1 });
defItem(I.PUFFERFISH, 'Pufferfish', { tex: 'pufferfish', food: 1, poison: 15 });
defItem(I.MAGMA_CREAM, 'Magma Cream', { tex: 'magma_cream' });
defItem(I.GLASS_BOTTLE, 'Glass Bottle', { tex: 'glass_bottle', stack: 16 });
// potions: a water bottle brewed with something becomes a potion (drink it); gunpowder makes one you throw (splash)
const POTIONS = [
  { key: 'water', name: 'Water Bottle', color: '#3a6ae0' },
  { key: 'healing', name: 'Potion of Healing', color: '#f82423', from: I.APPLE },
  { key: 'regeneration', name: 'Potion of Regeneration', color: '#cd5cab', from: I.GHAST_TEAR, dur: 45 },
  { key: 'swiftness', name: 'Potion of Swiftness', color: '#7cafc6', from: I.SUGAR, dur: 180 },
  { key: 'strength', name: 'Potion of Strength', color: '#b02a2a', from: I.QUARTZ, dur: 180 },
  { key: 'fire_resistance', name: 'Potion of Fire Resistance', color: '#e49a3a', from: I.MAGMA_CREAM, dur: 180 },
  { key: 'night_vision', name: 'Potion of Night Vision', color: '#2a2ac0', from: B.GLOWSTONE, dur: 180 },
  { key: 'water_breathing', name: 'Potion of Water Breathing', color: '#2e7aa9', from: I.PUFFERFISH, dur: 180 },
  { key: 'leaping', name: 'Potion of Leaping', color: '#3ae860', from: I.FEATHER, dur: 180 },
  { key: 'invisibility', name: 'Potion of Invisibility', color: '#9a9eac', from: B.GLASS, dur: 180 },
  { key: 'poison', name: 'Potion of Poison', color: '#4e9331', from: I.ROTTEN_FLESH, dur: 45, bad: true },
  { key: 'slowness', name: 'Potion of Slowness', color: '#5a6c81', from: B.SOUL_SAND, dur: 90, bad: true },
];
const potionId = (k, splash) => (splash ? I.SPLASH : I.POTION) + k;
POTIONS.forEach((pt, k) => {
  defItem(potionId(k, false), pt.name, { tex: 'potion_' + k, stack: 1, potion: { k, splash: false } });
  defItem(potionId(k, true), k ? 'Splash ' + pt.name : 'Splash Water Bottle', { tex: 'splash_' + k, stack: 1, potion: { k, splash: true } });
});
const potionOf = id => (id >= 256 && ITEMS[id] && ITEMS[id].potion) || null;
// a book you write in (tag.pages), and one that has been signed (tag.book: title, author and pages)
defItem(I.WRITABLE_BOOK, 'Book and Quill', { tex: 'book_quill', stack: 1 });
defItem(I.WRITTEN_BOOK, 'Written Book', { tex: 'written_book', stack: 1 });
// armor and shields wear out from being hit, not from hitting (passive)
defItem(I.SHIELD, 'Shield', { tex: 'shield', stack: 1, tool: { kind: 'shield', tier: 0, speed: 1, dur: 336, dmg: 1, passive: true } });
for (let m = 0; m < 4; m++) for (let k = 0; k < 4; k++) {
  defItem(armorId(m, k), ARMOR_NAMES[m][k], { tex: 'armor_' + ARMOR_MATS[m] + '_' + k, stack: 1, armor: { slot: k, def: ARMOR_DEF[m][k], mat: m },
    tool: { kind: 'armor', tier: 0, speed: 1, dur: [5, 7, 15, 33][m] * [11, 16, 15, 13][k], dmg: 1, passive: true } });
}
for (let m = 0; m < 4; m++) for (let k = 0; k < 4; k++) {
  const dmgs = [[2, 3, 4, 5], [3, 4, 5, 6], [1.5, 2.5, 3.5, 4.5], [4, 5, 6, 7]][k];
  defItem(toolId(m, k), TOOL_MAT_NAMES[m] + ' ' + TOOL_KIND_NAMES[k], {
    tex: TOOL_MATS[m] + '_' + TOOL_KINDS[k], stack: 1, fuel: m === 0 ? 5 : 0,
    tool: { kind: TOOL_KINDS[k], tier: m + 1, speed: [2, 4, 6, 8][m], dur: [60, 132, 251, 1562][m], dmg: dmgs[m] },
  });
}

function isBlockItem(id) { return id > 0 && id < 256; }
function itemDef(id) { return id < 256 ? BLOCKS[id] : ITEMS[id]; }
function itemName(id) { const d = itemDef(id); return d ? d.name : '?'; }
function maxStack(id) { return id >= 256 ? ITEMS[id].stack : 64; }
function fuelValue(id) { const d = itemDef(id); return d ? d.fuel || 0 : 0; }
function toolOf(id) { return id >= 256 && ITEMS[id] ? ITEMS[id].tool : null; }
function armorOf(id) { return id >= 256 && ITEMS[id] ? ITEMS[id].armor || null : null; }
/* tools that wear down when you hit or dig with them (not bows, lighters, armor or shields) */
const wearsOnHit = tool => !!tool && !tool.ranged && !tool.passive;
/* A stack is { id, count }, plus dmg (how worn it is) and tag (extra data: enchantments, a book's pages).
   Stacks with a tag never pile up. */
const cloneTag = t => JSON.parse(JSON.stringify(t));
function cloneStack(s, count) {
  if (!s) return null;
  const o = { id: s.id, count: count === undefined ? s.count : count };
  if (s.dmg) o.dmg = s.dmg;
  if (s.tag) o.tag = cloneTag(s.tag);
  return o;
}
const stacksWith = (a, b) => a.id === b.id && !toolOf(a.id) && !a.tag && !b.tag;
/* what each kind of tag data may hold, when it comes from another iPad (each feature adds its own) */
const TAG_CLEAN = {};
function cleanTag(t) {
  if (!t || typeof t !== 'object') return null;
  const o = {};
  for (const k in TAG_CLEAN) if (Object.prototype.hasOwnProperty.call(t, k)) { const v = TAG_CLEAN[k](t[k]); if (v !== null && v !== undefined) o[k] = v; }
  return Object.keys(o).length ? o : null;
}
/* text typed on another iPad: no control characters, and not too long */
const cleanText = (s, n) => String(s === undefined || s === null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, n);

/* ---------- recipes ---------- */
const TAGS = {
  planks: [B.OAK_PLANKS, B.BIRCH_PLANKS, B.SPRUCE_PLANKS],
  log: [B.OAK_LOG, B.BIRCH_LOG, B.SPRUCE_LOG],
  wool: Array.from({ length: 16 }, (_, i) => B.WOOL + i),
  stone: [B.COBBLE, B.MOSSY_COBBLE],
  cold: [B.ICE, B.SNOW],
};
const RECIPES = [];
function shaped(out, count, pattern, key) { RECIPES.push({ out, count, pattern, key }); }
function shapeless(out, count, items) { RECIPES.push({ out, count, items }); }
shapeless(B.OAK_PLANKS, 4, [B.OAK_LOG]);
shapeless(B.BIRCH_PLANKS, 4, [B.BIRCH_LOG]);
shapeless(B.SPRUCE_PLANKS, 4, [B.SPRUCE_LOG]);
shaped(I.STICK, 4, ['P', 'P'], { P: 'planks' });
shaped(B.CRAFTING_TABLE, 1, ['PP', 'PP'], { P: 'planks' });
shaped(B.TORCH, 4, ['C', 'S'], { C: I.COAL, S: I.STICK });
shaped(B.FURNACE, 1, ['CCC', 'C C', 'CCC'], { C: 'stone' });
shaped(B.CHEST, 1, ['PPP', 'P P', 'PPP'], { P: 'planks' });
shaped(I.DOOR, 3, ['PP', 'PP', 'PP'], { P: 'planks' });
[['planks', 0], ['stone', 1], [I.IRON_INGOT, 2], [I.DIAMOND, 3]].forEach(([mat, m]) => {
  shaped(toolId(m, 0), 1, ['MMM', ' S ', ' S '], { M: mat, S: I.STICK });
  shaped(toolId(m, 1), 1, ['MM', 'MS', ' S'], { M: mat, S: I.STICK });
  shaped(toolId(m, 2), 1, ['M', 'S', 'S'], { M: mat, S: I.STICK });
  shaped(toolId(m, 3), 1, ['M', 'M', 'S'], { M: mat, S: I.STICK });
});
shaped(B.BED, 1, ['WWW', 'PPP'], { W: 'wool', P: 'planks' });
[[B.IRON_BLOCK, I.IRON_INGOT], [B.GOLD_BLOCK, I.GOLD_INGOT], [B.DIAMOND_BLOCK, I.DIAMOND], [B.COAL_BLOCK, I.COAL], [B.EMERALD_BLOCK, I.EMERALD]].forEach(([blk, it]) => {
  shaped(blk, 1, ['XXX', 'XXX', 'XXX'], { X: it });
  shapeless(it, 9, [blk]);
});
shaped(B.SANDSTONE, 1, ['SS', 'SS'], { S: B.SAND });
shaped(B.STONE_BRICKS, 4, ['SS', 'SS'], { S: B.STONE });
shaped(B.TNT, 1, ['GSG', 'SGS', 'GSG'], { G: I.GUNPOWDER, S: B.SAND });
shaped(B.JACK_O_LANTERN, 1, ['P', 'T'], { P: B.PUMPKIN, T: B.TORCH });
shaped(B.BOOKSHELF, 1, ['PPP', 'LLL', 'PPP'], { P: 'planks', L: I.LEATHER });
shapeless(B.MOSSY_COBBLE, 1, [B.COBBLE, B.OAK_LEAVES]);
shaped(B.WOOL, 1, ['FF', 'FF'], { F: I.FEATHER });
shaped(B.GLOWSTONE, 1, ['TGT', 'GTG', 'TGT'], { T: B.TORCH, G: B.GLASS });
shapeless(I.FLINT_AND_STEEL, 1, [I.IRON_INGOT, I.FLINT]);
shaped(B.QUARTZ_BLOCK, 1, ['QQ', 'QQ'], { Q: I.QUARTZ });
shaped(B.NETHER_BRICKS, 1, ['NN', 'NN'], { N: I.NETHER_BRICK });
shapeless(I.STRING, 4, ['wool']);
shaped(I.BOW, 1, [' ST', 'S T', ' ST'], { S: I.STICK, T: I.STRING });
shaped(I.ARROW, 4, ['F', 'S', 'E'], { F: I.FLINT, S: I.STICK, E: I.FEATHER });
shaped(I.CROSSBOW, 1, ['SIS', 'TFT', ' S '], { S: I.STICK, I: I.IRON_INGOT, T: I.STRING, F: I.FLINT });
shapeless(I.FIRE_CHARGE, 3, [I.GUNPOWDER, I.COAL, I.FLINT]);
shaped(B.DISPENSER, 1, ['CCC', 'CBC', 'CCC'], { C: 'stone', B: I.BOW });
shaped(B.LEVER, 1, ['S', 'C'], { S: I.STICK, C: 'stone' });
shapeless(B.BUTTON, 1, [B.STONE]);
shaped(B.RAIL, 16, ['I I', 'ISI', 'I I'], { I: I.IRON_INGOT, S: I.STICK });
shaped(I.MINECART, 1, ['I I', 'III'], { I: I.IRON_INGOT });
shaped(I.CAR, 1, [' G ', 'III', 'C C'], { G: B.GLASS, I: I.IRON_INGOT, C: I.COAL });
shaped(I.BOAT, 1, ['P P', 'PPP'], { P: 'planks' });
shaped(I.SUBMARINE, 1, [' G ', 'ICI', 'III'], { G: B.GLASS, I: I.IRON_INGOT, C: I.COAL });
[[I.LEATHER, 0], [I.GOLD_INGOT, 1], [I.IRON_INGOT, 2], [I.DIAMOND, 3]].forEach(([mat, m]) => {
  shaped(armorId(m, 0), 1, ['MMM', 'M M'], { M: mat });
  shaped(armorId(m, 1), 1, ['M M', 'MMM', 'MMM'], { M: mat });
  shaped(armorId(m, 2), 1, ['MMM', 'M M', 'M M'], { M: mat });
  shaped(armorId(m, 3), 1, ['M M', 'M M'], { M: mat });
});
shaped(I.SHIELD, 1, ['PIP', 'PPP', ' P '], { P: 'planks', I: I.IRON_INGOT });
shaped(B.LAPIS_BLOCK, 1, ['XXX', 'XXX', 'XXX'], { X: I.LAPIS });
shapeless(I.LAPIS, 9, [B.LAPIS_BLOCK]);
shaped(B.ENCH_TABLE, 1, [' B ', 'DOD', 'OOO'], { B: I.BOOK, D: I.DIAMOND, O: B.OBSIDIAN });
shaped(I.PAPER, 3, ['SSS'], { S: B.SUGAR_CANE });
shapeless(I.SUGAR, 1, [B.SUGAR_CANE]);
shapeless(I.BOOK, 1, [I.PAPER, I.PAPER, I.PAPER, I.LEATHER]);
shapeless(I.WRITABLE_BOOK, 1, [I.BOOK, I.FEATHER, I.COAL]);
shaped(B.SIGN, 3, ['PPP', 'PPP', ' S '], { P: 'planks', S: I.STICK });
shaped(B.TV, 1, ['IGI', 'ICI'], { I: I.IRON_INGOT, G: B.GLASS, C: I.COAL });
shaped(B.BOARD, 1, ['SSS', 'SPS', 'SSS'], { S: I.STICK, P: I.PAPER });
shaped(I.GLASS_BOTTLE, 3, ['G G', ' G '], { G: B.GLASS });
shaped(B.BREWING_STAND, 1, [' I ', 'CCC'], { I: I.IRON_INGOT, C: 'stone' });
shaped(I.FISHING_ROD, 1, ['  S', ' ST', 'S T'], { S: I.STICK, T: I.STRING });
shaped(B.BOOKSHELF, 1, ['PPP', 'KKK', 'PPP'], { P: 'planks', K: I.BOOK });
shaped(B.MEGA_TNT, 1, ['TT', 'TT'], { T: B.TNT });
shapeless(B.ICE_TNT, 1, [B.TNT, 'cold']);
shapeless(B.DIG_TNT, 1, [B.TNT, I.IRON_INGOT, I.FLINT]);
shapeless(B.PARTY_TNT, 1, [B.TNT, I.FEATHER, 'wool']);
shapeless(B.CLUSTER_TNT, 1, [B.TNT, I.GUNPOWDER, I.GUNPOWDER, I.GUNPOWDER]);

function ingredientMatches(want, id) {
  if (want === undefined || want === null) return id === 0;
  if (typeof want === 'string') return TAGS[want].includes(id);
  return want === id;
}
/* grid: array of item ids (0 = empty), size n x n. Returns {out, count} or null. */
function matchRecipe(grid, n) {
  let minx = n, miny = n, maxx = -1, maxy = -1, cnt = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (grid[y * n + x]) { cnt++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  if (!cnt) return null;
  const w = maxx - minx + 1, hgt = maxy - miny + 1;
  for (const r of RECIPES) {
    if (r.items) {
      if (r.items.length !== cnt) continue;
      const pool = [];
      for (let i = 0; i < n * n; i++) if (grid[i]) pool.push(grid[i]);
      let ok = true;
      for (const want of r.items) {
        const k = pool.findIndex(id => ingredientMatches(want, id));
        if (k < 0) { ok = false; break; }
        pool.splice(k, 1);
      }
      if (ok && !pool.length) return { out: r.out, count: r.count };
      continue;
    }
    const ph = r.pattern.length, pw = Math.max(...r.pattern.map(s => s.length));
    if (pw !== w || ph !== hgt) continue;
    for (let mirror = 0; mirror < 2; mirror++) {
      let ok = true;
      for (let y = 0; y < ph && ok; y++) for (let x = 0; x < pw && ok; x++) {
        const ch = (r.pattern[y][mirror ? pw - 1 - x : x] || ' ');
        const id = grid[(y + miny) * n + (x + minx)];
        if (ch === ' ') { if (id) ok = false; } else if (!ingredientMatches(r.key[ch], id)) ok = false;
      }
      if (ok) return { out: r.out, count: r.count };
    }
  }
  return null;
}
function recipeFits(r, n) {
  if (r.items) return r.items.length <= n * n;
  return r.pattern.length <= n && Math.max(...r.pattern.map(s => s.length)) <= n;
}

/* ---------- smelting ---------- */
const SMELT = {
  [B.IRON_ORE]: I.IRON_INGOT, [B.GOLD_ORE]: I.GOLD_INGOT, [B.SAND]: B.GLASS, [B.COBBLE]: B.STONE,
  [I.PORKCHOP]: I.COOKED_PORKCHOP, [I.BEEF]: I.STEAK, [I.CHICKEN]: I.COOKED_CHICKEN, [B.CLAY]: B.BRICKS,
  [B.OAK_LOG]: I.COAL, [B.BIRCH_LOG]: I.COAL, [B.SPRUCE_LOG]: I.COAL, [B.DIAMOND_ORE]: I.DIAMOND, [B.COAL_ORE]: I.COAL, [B.EMERALD_ORE]: I.EMERALD,
  [B.MOSSY_COBBLE]: B.STONE, [B.NETHERRACK]: I.NETHER_BRICK, [B.NETHER_QUARTZ_ORE]: I.QUARTZ, [B.LAPIS_ORE]: I.LAPIS,
  [I.COD]: I.COOKED_COD, [I.SALMON]: I.COOKED_SALMON,
};
/* experience for each thing taken out of a furnace (as in Minecraft) */
const SMELT_XP = { [I.IRON_INGOT]: 0.7, [I.GOLD_INGOT]: 1, [I.DIAMOND]: 1, [I.EMERALD]: 1, [I.LAPIS]: 0.2, [I.QUARTZ]: 0.2, [B.GLASS]: 0.1, [B.STONE]: 0.1,
  [I.COOKED_PORKCHOP]: 0.35, [I.STEAK]: 0.35, [I.COOKED_CHICKEN]: 0.35, [I.COOKED_COD]: 0.35, [I.COOKED_SALMON]: 0.35, [B.BRICKS]: 0.3, [I.COAL]: 0.15, [I.NETHER_BRICK]: 0.1 };
const SMELT_TIME = 5;

/* ---------- creative inventory order ---------- */
const CREATIVE_LIST = [
  B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.MOSSY_COBBLE, B.STONE_BRICKS, B.BRICKS, B.SANDSTONE, B.SAND, B.GRAVEL, B.CLAY,
  B.OAK_LOG, B.BIRCH_LOG, B.SPRUCE_LOG, B.OAK_PLANKS, B.BIRCH_PLANKS, B.SPRUCE_PLANKS,
  B.OAK_LEAVES, B.BIRCH_LEAVES, B.SPRUCE_LEAVES, B.GLASS, B.ICE, B.SNOW, B.SNOWY_GRASS, B.OBSIDIAN, B.BEDROCK,
  B.COAL_ORE, B.IRON_ORE, B.GOLD_ORE, B.DIAMOND_ORE, B.EMERALD_ORE, B.LAPIS_ORE, B.COAL_BLOCK, B.IRON_BLOCK, B.GOLD_BLOCK, B.DIAMOND_BLOCK, B.EMERALD_BLOCK, B.LAPIS_BLOCK,
  B.NETHERRACK, B.SOUL_SAND, B.NETHER_QUARTZ_ORE, B.QUARTZ_BLOCK, B.NETHER_BRICKS,
  B.GLOWSTONE, B.TORCH, B.JACK_O_LANTERN, B.PUMPKIN, B.TNT, B.MEGA_TNT, B.ICE_TNT, B.DIG_TNT, B.PARTY_TNT, B.CLUSTER_TNT,
  B.CRAFTING_TABLE, B.FURNACE, B.CHEST, B.BOOKSHELF, B.ENCH_TABLE, B.BREWING_STAND, B.SIGN, B.BOARD, B.TV, B.BED, I.DOOR, B.DISPENSER, B.LEVER, B.BUTTON, B.RAIL, I.MINECART, I.CAR, I.BOAT, I.SUBMARINE,
  B.CACTUS, B.SUGAR_CANE, B.TALL_GRASS, B.DANDELION, B.POPPY, B.CORNFLOWER, B.DEAD_BUSH, B.OAK_SAPLING, B.BIRCH_SAPLING, B.SPRUCE_SAPLING,
  B.WATER, B.LAVA,
  ...TAGS.wool,
  toolId(0, 0), toolId(0, 1), toolId(0, 2), toolId(0, 3), toolId(1, 0), toolId(1, 1), toolId(1, 2), toolId(1, 3),
  toolId(2, 0), toolId(2, 1), toolId(2, 2), toolId(2, 3), toolId(3, 0), toolId(3, 1), toolId(3, 2), toolId(3, 3), I.FLINT_AND_STEEL,
  I.BOW, I.CROSSBOW, I.ARROW, I.FIRE_CHARGE, I.ENDER_PEARL, I.SHIELD, I.FISHING_ROD,
  ...[0, 1, 2, 3].flatMap(m => [0, 1, 2, 3].map(k => armorId(m, k))),
  I.STICK, I.COAL, I.IRON_INGOT, I.GOLD_INGOT, I.DIAMOND, I.EMERALD, I.LAPIS, I.FLINT, I.QUARTZ, I.NETHER_BRICK, I.GUNPOWDER, I.FEATHER, I.LEATHER, I.STRING, I.GHAST_TEAR,
  I.PAPER, I.BOOK, I.WRITABLE_BOOK, I.SUGAR, I.XP_BOTTLE, I.MAGMA_CREAM, I.GLASS_BOTTLE,
  ...POTIONS.map((pt, k) => potionId(k, false)), ...POTIONS.map((pt, k) => potionId(k, true)),
  I.APPLE, I.BREAD, I.PORKCHOP, I.COOKED_PORKCHOP, I.BEEF, I.STEAK, I.CHICKEN, I.COOKED_CHICKEN, I.ROTTEN_FLESH,
  I.COD, I.COOKED_COD, I.SALMON, I.COOKED_SALMON, I.TROPICAL_FISH, I.PUFFERFISH,
  ...EGG_MOBS.map((m, i) => I.EGG + i),
];

/* Block properties shared with the world generator worker. */
function genProps() { return { opaque: Array.from(OPAQUE), filter: Array.from(FILTER), emit: Array.from(EMIT) }; }
