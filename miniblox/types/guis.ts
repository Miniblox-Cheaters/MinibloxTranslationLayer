import type { ServerClient } from "minecraft-protocol";
import { SPacketCloseWindow, SPacketMessage } from "../main.js";
import type { NBT } from "prismarine-nbt";

interface Slot {
	blockId: number;
}

type NonNegativeInteger<T extends number> = number extends T ? never
	: `${T}` extends `-${string}` | `${string}.${string}` ? never
	: T;

interface BIDSlot<T extends number> extends Slot {
	blockId: NonNegativeInteger<T>;
	itemCount: number;
	itemDamage?: number;
	nbtData: NBT;
}

interface N1Slot extends Slot {
	blockId: -1;
}

const mcData = (await import("minecraft-data")).default("1.8.9");

interface GUI {
	name: string;
	items: Slot[];
	command(
		item: Slot,
		socket: typeof import("../main.js")["ClientSocket"],
		client: ServerClient,
	): void;
}

interface BasicItem {
	name?: string;
	item: string;
	lore: string[];
	itemDamage?: number;
}

// thanks again roblox thot :money:
export function makeItem(item: BasicItem, nbt = {}): Slot {
	const realItem = mcData.itemsByName[item.item];
	if (!realItem) return { blockId: -1 };
	return {
		blockId: realItem.id as NonNegativeInteger<1>,
		itemCount: 1,
		itemDamage: item.itemDamage,
		nbtData: {
			type: "compound",
			name: "",
			value: {
				display: {
					type: "compound",
					value: {
						Name: {
							type: "string",
							value: item.name ?? realItem.displayName,
						},
						Lore: {
							type: "list",
							value: {
								type: "string",
								value: item.lore ?? [],
							},
						},
					},
				},
				...nbt,
			},
		},
	} as BIDSlot<1>;
}

const replacementNames = {
	wool: "white_wool",
	planks: "oak_planks",
	clay: "terracotta",
};

function updateGui(gui: GUI, client: ServerClient) {
	const contents = Array(Math.ceil(gui.items.length / 9) * 9).fill({
		blockId: -1,
	});
	for (let i = 0; i < gui.items.length; i++) {
		contents[i] = gui.items[i];
	}

	client.write("set_slot", {
		windowId: -1,
		slot: -1,
		item: { blockId: -1 },
	});
	client.write("window_items", {
		windowId: 255,
		items: contents,
	});
}

/**
 * converts mc slots to miniblox slots
 */
export const SLOTS = {
	0: 36,
	1: 37,
	2: 38,
	3: 39,
	4: 40,
	5: 41,
	6: 42,
	7: 43,
	8: 44,
	36: 5,
	37: 6,
	38: 7,
	39: 8,
};
/**
 * converts miniblox slots to mc slots
 * @type {{[slot: number]: number}}
 */
export const SLOTS_REVERSE = Object.fromEntries(
	Object.entries(SLOTS).map(([k, v]) => [v, k]),
);

