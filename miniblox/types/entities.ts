import { DATA as mcData, neq2 } from "./data.ts";

const { entitiesByName } = mcData;
const v1_11 = neq2("1.11");
const v1_21_3 = neq2("1.21.3");

export default {
	1: [entitiesByName[v1_11 ? "item" : "Item"].id, false],
	3: [entitiesByName[v1_11 ? "arrow" : "Arrow"].id, false],
	4: [entitiesByName[v1_11 ? "snowball" : "Snowball"].id, false],
	5: [entitiesByName[v1_11 ? "ender_pearl" : "ThrownEnderpearl"].id, false],
	6: [entitiesByName[v1_11 ? "egg" : "ThrownEgg"].id, false],
	7: [entitiesByName[v1_11 ? "potion" : "ThrownPotion"].id, false],
	8: [entitiesByName[v1_11 ? "item_frame" : "ItemFrame"].id, false],
	9: [entitiesByName[v1_11 ? "falling_block" : "FallingSand"].id, false],
	10: [entitiesByName[v1_11 ? "tnt" : "PrimedTnt"].id, false],
	11: [entitiesByName[v1_11 ? "fireball" : "Fireball"].id, false],
	12: [entitiesByName[v1_11 ? "pig" : "Pig"].id, true],
	13: [entitiesByName[v1_11 ? "cow" : "Cow"].id, true],
	14: [entitiesByName[v1_11 ? "chicken" : "Chicken"].id, true],
	15: [entitiesByName[v1_11 ? "sheep" : "Sheep"].id, true],
	16: [entitiesByName[v1_11 ? "zombie" : "Zombie"].id, true],
	17: [entitiesByName[v1_11 ? "skeleton" : "Skeleton"].id, true],
	18: [entitiesByName[v1_11 ? "creeper" : "Creeper"].id, true],
	19: [entitiesByName[v1_11 ? "slime" : "Slime"].id, true],
	20: [entitiesByName[v1_11 ? "spider" : "Spider"].id, true],
	21: [
		entitiesByName[v1_11 ? v1_21_3 ? "oak_boat" : "boat" : "Boat"].id,
		false,
	],
} as { [id: number]: [number, boolean] };
