import { DATA as mcData, v1_13, neq2, v1_14, v1_16, v1_17, v1_18 } from "./data.ts";

const { itemsByName } = mcData;

const exports = [];

exports[1] = itemsByName.stone.id;
if (v1_13) {
    /**
     * @param {number} startIdx
     * @param {string} name
     */
    const polished_$ = function (startIdx, name) {
        if (startIdx % 2 != 0)
            console.error(`block representation might be wrong for ${name}`);
        exports[startIdx] = itemsByName[name].id;
        exports[startIdx + 1] = itemsByName[`polished_${name}`].id;
    }
    polished_$(2, "granite");
    polished_$(4, "diorite");
    polished_$(6, "andesite");
    if (v1_17) {
        // deep slate
        exports[8] = itemsByName.deepslate.id;
        exports[9] = itemsByName.cobbled_deepslate.id;
        exports[10] = itemsByName.polished_deepslate.id;
    } else {
        for (let i = 0; i < 6; i++) exports[2 + i] = itemsByName.stone.id;
    }
} else {
    // replace block IDs 2..8
    for (let i = 0; i < 6; i++) exports[2 + i] = itemsByName.stone.id;
}
const grassId = itemsByName[neq2("1.20.3") ? "tall_grass" : "grass"].id;
exports[14] = grassId;
for (let i = 0; i < 2; i++) exports[15 + i] = itemsByName.dirt.id;
exports[21] = itemsByName.cobblestone.id;

/**
 * @param {number} startIdx
 * @param {string} name
 * @param {string[]} prefixes
 */
function arrSequence(startIdx, name, prefixes, postfix = false, sep = "_") {
    const FORMAT = postfix ? `${name}${sep}%s` : `%s${sep}${name}`
    for (let i = 0; i < prefixes.length - 1; i++)
        exports[startIdx + i] = FORMAT.replace("%s", prefixes[i]);
}

/**
 * @param {number} startIdx
 * @param {string} name
 * @param {boolean} [extra=false]
 * @param {(a: string) => string} [transform=a => a]
 */
function woodSequence(
    startIdx, name, extra = false,
    postfix = false, transform = a => a
) {
    const prefixes = [
        "oak",
        "spruce",
        "birch",
        "jungle",
        "acacia",
        "dark_oak"
    ];
    if (extra) {
        prefixes.push(v1_16 ? "crimson" : "acacia", v1_16 ? "warped" : "acacia");
    }
    arrSequence(startIdx, name, prefixes.map(transform), postfix);
}

/**
 * @param {number} startIdx
 * @param {string} oldName
 * @param {string} [newName=oldName]
 * @param {boolean} [extra=false]
 * @param {(a: string) => string} [transform=a => a]
 */
function woodThing(
    startIdx, oldName,
    newName = oldName, extra = false,
    postfix = false, transform = a => a
) {
    if (v1_13) {
        woodSequence(startIdx, newName, true);
    } else {
        for (let i = 0; i < 8; i++)
            exports[startIdx + i] = [itemsByName[oldName].id, i % 6];
    }
}

//22-30 are planks
woodThing(22, "planks", "planks", true);
if (v1_13)
    woodSequence(30, "sapling");
else
    for (let i = 0; i < 6; i++) exports[30 + i] = [itemsByName.sapling, i];
