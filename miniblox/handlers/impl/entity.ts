import Handler from "../handler.ts";
import {
	ClientSocket,
	PBItemStack,
	PBVector3,
	SPacketClick,
	SPacketEntityAction,
	SPacketHeldItemChange,
	SPacketPlayerAbilities,
	SPacketPlayerInput,
	SPacketPlayerPosLook,
	SPacketRespawn$1,
	SPacketUpdateInventory,
	SPacketUseEntity,
} from "../../main.js";
import ENTITIES from "../../types/entities.ts";
import GAMEMODES, { spectator } from "../../types/gamemodes.js";
import {
	translateItem,
	translateItemBack,
	translateText,
} from "../../utils.js";
import { type Slot, SLOTS_REVERSE } from "../../types/guis.ts";
import type { ServerClient } from "minecraft-protocol";
import {
	clampByte,
	clampToBox,
	convertAngle,
	convertToByte,
	DEG2RAD,
	RAD2DEG,
	type Vector3,
} from "../../types/standard.ts";
import type { WorldHandler } from "./world.ts";
import type { TabListHandler } from "./tablist.ts";

// 1.98 / 1.99 is the original
// desync sometimes takes a bit to start moving idk why
const DESYNC_MAX_SPEED = 1.9999974;
let client: ServerClient, tablist: TabListHandler, world: WorldHandler;
export type EntityMetadata1_8 = [
	number, // i8
	number, // i16
	number, // i32
	number, // f32
	string,
	Slot,
	Vector3, // i32 vector
	{
		//all f32
		pitch: number;
		yaw: number;
		roll: number;
	},
];
export type EntityMetadata1_9 = [
	number, // i8 0
	number, // varint 1
	number, // i32 2
	string, // f32 3
	string, // 4
	Slot, // 5
	Vector3, // i32 vector 6
	{
		//all f32
		pitch: number;
		yaw: number;
		roll: number;
	}, //7
	Vector3, // position 8
	unknown, // unlisted 9
	number, // varint 10
	number, // varint
];

/**
 * @param {number} range
 * @returns
 */
function desyncMath(pos: Vector3, serverPos: Vector3, range: number) {
	const moveVec = {
		x: (pos.x - serverPos.x),
		y: (pos.y - serverPos.y),
		z: (pos.z - serverPos.z),
	};
	const moveMag = Math.sqrt(
		moveVec.x * moveVec.x + moveVec.y * moveVec.y + moveVec.z * moveVec.z,
	);

	return moveMag > range
		? {
			x: serverPos.x + ((moveVec.x / moveMag) * range),
			y: serverPos.y + ((moveVec.y / moveMag) * range),
			z: serverPos.z + ((moveVec.z / moveMag) * range),
		}
		: pos;
}

interface LocalData {
	flying?: boolean;
	id: number;
	mcId: number;
	inputSequenceNumber: number;
	yaw: number;
	pitch: number;
	pos: Vector3;
	serverPos: Vector3;
	state: { [i: number]: number | boolean };
	lastState: { [i: number]: number | boolean };
	health: { hp: number; food: number; foodSaturation: number };
	inventory: {
		main: (PBItemStack | null)[];
		armor: (PBItemStack | null)[];
	};
	selectedSlot: number;
	get selectedStack(): this["inventory"]["main"][this["selectedSlot"]];
}
const DEFAULT_LOCAL_DATA: LocalData = {
	id: -1,
	mcId: 99999,
	inputSequenceNumber: 0,
	yaw: 0,
	pitch: 0,
	pos: { x: 0, y: 0, z: 0 },
	serverPos: { x: 0, y: 0, z: 0 },
	state: [],
	lastState: [],
	health: { hp: 20, food: 20, foodSaturation: 20 },
	inventory: {
		main: new Array(36).fill(null),
		armor: new Array(4).fill(null),
	},
	selectedSlot: -1,
	get selectedStack() {
		return this.inventory.main[this.selectedSlot];
	},
};