export const WINDOW_NAMES = {
	"Chest": '{"translate":"container.chest"}',
	"Large Chest": '{"translate":"container.chestDouble"}',
	"Ender Chest": '{"translate":"container.enderchest"}',
	"Furnace": '{"translate":"container.furnace"}',
};
export const WINDOW_TYPES = {
	chest: "minecraft:chest",
	container: "minecraft:container",
	furnace: "minecraft:furnace",
};
export const GUIS: { [name: string]: GUI } = {
	"KitPvP Kit": {
		name: "Kits",
		command: function (item, ClientSocket, client) {
			if (item.blockId === -1) return;
			const s = (item as BIDSlot<number>);
			if (s.nbtData) {
				const itemName = s.nbtData.value.display!.value!.Name.value;
				ClientSocket.sendPacket(
					new SPacketMessage({ text: "/kit " + itemName.toLocaleLowerCase() }),
				);
				ClientSocket.sendPacket(new SPacketCloseWindow({ windowId: 0 }));
				client.write("close_window", { windowId: 255 });
			}
		},
		items: [
			makeItem({
				name: "Knight",
				item: "iron_sword",
				lore: [
					"Good ol' sword and armor",
					"Blocking with a sword will negate all arrow damage",
				],
			}),
			makeItem({
				name: "Archer",
				item: "bow",
				lore: [
					"Start with a bow and some arrows",
					"Left click with a bow to fire a barrage of arrows",
				],
			}),
			makeItem({
				name: "Tank",
				item: "diamond_chestplate",
				lore: ["Tanky but slow", "Crouching reduces incoming damage by 50%"],
			}),
			makeItem({
				name: "Scout",
				item: "feather",
				lore: ["Fast and agile", "Permanent speed boost"],
			}),
			makeItem({
				name: "Princess",
				item: "golden_helmet",
				lore: ["Wield a special bow that packs a punch"],
			}),
			makeItem({
				name: "Medic",
				item: "golden_apple",
				lore: ["Harness the power of potions"],
			}),
			makeItem({
				name: "Slapper",
				item: "wooden_sword",
				lore: ["Slap your foes"],
			}),
			makeItem({
				name: "Pyro",
				item: "flint_and_steel",
				lore: ["Burn your enemies with fire"],
			}),
			makeItem({
				name: "Enderman",
				item: "ender_pearl",
				lore: ["Get a free ender pearl on kill"],
			}),
			makeItem({
				name: "Demolitionist",
				item: "tnt",
				lore: ["Who doesn't like explosives?"],
			}),
			makeItem({ name: "Sloth", item: "web", lore: ["Slow your enemies"] }),
		],
	},
	"Skywars Kit": {
		name: "Kits",
		command: function (item, ClientSocket, client) {
			if (item.nbtData) {
				const itemName = item.nbtData.value.display.value.Name.value;
				ClientSocket.sendPacket(
					new SPacketMessage({ text: "/kit " + itemName.toLocaleLowerCase() }),
				);
				ClientSocket.sendPacket(new SPacketCloseWindow({ windowId: 0 }));
				client.write("close_window", { windowId: 255 });
			}
		},
		items: [
			makeItem({
				name: "Default",
				item: "barrier",
				lore: ["Start with nothing"],
			}),
			makeItem({
				name: "Miner",
				item: "iron_pickaxe",
				lore: ["Start with a pickaxe and stone"],
			}),
			makeItem({
				name: "Rookie",
				item: "stone_sword",
				lore: ["Start with a sword and some food"],
			}),
			makeItem({
				name: "Farmer",
				item: "egg",
				lore: ["It's egg throwing time"],
			}),
			makeItem({
				name: "Hunter",
				item: "bow",
				lore: ["Start with a bow and some arrows"],
			}),
			makeItem({
				name: "The Slapper",
				item: "wooden_sword",
				lore: ["Slap your foes off the map"],
			}),
			makeItem({
				name: "Pyro",
				item: "flint_and_steel",
				lore: ["Light your enemies on fire"],
			}),
			makeItem({
				name: "Enderman",
				item: "ender_pearl",
				lore: ["Get a free ender pearl"],
			}),
			makeItem({
				name: "Princess",
				item: "bow",
				lore: ["Start with a flame bow and some arrows"],
			}),
			makeItem({
				name: "Demolitionist",
				item: "tnt",
				lore: ["BOOM BOOM BOOM"],
			}),
			makeItem({
				name: "Knight",
				item: "golden_helmet",
				lore: ["Start with shiny armor"],
			}),
			makeItem({
				name: "Troll",
				item: "wooden_axe",
				lore: ["Troll your enemies with cobwebs"],
			}),
		],
	},
	"Item Shop": {
		name: "Item Shop",
		command: function (item, ClientSocket, client, gui) {
			if (item.nbtData) {
				const itemName = mcData.items[item.blockId]
					? mcData.items[item.blockId].name
					: undefined;
				if (itemName) {
					ClientSocket.sendPacket(
						new SPacketMessage({
							text: "/buy " + (replacementNames[itemName] ?? itemName),
						}),
					);
					updateGui(gui, client);
				}
			}
		},
		items: [
			makeItem({ item: "wool", lore: ["Cost: 4 Iron"] }),
			makeItem({ item: "clay", lore: ["Cost: 12 Iron"] }),
			makeItem({ item: "glass", lore: ["Cost: 12 Iron"] }),
			makeItem({ item: "end_stone", lore: ["Cost: 24 Iron"] }),
			makeItem({ item: "ladder", lore: ["Cost: 4 Iron"] }),
			makeItem({ item: "planks", lore: ["Cost: 4 Gold"] }),
			makeItem({ item: "obsidian", lore: ["Cost: 3 Emeralds"] }),
			makeItem({ item: "stone_sword", lore: ["Cost: 10 Iron"] }),
			makeItem({ item: "iron_sword", lore: ["Cost: 7 Gold"] }),
			makeItem({ item: "diamond_sword", lore: ["Cost: 4 Emeralds"] }),
			makeItem({ name: "KB Stick", item: "stick", lore: ["Cost: 5 Gold"] }),
			makeItem({ item: "arrow", lore: ["Cost: 2 Gold"] }),
			makeItem({ item: "bow", lore: ["Cost: 12 Gold"] }),
			//make_item({name: "Power Bow", item: "bow", lore: ['Cost: 20 Gold']}),
			//make_item({name: "Punch Bow", item: "bow", lore: ['Cost: 4 Emeralds']}),
			makeItem({
				name: "Chainmail Armor",
				item: "chainmail_chestplate",
				lore: ["Cost: 24 Iron"],
			}),
			makeItem({
				name: "Iron Armor",
				item: "iron_chestplate",
				lore: ["Cost: 12 Gold"],
			}),
			makeItem({
				name: "Diamond Armor",
				item: "diamond_chestplate",
				lore: ["Cost: 6 Emeralds"],
			}),
			makeItem({ item: "shears", lore: ["Cost: 30 Iron"] }),
			makeItem({ item: "wooden_pickaxe", lore: ["Cost: 10 Iron"] }),
			makeItem({ item: "stone_pickaxe", lore: ["Cost: 20 Iron"] }),
			makeItem({ item: "iron_pickaxe", lore: ["Cost: 3 Gold"] }),
			makeItem({ item: "diamond_pickaxe", lore: ["Cost: 6 Gold"] }),
			makeItem({ item: "wooden_axe", lore: ["Cost: 10 Iron"] }),
			makeItem({ item: "stone_axe", lore: ["Cost: 20 Iron"] }),
			makeItem({ item: "iron_axe", lore: ["Cost: 3 Gold"] }),
			makeItem({ item: "diamond_axe", lore: ["Cost: 6 Gold"] }),
			//make_item({name: "Speed Potion", item: "potion", lore: ['Cost: 1 Emerald']}),
			//make_item({name: "Jump Potion", item: "potion", lore: ['Cost: 1 Emerald']}),
			makeItem({ item: "golden_apple", lore: ["Cost: 3 Gold"] }),
			makeItem({
				name: "Fireball",
				item: "fire_charge",
				lore: ["Cost: 40 Iron"],
			}),
			makeItem({ item: "tnt", lore: ["Cost: 4 Gold"] }),
			makeItem({ item: "water_bucket", lore: ["Cost: 1 Emerald"] }),
			makeItem({ name: "Bridge Egg", item: "egg", lore: ["Cost: 2 Emeralds"] }),
		],
	},
	"Upgrade Shop": {
		name: "Upgrade Shop",
		command: function (item, ClientSocket, client, gui) {
			if (item.nbtData) {
				const itemName = item.nbtData.value.display.value.Name.value;
				if (itemName) {
					ClientSocket.sendPacket(
						new SPacketMessage({
							text: "/upgrade " + itemName.toLocaleLowerCase(),
						}),
					);
					updateGui(gui, client);
				}
			}
		},
		items: [
			makeItem({
				name: "Sharpness",
				item: "iron_sword",
				lore: ["Cost: 4/8/16 Diamonds"],
			}),
			makeItem({
				name: "Protection",
				item: "iron_chestplate",
				lore: ["Cost: 4/8/16 Diamonds"],
			}),
			makeItem({
				name: "Haste",
				item: "golden_pickaxe",
				lore: ["Cost: 2/4 Diamonds"],
			}),
			makeItem({ name: "HealPool", item: "beacon", lore: ["Cost: 1 Diamond"] }),
			makeItem({
				name: "Forge",
				item: "furnace",
				lore: ["Cost: 2/4/6/8 Diamonds"],
			}),
		],
	},
	"Team Select": {
		name: "Team Select",
		command: function (item, ClientSocket, client, gui) {
			if (item.nbtData) {
				const itemName = item.nbtData.value.display.value.Name.value;
				if (itemName) {
					const team = itemName.toLocaleLowerCase().split(" ")[0];
					if (team != "random") {
						ClientSocket.sendPacket(
							new SPacketMessage({ text: "/team " + team }),
						);
					}
					ClientSocket.sendPacket(new SPacketCloseWindow({ windowId: 0 }));
					client.write("close_window", { windowId: 255 });
				}
			}
		},
		items: [
			makeItem({ name: "Random Team", item: "barrier" }),
			makeItem({ name: "Red Team", item: "wool", itemDamage: 14 }),
			makeItem({ name: "Blue Team", item: "wool", itemDamage: 11 }),
			makeItem({ name: "Lime Team", item: "wool", itemDamage: 5 }),
			makeItem({ name: "Yellow Team", item: "wool", itemDamage: 4 }),
		],
	},
	Planets: {
		name: "Planets",
		command: function (item, _, client, __) {
			if (item.nbtData) {
				const itemName = item.nbtData.value.display.value.Name.value;
				if (itemName) {
					const team = itemName.toLocaleLowerCase().split(" ")[0];
					if (team != "random") {
						ClientSocket.sendPacket(
							new SPacketMessage({ text: "/team " + team }),
						);
					}
					ClientSocket.sendPacket(new SPacketCloseWindow({ windowId: 0 }));
					client.write("close_window", { windowId: 255 });
				}
			}
		},
	},
};