exports[36] = itemsByName.bedrock.id;
for (let i = 0; i < 2; i++) exports[37 + i] = [itemsByName.sand.id, i];
exports[39] = itemsByName.gravel.id;
for (let i = 0; i < 2; i++) exports[40 + i] = itemsByName.coal_ore.id;
for (let i = 0; i < 2; i++) exports[42 + i] = itemsByName.iron_ore.id;
for (let i = 0; i < 2; i++) exports[46 + i] = itemsByName.gold_ore.id;
for (let i = 0; i < 2; i++) exports[48 + i] = itemsByName.redstone_ore.id;
for (let i = 0; i < 2; i++) exports[50 + i] = itemsByName.emerald_ore.id;
for (let i = 0; i < 2; i++) exports[52 + i] = itemsByName.lapis_ore.id;
for (let i = 0; i < 2; i++) exports[54 + i] = itemsByName.diamond_ore.id;
exports[65] = itemsByName.iron_block.id;
exports[67] = itemsByName.gold_block.id;
for (let i = 0; i < 2; i++) exports[68 + i] = itemsByName.diamond_block.id;
if (v1_13) {
    woodSequence(101, "log", false, true);
} else {
    for (let i = 0; i < 4; i++) {
        exports[101 + i] = [itemsByName.log.id, i];
        exports[109 + i] = [itemsByName.log.id, i];
        exports[125 + i] = [itemsByName.log.id, i];
    }
    for (let i = 0; i < 2; i++) {
        exports[105 + i] = [itemsByName.log2.id, i];
        exports[113 + i] = [itemsByName.log2.id, i];
        exports[129 + i] = [itemsByName.log2.id, i];
    }
}
for (let i = 0; i < 2; i++) exports[141 + i] = [itemsByName.sponge.id, i];
exports[143] = itemsByName.glass.id;
if (v1_13) {
    exports[144] = v1_17
        ? itemsByName.tinted_glass.id
        : itemsByName.gray_stained_glass.id;
} else exports[144] = itemsByName.stained_glass.id;
exports[145] = itemsByName.lapis_block.id;
for (let i = 0; i < 3; i++) exports[146 + i] = [itemsByName.sandstone.id, i];
exports[149] = v1_13 ? itemsByName.cobweb.id : itemsByName.web.id;
exports[150] = grassId;
exports[151] = [itemsByName[v1_13 ? "tall_grass" : "tallgrass"].id, 2];
exports[154] = itemsByName[v1_13 ? "dead_bush" : "deadbush"].id;
const COLORS = [
    "white",
    "orange",
    "magenta",
    "light_blue",
    "yellow",
    "lime",
    "pink",
    "gray",
    "light_gray",
    "cyan",
    "purple",
    "blue",
    "brown",
    "green",
    "red",
    "black",
];
if (v1_13) {
    arrSequence(157, "wool", COLORS, true);
} else {
    for (let i = 0; i < 16; i++) exports[157 + i] = [itemsByName.wool.id, i];
}
exports[196] = itemsByName[v1_13 ? "sugar_cane" : "reeds"].id;
if (v1_13) exports[197] = itemsByName.kelp.id;
woodThing(204, "wooden_slab", "slab", false);
for (let i = 0; i < 3; i++) exports[212 + i] = [itemsByName.stone_slab.id, i];
exports[218] = itemsByName[v1_13 ? "brick_slab" : "stone_slab2"].id;
exports[228] = itemsByName[v1_13 ? "smooth_quartz" : "quartz_block"].id;
exports[232] = itemsByName[v1_13 ? "bricks" : "brick_block"].id;
exports[233] = itemsByName.bookshelf.id;
exports[234] = itemsByName.mossy_cobblestone.id;
exports[235] = itemsByName.obsidian.id;
exports[236] = itemsByName.torch.id;
exports[243] = itemsByName[v1_13 ? "spawner" : "mob_spawner"].id;
exports[244] = itemsByName.oak_stairs.id;
exports[245] = itemsByName.chest.id;
exports[246] = itemsByName.crafting_table.id;
exports[248] = itemsByName.furnace.id;
exports[249] = itemsByName.ladder.id;
exports[250] = itemsByName.cobblestone.id;
exports[251] = itemsByName.snow.id;
exports[252] = itemsByName.ice.id;
exports[253] = itemsByName.snow.id;
exports[254] = itemsByName.cactus.id;
exports[256] = itemsByName.jukebox.id;
exports[265] = itemsByName.pumpkin.id;
exports[269] = itemsByName.soul_sand.id;
exports[292] = itemsByName.brown_mushroom_block.id;
exports[293] = itemsByName.red_mushroom_block.id;
exports[297] = itemsByName.glass_pane.id;
exports[298] = itemsByName.melon.id;
exports[312] = itemsByName.end_stone.id;
exports[314] = itemsByName.dragon_egg.id;
exports[315] = itemsByName.sandstone_stairs.id;
exports[316] = itemsByName.ender_chest.id;
exports[317] = itemsByName.emerald_block.id;
exports[318] = itemsByName.spruce_stairs.id;
exports[319] = itemsByName.birch_stairs.id;
exports[320] = itemsByName.jungle_stairs.id;
exports[321] = itemsByName.birch_stairs.id;
exports[322] = itemsByName.birch_stairs.id;
exports[323] = itemsByName.command_block.id;
exports[324] = itemsByName.beacon.id;
for (let i = 0; i < 3; i++) exports[346 + i] = [itemsByName.anvil.id, i];
exports[348] = itemsByName[v1_13 ? "nether_quartz_ore" : "quartz_ore"].id;
exports[349] = itemsByName.quartz_block.id;
exports[350] = itemsByName.quartz_block.id;
exports[353] = itemsByName.quartz_stairs.id;
/**
 * 
 * @param {number} startIdx
 * @param {string} oldName old name before 1.13, when they renamed everything
 * @param {string} newName new name after 1.13
 * @param {boolean} [v1_13Postfix=false] prefix (`color_newName`) or postfix (`newName_color`)
 */