interface Entity {
	special?: boolean;
	name?: string;
	id: number;
	type: number;
	pos: Vector3;
	yaw: number;
	pitch: number;
	metadata: { [n: number]: any };
	equipment: { [slot: number]: Slot };
	objectData?: {
		intField: number;
		velocityX: number;
		velocityY: number;
		velocityZ: number;
	};
	spawned: boolean;
	sneaking?: boolean;
}

export class EntityHandler extends Handler {
	sentNewACInfo = false;
	entities: { [id: number]: Entity } = [];
	skins: { [eid: number]: string | undefined } = {};
	gamemodes: { [eid: number]: number } = {};
	desyncFlag = false;
	local: LocalData = DEFAULT_LOCAL_DATA;
	teleport?: Vector3;
	dimension: string = "??";

	canSpawn(entity: Entity) {
		if (
			entity.type == -1 &&
			((!tablist.entries[entity.id] && !entity.special) ||
				this.gamemodes[entity.id] == spectator)
		) return false;
		if (!world.isEntityLoaded(entity)) return false;
		return true;
	}
	findHotbarSlotForPickBlock(stack: PBItemStack): number {
		const { main } = this.local.inventory;
		for (let i = 0; i < 9; i++) {
			const it = main[i];
			if (it && it.equals(stack)) {
				return i;
			}
		}

		for (let i = 0; i < 9; i++) if (!main[i]) return i;

		return this.local.selectedSlot;
	}
	spawn(entity: Entity) {
		if (!entity || entity.spawned) return;
		if (entity.special) {
			tablist.entries[entity.id] = crypto.randomUUID();
			client.write("player_info", {
				action: 0,
				data: [{
					UUID: tablist.entries[entity.id],
					name: "BOT",
					properties: [],
					gamemode: 1,
					ping: 0,
				}],
			});
		}

		entity.spawned = true;
		if (entity.type == -1) {
			client.write("named_entity_spawn", {
				entityId: entity.id,
				playerUUID: tablist.entries[entity.id] ?? crypto.randomUUID(),
				x: entity.pos.x,
				y: entity.pos.y,
				z: entity.pos.z,
				yaw: entity.yaw,
				pitch: entity.pitch,
				currentItem: 0,
				metadata: entity.metadata,
			});
			client.write("entity_head_rotation", {
				entityId: entity.id,
				headYaw: entity.yaw,
			});

			for (const [slot, item] of Object.entries(entity.equipment)) {
				client.write("entity_equipment", {
					entityId: entity.id,
					slot: slot,
					item: item,
				});
			}
		} else {
			const entityType = ENTITIES[entity.type];
			client.write(entityType[1] ? "spawn_entity_living" : "spawn_entity", {
				entityId: entity.id,
				type: entityType[0],
				x: entity.pos.x,
				y: entity.pos.y,
				z: entity.pos.z,
				yaw: entity.yaw,
				pitch: entity.pitch,
				objectData: entity.objectData,
				metadata: entity.metadata,
			});

			if (!entityType[1]) {
				client.write("entity_metadata", {
					entityId: entity.id,
					metadata: entity.metadata,
				});
			}
		}

		if (entity.special) {
			client.write("player_info", {
				action: 4,
				data: [{ "UUID": tablist.entries[entity.id] }],
			});
		}

		return true;
	}
	remove(entity: Entity) {
		if (!entity || !entity.spawned) return;

		entity.spawned = false;
		client.write("entity_destroy", {
			entityIds: [entity.id],
		});
	}
	check(entity: Entity) {
		if (!entity) return;
		if (this.canSpawn(entity) != entity.spawned) {
			if (entity.spawned) this.remove(entity);
			else this.spawn(entity);
		}
	}
	actions() {
		world.update(this.local.pos);
		const newState = [
			this.local.state[0] > Date.now(),
			this.local.state[1] ?? false,
			this.local.state[2] ?? false,
		];
		const oldState = this.local.lastState;
		if (
			newState[0] == oldState[0] && newState[1] == oldState[1] &&
			newState[2] == oldState[2]
		) return;
		ClientSocket.sendPacket(
			new SPacketEntityAction({
				id: this.local.id,
				punching: newState[0] != oldState[0] ? newState[0] : undefined,
				sprinting: newState[1] != oldState[1] ? newState[1] : undefined,
				sneak: newState[2] != oldState[2] ? newState[2] : undefined,
			}),
		);
		this.local.lastState = newState;
	}
	abilities(_movement: boolean) {
		if (this.local.flying == false) return;
		ClientSocket.sendPacket(new SPacketPlayerAbilities({ isFlying: false }));
		this.local.flying = false;
	}
	checkAll() {
		Object.values(this.entities).forEach((entity) => this.check(entity));
	}
	convertId(id: number) {
		return id == this.local.id ? this.local.mcId : id;
	}
	override miniblox() {
		if (!this.sentNewACInfo) {
			this.local.inputSequenceNumber ??= -1;
			ClientSocket.sendPacket(
				new SPacketPlayerInput({
					sequenceNumber: this.local.inputSequenceNumber++,
					left: false,
					right: false,
					up: false,
					down: false,
					yaw: this.local.yaw ?? 0,
					pitch: this.local.pitch ?? 0,
					jump: false,
					sneak: false,
					sprint: false,
					pos: this.local.pos ?? {
						x: 0,
						y: 0,
						z: 0,
					},
				}),
			);
		}
		// UNIVERSAL
		ClientSocket.on("CPacketSpawnEntity", (packet) => {
			if (ENTITIES[packet.type] == undefined) return;
			const motion: Vector3 = packet.motion ?? { x: 0, y: 0, z: 0 };
			const yaw = packet.yaw ?? 0;
			const pitch = packet.pitch ?? 0;
			this.entities[packet.id] = {
				id: packet.id,
				type: packet.type,
				pos: packet.pos ?? { x: 0, y: 0, z: 0 },
				yaw: convertAngle(yaw, true),
				pitch: convertAngle(pitch, true),
				metadata: {},
				equipment: {},
				objectData: {
					intField: packet.shooterId != null
						? this.convertId(packet.shooterId)
						: 1,
					velocityX: Math.max(Math.min(motion.x * 8000, 32767), -32768),
					velocityY: Math.max(Math.min(motion.y * 8000, 32767), -32768),
					velocityZ: Math.max(Math.min(motion.z * 8000, 32767), -32768),
				},
				spawned: false,
			};
			this.check(this.entities[packet.id]);
		});
		ClientSocket.on("CPacketEntityProperties", (packet) => {
			const properties = packet.data.map((s) => {
				return {
					key: s.id,
					value: s.value,
					modifiersLength: s.modifiers.length,
					modifiers: s.modifiers.map((mod) => {
						return {
							uuid: mod.id,
							amount: mod.amount,
							operation: mod.operation,
						};
					}),
				};
			});
			client.write("update_attributes", {
				entityId: packet.id,
				propertiesLength: packet.data.length,
				properties,
			});
		});
		ClientSocket.on("CPacketSpawnPlayer", (packet) => {
			const yaw = convertAngle(packet.yaw, true, 180),
				pitch = convertAngle(packet.pitch, true);
			if (packet.socketId == ClientSocket.id) {
				delete this.gamemodes[packet.id];
				this.local.id = packet.id;
				this.local.pos = { x: packet.pos.x, y: packet.pos.y, z: packet.pos.z };
				this.teleport = this.local.pos;
				client.write("position", {
					x: packet.pos.x,
					y: packet.pos.y,
					z: packet.pos.z,
					yaw: yaw,
					pitch: pitch,
					flags: 0,
				});
			} else {
				const entity = this.entities[packet.id];
				const gm = packet.gamemode ?? "survival";
				this.gamemodes[packet.id] = GAMEMODES[gm];
				this.skins[packet.id] = packet.cosmetics.skin;

				if (entity && entity.spawned) {
					client.write("entity_teleport", {
						entityId: packet.id,
						x: packet.pos.x * 32,
						y: packet.pos.y * 32,
						z: packet.pos.z * 32,
						yaw: yaw,
						pitch: pitch,
						onGround: packet.onGround,
					});
					client.write("entity_head_rotation", {
						entityId: packet.id,
						headYaw: yaw,
					});
				}

				this.entities[packet.id] = {
					id: packet.id,
					type: -1,
					special: packet.name.includes(" "),
					pos: {
						x: packet.pos.x * 32,
						y: packet.pos.y * 32,
						z: packet.pos.z * 32,
					},
					yaw: yaw,
					pitch: pitch,
					metadata: entity ? entity.metadata : {},
					equipment: entity ? entity.equipment : {},
					spawned: entity ? entity.spawned : false,
					name: packet.name,
				};

				this.check(this.entities[packet.id]);
			}
		});
		ClientSocket.on(
			"CPacketSpawnExperienceOrb",
			(packet) =>
				client.write("spawn_entity_experience_orb", {
					entityId: packet.id,
					x: packet.x,
					y: packet.y,
					z: packet.z,
					count: packet.xpValue,
				}),
		);
		ClientSocket.on("CPacketDestroyEntities", (packet) => {
			for (const id of packet.ids) delete this.entities[id];
			client.write("entity_destroy", {
				entityIds: packet.ids,
			});
		});
		ClientSocket.on("CPacketAnimation", (packet) =>
			client.write("animation", {
				entityId: this.convertId(packet.id),
				animation: packet.type,
			}));
		ClientSocket.on("CPacketEntityAction", (packet) => {
			const entity = this.entities[packet.id];
			if (packet.punching) {
				client.write("animation", {
					entityId: packet.id,
					animation: 0,
				});
			}
			if (entity && packet.fire != undefined) {
				client.write("entity_status", {
					entityId: packet.id,
					entityStatus: packet.fire ? 2 : 0,
				});
			}
			if (entity && packet.sneak != undefined) {
				entity.sneaking = packet.sneak;
				entity.metadata[0].value = entity.sneaking
					? (entity.metadata[0].value | 1 << 1)
					: (entity.metadata[0].value & ~(1 << 1));
				client.write("entity_metadata", {
					entityId: packet.id,
					metadata: [{ key: 0, value: entity.metadata[0].value, type: 0 }],
				});
			}
		});
		ClientSocket.on("CPacketEntityEquipment", (packet) => {
			const entity = this.entities[packet.id];

			for (const equip of packet.equipment) {
				if (equip.slot == 2) continue;
				const slot = equip.slot == 1 ? 0 : 7 - equip.slot,
					item = translateItem(equip.item);
				if (entity) entity.equipment[slot] = item;

				if (this.local.id === packet.id) {
					this.local.inventory.armor[slot] = equip.item;
				}

				client.write("entity_equipment", {
					entityId: packet.id,
					slot,
					item,
				});
			}
		});
		ClientSocket.on("CPacketEntityMetadata", (packet) => {
			const entity = this.entities[packet.id];
			let props = [];

			for (const watched of packet.data) {
				let value;
				let wType = watched.objectType;
				switch (watched.objectType) {
					case 0:
						value = convertToByte(watched.intValue!);
						console.info(`On fire?: ${(value & 1 << 0) != 0}`);
						client.write("entity_status", {
							entityId: this.convertId(packet.id),
							entityStatus: value,
						});
						break;
					case 2:
						value = watched.intValue;
						if (
							watched.dataValueId != 7 &&
							(watched.dataValueId != 18 || entity && entity.type != -1)
						) {
							wType = 0;
							value = watched.dataValueId == 10
								? 127
								: convertToByte(watched.intValue ?? 0);
							if (watched.dataValueId == 0 && entity) {
								value = entity.sneaking
									? (value | 1 << 1)
									: (value & ~(1 << 1));
							}
						}
						if (entity && entity.type == 21) {
							if (watched.dataValueId == 17 || watched.dataValueId == 18) {
								wType = watched.objectType;
								value = watched.intValue;
							} else if (watched.dataValueId == 19) {
								wType = 3;
								value = watched.floatValue ?? watched.intValue;
							}
						}
						if (watched.dataValueId == 1) {
							wType = 1;
							value = watched.intValue;
						}
						break;
					case 3:
						value = watched.floatValue;
						break;
					case 4:
						value = watched.stringValue;
						break;
					case 5:
						value = translateItem(watched.itemStack);
						break;
					case 6:
						value = watched.blockPos;
						break;
					case 7:
						value = {
							yaw: watched.vector!.x,
							pitch: watched.vector!.y,
							roll: watched.vector!.z,
						};
						break;
					default:
						value = watched.intValue;
						break;
				}
				props.push({ key: watched.dataValueId, value: value, type: wType });
			}

			if (entity) {
				for (const prop of props) {
					entity.metadata[prop.key] = prop;
				}
			}
			client.write("entity_metadata", {
				entityId: this.convertId(packet.id),
				metadata: props,
			});
		});
		ClientSocket.on("CPacketEntityPositionAndRotation", (packet) => {
			const entity = this.entities[packet.id];
			if (!entity) return;
			entity.pos = { x: packet.pos.x, y: packet.pos.y, z: packet.pos.z };
			entity.yaw = convertAngle(packet.yaw, false, entity.type == -1 ? 180 : 0);
			entity.pitch = convertAngle(packet.pitch);

			client.write("entity_teleport", {
				entityId: entity.id,
				x: entity.pos.x,
				y: entity.pos.y,
				z: entity.pos.z,
				yaw: entity.yaw,
				pitch: entity.pitch,
				onGround: packet.onGround,
			});
			client.write("entity_head_rotation", {
				entityId: entity.id,
				headYaw: entity.yaw,
			});
		});
		ClientSocket.on("CPacketEntityRelativePositionAndRotation", (packet) => {
			const entity = this.entities[packet.id];
			const yaw = packet.yaw != undefined
				? convertAngle(
					packet.yaw,
					false,
					(!entity || entity.type == -1) ? 180 : 0,
				)
				: 0;
			const pitch = packet.pitch != undefined ? convertAngle(packet.pitch) : 0;
			if (entity) {
				if (packet.yaw != undefined || packet.pitch != undefined) {
					entity.yaw = yaw;
					entity.pitch = pitch;
				}

				if (packet.pos) {
					const { pos } = entity;
					entity.pos = {
						x: pos.x + packet.pos.x,
						y: pos.y + packet.pos.y,
						z: pos.z + packet.pos.z,
					};

					const malformed = clampByte(packet.pos.x) != packet.pos.x ||
						clampByte(packet.pos.y) != packet.pos.y ||
						clampByte(packet.pos.z) != packet.pos.z;

					if (malformed) {
						client.write("entity_teleport", {
							entityId: entity.id,
							x: entity.pos.x,
							y: entity.pos.y,
							z: entity.pos.z,
							yaw: entity.yaw,
							pitch: entity.pitch,
							onGround: packet.onGround,
						});

						client.write("entity_head_rotation", {
							entityId: entity.id,
							headYaw: entity.yaw,
						});

						return;
					}
				}
			}

			if (
				packet.pos && (packet.yaw != undefined || packet.pitch != undefined)
			) {
				client.write("entity_move_look", {
					entityId: packet.id,
					dX: clampByte(packet.pos.x),
					dY: clampByte(packet.pos.y),
					dZ: clampByte(packet.pos.z),
					yaw,
					pitch,
					onGround: packet.onGround,
				});
			} else if (packet.pos) {
				client.write("rel_entity_move", {
					entityId: packet.id,
					dX: clampByte(packet.pos.x),
					dY: clampByte(packet.pos.y),
					dZ: clampByte(packet.pos.z),
					onGround: packet.onGround,
				});
			} else {
				client.write("entity_look", {
					entityId: packet.id,
					yaw: yaw,
					pitch: pitch,
					onGround: packet.onGround,
				});
			}

			if (packet.yaw) {
				client.write("entity_head_rotation", {
					entityId: packet.id,
					headYaw: yaw,
				});
			}
		});
		ClientSocket.on(
			"CPacketEntityStatus",
			(packet) =>
				client.write("entity_status", {
					entityId: this.convertId(packet.entityId),
					entityStatus: packet.entityStatus,
				}),
		);
		ClientSocket.on("CPacketExplosion", (packet) => {
			client.write("explosion", {
				...packet.pos,
				radius: packet.strength,
				affectedBlockOffsetsLength: packet.blocks.length,
				affectedBlockOffsets: packet.blocks.map((v) => {
					return {
						x: v.x,
						y: v.y,
						z: v.z,
					};
				}),
				playerMotionX: packet.playerPos.x ?? 0,
				playerMotionY: packet.playerPos.y ?? 0,
				playerMotionZ: packet.playerPos.z ?? 0,
			});
		});
		ClientSocket.on(
			"CPacketEntityVelocity",
			(packet) =>
				client.write("entity_velocity", {
					entityId: this.convertId(packet.id),
					velocityX: Math.max(Math.min(packet.motion.x * 8000, 32767), -32768),
					velocityY: Math.max(Math.min(packet.motion.y * 8000, 32767), -32768),
					velocityZ: Math.max(Math.min(packet.motion.z * 8000, 32767), -32768),
				}),
		);
		ClientSocket.on(
			"CPacketEntityEffect",
			(packet) =>
				client.write("entity_effect", {
					entityId: this.convertId(packet.id),
					effectId: packet.effectId,
					amplifier: packet.amplifier,
					duration: packet.duration,
					hideParticles: !packet.hideParticles,
				}),
		);
		ClientSocket.on(
			"CPacketRemoveEntityEffect",
			(packet) =>
				client.write("remove_entity_effect", {
					entityId: this.convertId(packet.id),
					effectId: packet.effectId,
				}),
		);
		ClientSocket.on(
			"CPacketEntityAttach",
			(packet) =>
				client.write("attach_entity", {
					entityId: this.convertId(packet.entity),
					vehicleId: this.convertId(packet.vehicle),
					leash: packet.leash != 0,
				}),
		);

		// LOCAL
		ClientSocket.on("CPacketPlayerPosition", (packet) => {
			this.local.pos = { x: packet.x, y: packet.y, z: packet.z };
			this.teleport = this.local.pos;
			client.write("position", {
				x: packet.x,
				y: packet.y,
				z: packet.z,
				yaw: 0,
				pitch: 0,
				flags: 24,
			});
		});
		ClientSocket.on("CPacketPlayerPosLook", (packet) => {
			if (
				isNaN(packet.x) || isNaN(packet.y) || isNaN(packet.z) ||
				isNaN(packet.yaw) || isNaN(packet.pitch)
			) {
				client.end("Received invalid player position and look packet");
				return;
			}

			this.local.pos = { x: packet.x, y: packet.y, z: packet.z };
			this.teleport = this.local.pos;
			client.write("position", {
				x: packet.x,
				y: packet.y,
				z: packet.z,
				yaw: (((packet.yaw * -1) * RAD2DEG) - 180),
				pitch: (packet.pitch * -1) * RAD2DEG,
				flags: 0,
			});
		});
		ClientSocket.on("CPacketPlayerReconciliation", (packet) => {
			if (!this.sentNewACInfo) {
				const ok = translateText(`\\yellow\\This server uses the new anti-cheat,
you will need to send Input packets in order to move on the server.`);
				client.write("chat", {
					message: JSON.stringify({
						extra: [ok],
						text: "",
					}),
					position: 1,
				});
				this.sentNewACInfo = true;
			}
			if (packet.reset) {
				this.local.inputSequenceNumber = 0;
				this.local.pos = { x: packet.x, y: packet.y, z: packet.z };
				this.teleport = this.local.pos;
				client.write("position", {
					x: packet.x,
					y: packet.y,
					z: packet.z,
					yaw: 0,
					pitch: 0,
					flags: 24,
				});
			}

			this.local.serverPos = { x: packet.x, y: packet.y, z: packet.z };
		});
		ClientSocket.on("CPacketRespawn", (packet) => {
			if (packet.client) {
				ClientSocket.sendPacket(new SPacketRespawn$1());
			}
			if (packet.notDeath) {
				client.write("named_sound_effect", {
					soundName: "portal.portal",
					...this.local.pos,
					volume: 1,
					pitch: 64,
				});
				this.dimension = packet.dimension ?? this.dimension;
			}
			world.reload();
			client.write("respawn", {
				dimension: packet.dimension,
				difficulty: 2,
				gamemode: 2,
				levelType: "FLAT",
			});
		});
		ClientSocket.on("CPacketUpdateHealth", (packet) => {
			if (packet.id == this.local.id) {
				this.local.health = {
					health: packet.hp ?? this.local.health.health,
					food: packet.food ?? this.local.health.food,
					foodSaturation: packet.foodSaturation ??
						this.local.health.foodSaturation,
				};
				client.write("update_health", this.local.health);
			}
		});
		ClientSocket.on("CPacketUpdateStatus", (packet) => {
			if (packet.mode) {
				if (packet.id == this.local.id) {
					client.write("game_state_change", {
						reason: 3,
						gameMode: GAMEMODES[packet.mode ?? "survival"],
					});
				} else {
					this.gamemodes[packet.id] = GAMEMODES[packet.mode ?? "survival"];
					if (tablist.entries[packet.id]) {
						tablist.tabs[packet.id].gamemode = this.gamemodes[packet.id];
						client.write("player_info", {
							action: 1,
							data: [{
								UUID: tablist.entries[packet.id],
								gamemode: this.gamemodes[packet.id],
							}],
						});
					}

					this.check(this.entities[packet.id]);
				}
			}
		});
		ClientSocket.on(
			"CPacketSetExperience",
			(packet) =>
				client.write("experience", {
					experienceBar: packet.experience,
					level: packet.level,
					totalExperience: packet.experienceTotal,
				}),
		);

		ClientSocket.on("CPacketSetSlot", (packet) => {
			this.local.inventory.main[packet.slot] = packet.slotData;
		});
	}
	minecraft(mcClient) {
		client = mcClient;
		client.on("flying", ({ onGround } = {}) => {
			if (this.local.id < 0) return;
			this.actions();
			ClientSocket.sendPacket(new SPacketPlayerPosLook({ onGround }));
			this.abilities();
		});
		client.on("position", ({ x, y, z, onGround } = {}) => {
			if (this.local.id < 0) return;
			this.local.pos = { x: x, y: y, z: z };
			this.actions();
			ClientSocket.sendPacket(
				new SPacketPlayerPosLook({
					pos: this.local.pos,
					onGround,
				}),
			);
			this.abilities(true);
		});
		client.on("look", ({ yaw, pitch, onGround } = {}) => {
			if (this.local.id < 0) return;
			this.local.yaw = ((yaw * -1) - 180) * DEG2RAD;
			this.local.pitch = (pitch * -1) * DEG2RAD;
			this.actions();
			ClientSocket.sendPacket(
				new SPacketPlayerPosLook({
					yaw: this.local.yaw,
					pitch: this.local.pitch,
					onGround,
				}),
			);
			this.abilities();
		});
		client.on("position_look", ({ x, y, z, onGround, yaw, pitch } = {}) => {
			if (this.local.id < 0) return;
			this.local.pos = { x, y, z };
			this.local.yaw = ((yaw * -1) - 180) * DEG2RAD;
			this.local.pitch = (pitch * -1) * DEG2RAD;
			this.actions();
			ClientSocket.sendPacket(
				new SPacketPlayerPosLook({
					pos: this.local.pos,
					yaw: this.local.yaw,
					pitch: this.local.pitch,
					onGround,
				}),
			);
			this.abilities(true);
		});
		client.on("steer_vehicle", ({ sideways, forward, jump } = {}) => {
			if (!this.desyncFlag) {
				this.local.inputSequenceNumber++;
			} else {
				const offset = 0.25;
				client.write("world_particles", {
					particleId: 13,
					longDistance: true,
					x: this.local.serverPos.x - offset,
					y: this.local.serverPos.y - offset,
					z: this.local.serverPos.z - offset,
					offsetX: offset,
					offsetY: offset,
					offsetZ: offset,
					particleData: 1,
					particles: 2,
				});
			}

			ClientSocket.sendPacket(
				new SPacketPlayerInput({
					sequenceNumber: this.local.inputSequenceNumber,
					left: sideways > 0,
					right: sideways < 0,
					up: forward > 0,
					down: forward < 0,
					yaw: this.local.yaw,
					pitch: this.local.pitch,
					jump: (jump & 1) > 0,
					sneak: (jump & 2) > 0,
					sprint: this.local.state[1] ?? false,
					pos: this.desyncFlag
						? desyncMath(this.local.pos, this.local.serverPos, DESYNC_MAX_SPEED)
						: this.local.pos,
				}),
			);
		});
		client.on("held_item_slot", ({ slotId }) => {
			this.local.selectedSlot = slotId ?? -1;
			ClientSocket.sendPacket(new SPacketHeldItemChange({ slot: slotId ?? 0 }));
		});
		client.on("arm_animation", () => {
			if (!world.breaking) ClientSocket.sendPacket(new SPacketClick({}));
			this.local.state[0] = Date.now() + 300;
		});
		client.on("entity_action", (packet) => {
			switch (packet.actionId) {
				case 0:
					this.local.state[2] = true;
					break;
				case 1:
					this.local.state[2] = false;
					break;
				case 2:
					ClientSocket.sendPacket(
						new SPacketEntityAction({
							id: this.local.id,
							stopSleeping: true,
						}),
					);
					break;
				case 3:
					this.local.state[1] = true;
					break;
				case 4:
					this.local.state[1] = false;
					break;
			}
		});
		client.on("use_entity", (packet) => {
			if (packet.target != undefined && this.entities[packet.target]) {
				ClientSocket.sendPacket(
					new SPacketUseEntity({
						id: packet.target,
						action: packet.mouse,
						hitVec: new PBVector3(
							clampToBox(this.local.pos, this.entities[packet.target].pos),
						),
					}),
				);
			}
		});
		client.on("client_command", (packet) => {
			if (packet.payload == 0) {
				ClientSocket.sendPacket(new SPacketRespawn$1());
			}
		});
		client.on("set_creative_slot", (packet) => {
			const { slot: mcSlot, item: stack } = packet;
			const tlStack = translateItemBack(stack);

			const slt = (SLOTS_REVERSE[mcSlot] ?? mcSlot) ??
				this.findHotbarSlotForPickBlock(tlStack);

			this.local.inventory.main[slt] = tlStack;

			// Update selectedSlot to the new slot if not explicitly provided (for pickBlock cases)
			if (mcSlot === undefined || mcSlot === -1) {
				this.local.selectedSlot = slt;
			}

			const { main, armor } = this.local.inventory;

			const data = {
				main: main.map((s) =>
					s == null || s.stackSize == 0 ? PBItemStack.EMPTY : s
				),
				armor: armor.map((a) => a ?? PBItemStack.EMPTY),
				idkWhatThisIs: this.local.inventory.main[this.local.selectedSlot] ??
					PBItemStack.EMPTY,
			};

			ClientSocket.sendPacket(new SPacketUpdateInventory(data));
		});
	}
	override cleanup(requeue = false) {
		this.entities = {};
		this.skins = {};
		this.gamemodes = {};
		this.desyncFlag = false;
		this.local = DEFAULT_LOCAL_DATA;
		this.sentNewACInfo = false;
	}
	override obtainHandlers(handlers: typeof import("../init.js")) {
		tablist = handlers.tablist;
		world = handlers.world;
	}
}

export default new EntityHandler();