function coloredBlock(startIdx, oldName, newName = oldName, v1_13Postfix = false) {
    if (v1_13)
        arrSequence(startIdx, newName, COLORS, v1_13Postfix);
    else for (let i = 0; i < 16; i++)
        exports[startIdx + i] = [itemsByName[oldName].id, i];
}
const terracotta = v1_13 ? "terracotta" : "stained_hardened_clay";
coloredBlock(354, "stained_hardened_clay", "terracotta", true);
exports[370] = itemsByName.barrier.id;
exports[372] = itemsByName.hay_block.id;
coloredBlock(373, "carpet", "carpet", true);
exports[389] = itemsByName[terracotta].id;
exports[390] = itemsByName.packed_ice.id;
coloredBlock(400, "stained_glass");
if (v1_13)
    arrSequence(468, "terracotta", COLORS.map(n => `${n}_glazed`));
else
    for (let i = 0; i < 32; i++)
        exports[468 + i] = [itemsByName[terracotta].id, i % 16];
exports[547] = itemsByName.ice.id;
exports[585] = itemsByName.redstone.id;
exports[586] = itemsByName.redstone_torch.id;
exports[587] = itemsByName.redstone_block.id;
exports[588] = itemsByName.repeater.id;
exports[589] = itemsByName.comparator.id;
exports[590] = itemsByName.piston.id;
exports[591] = itemsByName.sticky_piston.id;
exports[592] = itemsByName[v1_13 ? "slime_block" : "slime"].id;
exports[595] = itemsByName.hopper.id;
exports[596] = itemsByName.dispenser.id;
exports[597] = itemsByName.dropper.id;
exports[600] = itemsByName.lever.id;
exports[604] = itemsByName.tripwire_hook.id;
exports[605] = itemsByName.trapped_chest.id;
exports[606] = itemsByName.tnt.id;
exports[608] = itemsByName[v1_13 ? "note_block" : "noteblock"].id;
exports[609] = itemsByName.stone_button.id;
if (v1_13)
    woodSequence(611, "button");
else
    for (let i = 0; i < 8; i++) exports[611 + i] = itemsByName.wooden_button.id;
exports[619] = itemsByName.stone_pressure_plate.id;
exports[621] = itemsByName.light_weighted_pressure_plate.id;
exports[622] = itemsByName.heavy_weighted_pressure_plate.id;
if (v1_13) woodSequence(623, "pressure_plate");
else
    for (let i = 0; i < 8; i++) exports[623 + i] = itemsByName.wooden_pressure_plate.id;
exports[631] = itemsByName.iron_door.id;
exports[632] = itemsByName[v1_13 ? "oak_door" : "wooden_door"].id;
exports[633] = itemsByName.spruce_door.id;
exports[634] = itemsByName.birch_door.id;
exports[635] = itemsByName.jungle_door.id;
exports[636] = itemsByName.acacia_door.id;
exports[637] = itemsByName.dark_oak_door.id;
exports[638] = itemsByName[v1_13 ? "oak_door" : "wooden_door"].id;
exports[639] = itemsByName[v1_13 ? "oak_door" : "wooden_door"].id;
exports[640] = itemsByName.iron_trapdoor.id;
if (v1_13)
    woodSequence(641, "trapdoor");
else for (let i = 0; i < 8; i++) exports[641 + i] = itemsByName.trapdoor.id;
exports[680] = itemsByName.flint_and_steel.id;
exports[681] = itemsByName.apple.id;
exports[682] = itemsByName.bow.id;
exports[683] = itemsByName.arrow.id;
exports[684] = itemsByName.coal.id;
exports[685] = [itemsByName.coal.id, 1];
exports[686] = itemsByName.diamond.id;
exports[687] = itemsByName.emerald.id;
exports[688] = v1_13 ? itemsByName.lapis_lazuli.id : [itemsByName.dye.id, 4];
exports[692] = itemsByName.iron_ingot.id;
exports[696] = itemsByName.gold_ingot.id;
exports[699] = itemsByName.wooden_sword.id;
exports[700] = itemsByName.wooden_shovel.id;
exports[701] = itemsByName.wooden_pickaxe.id;
exports[702] = itemsByName.wooden_axe.id;
exports[703] = itemsByName.wooden_hoe.id;
exports[704] = itemsByName.stone_sword.id;
exports[705] = itemsByName.stone_shovel.id;
exports[706] = itemsByName.stone_pickaxe.id;
exports[707] = itemsByName.stone_axe.id;
exports[708] = itemsByName.stone_hoe.id;
exports[709] = itemsByName.golden_sword.id;
exports[710] = itemsByName.golden_shovel.id;
exports[711] = itemsByName.golden_pickaxe.id;
exports[712] = itemsByName.golden_axe.id;
exports[713] = itemsByName.golden_hoe.id;
exports[714] = itemsByName.iron_sword.id;
exports[715] = itemsByName.iron_shovel.id;
exports[716] = itemsByName.iron_pickaxe.id;
exports[717] = itemsByName.iron_axe.id;
exports[718] = itemsByName.iron_hoe.id;
exports[719] = itemsByName.diamond_sword.id;
exports[720] = itemsByName.diamond_shovel.id;
exports[721] = itemsByName.diamond_pickaxe.id;
exports[722] = itemsByName.diamond_axe.id;
exports[723] = itemsByName.diamond_hoe.id;
exports[724] = itemsByName.diamond_sword.id;
exports[725] = itemsByName.diamond_shovel.id;
exports[726] = itemsByName.diamond_pickaxe.id;
exports[727] = itemsByName.diamond_axe.id;
exports[728] = itemsByName.diamond_hoe.id;
exports[729] = itemsByName.stick.id;
exports[730] = itemsByName.bowl.id;
exports[731] = itemsByName.mushroom_stew.id;
exports[732] = itemsByName.string.id;
exports[733] = itemsByName.feather.id;
exports[734] = itemsByName.gunpowder.id;
exports[735] = itemsByName.wheat_seeds.id;
exports[736] = itemsByName.wheat.id;
exports[737] = itemsByName.bread.id;
exports[738] = itemsByName.leather_helmet.id;
exports[739] = itemsByName.leather_chestplate.id;
exports[740] = itemsByName.leather_leggings.id;
exports[741] = itemsByName.leather_boots.id;
exports[742] = itemsByName.chainmail_helmet.id;
exports[743] = itemsByName.chainmail_chestplate.id;
exports[744] = itemsByName.chainmail_leggings.id;
exports[745] = itemsByName.chainmail_boots.id;
exports[746] = itemsByName.iron_helmet.id;
exports[747] = itemsByName.iron_chestplate.id;
exports[748] = itemsByName.iron_leggings.id;
exports[749] = itemsByName.iron_boots.id;
exports[750] = itemsByName.diamond_helmet.id;
exports[751] = itemsByName.diamond_chestplate.id;
exports[752] = itemsByName.diamond_leggings.id;
exports[753] = itemsByName.diamond_boots.id;
exports[754] = itemsByName.golden_helmet.id;
exports[755] = itemsByName.golden_chestplate.id;
exports[756] = itemsByName.golden_leggings.id;
exports[757] = itemsByName.golden_boots.id;
exports[758] = itemsByName.diamond_helmet.id;
exports[759] = itemsByName.diamond_chestplate.id;
exports[760] = itemsByName.diamond_leggings.id;
exports[761] = itemsByName.diamond_boots.id;
exports[762] = itemsByName.flint.id;
exports[763] = itemsByName.porkchop.id;
exports[764] = itemsByName.cooked_porkchop.id;
exports[766] = itemsByName.golden_apple.id;
exports[767] = [itemsByName.golden_apple.id, 1];
if (v1_14)
    woodSequence(768, "sign");
else for (let i = 0; i < 8; i++) exports[768 + i] = itemsByName.sign.id;
exports[776] = itemsByName.bucket.id;
exports[777] = itemsByName.water_bucket.id;
exports[778] = itemsByName.lava_bucket.id;
exports[779] = itemsByName.water_bucket.id;
exports[780] = itemsByName.snowball.id;
exports[781] = itemsByName.leather.id;
exports[782] = itemsByName.milk_bucket.id;
exports[791] = itemsByName.paper.id;
exports[792] = itemsByName.book.id;
exports[793] = itemsByName.slime_ball.id;
exports[794] = itemsByName.egg.id;
exports[795] = itemsByName.compass.id;
exports[797] = itemsByName.fishing_rod.id;
exports[798] = itemsByName.clock.id;
if (v1_13) {
    const RAW = [
        "cod",
        "salmon",
        "tropical_fish",
        "pufferfish"
    ];
    for (let i = 0; i < RAW.length; i++) exports[801 + i] = itemsByName[RAW[i]].id;
    arrSequence(801 + RAW.length, "cooked", [
        "cod",
        "salmon"
    ], true);
} else {
    for (let i = 0; i < 4; i++) exports[801 + i] = [itemsByName.fish.id, i];
    for (let i = 0; i < 2; i++) exports[805 + i] = [itemsByName.cooked_fish.id, i];
    for (let i = 0; i < 2; i++) exports[807 + i] = itemsByName.dye.id;
}
exports[809] = v1_13 ? itemsByName.cocoa_beans.id : [itemsByName.dye.id, 3];
if (v1_13) {
    arrSequence(v1_14 ? 810 : 811, "dye", v1_14 ? COLORS : COLORS.shift());
    if (!v1_14)
        exports[810] = itemsByName.light_gray_dye.id;
} else for (let i = 0; i < 16; i++) exports[810 + i] = [itemsByName.dye.id, 15 - i];
exports[826] = v1_13 ? itemsByName.bone_meal.id : [itemsByName.dye.id, 15];
exports[827] = itemsByName.bone.id;
exports[828] = itemsByName.sugar.id;
exports[829] = itemsByName.cake.id;
if (v1_13)
    arrSequence(830, "bed", COLORS);
else for (let i = 0; i < 16; i++) exports[830 + i] = itemsByName.bed.id;
exports[846] = itemsByName.cookie.id;
exports[847] = itemsByName.filled_map.id;
exports[848] = itemsByName.shears.id;
exports[849] = itemsByName.melon.id;
exports[851] = itemsByName.pumpkin_seeds.id;
exports[852] = itemsByName.melon_seeds.id;
exports[853] = itemsByName.beef.id;
exports[854] = itemsByName.cooked_beef.id;
exports[855] = itemsByName.chicken.id;
exports[856] = itemsByName.cooked_chicken.id;
exports[857] = itemsByName.rotten_flesh.id;
exports[858] = itemsByName.ender_pearl.id;
exports[859] = itemsByName.blaze_rod.id;
exports[860] = itemsByName.ghast_tear.id;
exports[861] = itemsByName.gold_nugget.id;
exports[863] = itemsByName.potion.id;
exports[864] = itemsByName.glass_bottle.id;
exports[865] = itemsByName.spider_eye.id;
exports[866] = itemsByName.fermented_spider_eye.id;
exports[867] = itemsByName.blaze_powder.id;
exports[868] = itemsByName.magma_cream.id;
exports[869] = itemsByName.brewing_stand.id;
exports[870] = itemsByName.cauldron.id;
exports[871] = itemsByName.ender_eye.id;
exports[872] = itemsByName[v1_13 ? "glistering_melon_slice" : "speckled_melon"].id;
exports[940] = itemsByName.experience_bottle.id;
exports[941] = itemsByName.fire_charge.id;
exports[942] = itemsByName.writable_book.id;
exports[943] = itemsByName.written_book.id;
for (let i = 0; i < 2; i++) exports[944 + i] = itemsByName.item_frame.id;
exports[946] = itemsByName.flower_pot.id;
exports[947] = itemsByName.carrot.id;
exports[948] = itemsByName.potato.id;
exports[949] = itemsByName.baked_potato.id;
exports[950] = itemsByName.poisonous_potato.id;
exports[951] = itemsByName.map.id;
exports[952] = itemsByName.golden_carrot.id;
exports[960] = itemsByName.pumpkin_pie.id;
exports[967] = itemsByName.rabbit.id;
exports[968] = itemsByName.cooked_rabbit.id;
exports[969] = itemsByName.rabbit_stew.id;
exports[973] = itemsByName.iron_horse_armor.id;
exports[974] = itemsByName.golden_horse_armor.id;
exports[975] = itemsByName.diamond_horse_armor.id;
exports[976] = itemsByName.iron_horse_armor.id;
exports[977] = itemsByName.lead.id;
exports[978] = itemsByName.name_tag.id;
exports[980] = itemsByName.mutton.id;
exports[981] = itemsByName.cooked_mutton.id;
exports[998] = itemsByName[v1_13 ? "pink_banner" : "banner"].id
// exports[998] = [itemsByName.spawn_egg.id, 200];
exports[1005] = [itemsByName.potion.id, 1];
const RECORDS = [
    "13",
    "cat",
    "blocks",
    "chirp",
    "far",
    "mall",
    "mellohi",
    "stal",
    "strad",
    "ward",
    "11",
    "wait",
    v1_18 ? "otherside" : "stal",
    // actually added in 20w13b,
    // but who wants to play this on a snapshot version of mc?
    v1_16 ? "pigstep" : "stal",
];
arrSequence(1015, v1_13 ? "music_disc" : "record", RECORDS, true);
exports[1033] = itemsByName.bow.id;
exports[1101] = itemsByName.diamond_sword.id;
exports[1102] = itemsByName.diamond_pickaxe.id;
exports[1103] = itemsByName.diamond_axe.id;
exports[1104] = itemsByName.diamond_shovel.id;
exports[1105] = itemsByName.diamond_hoe.id;
exports[1106] = itemsByName.diamond_helmet.id;
exports[1107] = itemsByName.diamond_chestplate.id;
exports[1108] = itemsByName.diamond_leggings.id;
exports[1109] = itemsByName.diamond_boots.id;
exports[1110] = itemsByName.ladder.id;
exports[1111] = itemsByName.apple.id;
exports[1112] = itemsByName.apple.id;
export default exports;