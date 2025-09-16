import Handler from "../handler.ts";
import {
	ClientSocket,
	SPacketClickWindow,
	SPacketCloseWindow,
	SPacketConfirmTransaction,
} from "../../main.js";
import {
	GUIS,
	makeItem,
	SLOTS,
	WINDOW_NAMES,
	WINDOW_TYPES,
} from "../../types/guis.ts";
import { translateItem, translateItemBack } from "../../utils.js";
import { handleCommand } from "./misc.ts";
import { ServerClient } from "minecraft-protocol";
let client: ServerClient | undefined, entity: EntityHandler;

// https://stackoverflow.com/a/20856346
/**
 * Removes non-ASCII characters from a string
 * @param str a string which may have non-ASCII characters that we want to remove.
 * @returns a string that will never have non-ASCII characters
 */
function removeNonASCII(str: string): string {
	return str.replace(/[^\x00-\x7F]/g, "");
}

type Server = {
	id: string;
	category: string;
	playerCount: number;
	maxPlayers: number;
	worldName: string;
	gameMode: string;
	worldType: string;
	timeAllocated: number;
	ownerUsername: string;
};

type ServerList = Server[];

export class GuiHandler extends Handler {
	ignorePacket = false;
	currentlyOpen = "";
	override miniblox() {
		ClientSocket.on("CPacketOpenWindow", (packet) => {
			if (client === undefined) return;
			if (WINDOW_TYPES[packet.guiID]) {
				let translation = WINDOW_NAMES[packet.title];
				if (packet.guiID == "furnace") translation = WINDOW_NAMES.Furnace;
				client.write("open_window", {
					windowId: packet.windowId,
					inventoryType: WINDOW_TYPES[packet.guiID],
					windowTitle: translation ??
						JSON.stringify({ text: packet.title ?? "None" }),
					slotCount: packet.size ?? 0,
					entityId: entity.local.mcId,
				});
			}
		});
		ClientSocket.on("CPacketOpenShop", (packet) => {
			if (client === undefined) return;
			const gui = GUIS[packet.type];
			if (gui) {
				const itemCount = Math.ceil(gui.items.length / 9) * 9;
				client.write("open_window", {
					windowId: 255,
					inventoryType: "minecraft:container",
					windowTitle: JSON.stringify({ text: gui.name }),
					slotCount: itemCount,
					entityId: entity.local.mcId,
				});
				this.currentlyOpen = packet.type;

				const contents = Array(itemCount).fill({ blockId: -1 });
				for (let i = 0; i < gui.items.length; i++) {
					contents[i] = gui.items[i];
				}

				client.write("window_items", {
					windowId: 255,
					items: contents,
				});
			}
		});
		ClientSocket.on("CPacketWindowItems", (packet) => {
			if (this.ignorePacket) {
				this.ignorePacket = false;
				return;
			}

			let items = Array(packet.items.length).fill({ blockId: -1 });
			for (let i = 0; i < packet.items.length; i++) {
				items[packet.windowId == 0 && SLOTS[i] != undefined ? SLOTS[i] : i] =
					translateItem(packet.items[i]);
			}
			if (client === undefined) return;
			client.write("window_items", {
				windowId: packet.windowId,
				items: items,
			});
		});
		ClientSocket.on(
			"CPacketWindowProperty",
			(packet) =>
				client!.write("craft_progress_bar", {
					windowId: packet.windowId,
					property: packet.varIndex,
					value: packet.varValue,
				}),
		);
		ClientSocket.on("CPacketSetSlot", (packet) =>
			client!.write("set_slot", {
				windowId: packet.windowId,
				slot: packet.windowId == 0 && SLOTS[packet.slot] != undefined
					? SLOTS[packet.slot]
					: packet.slot,
				item: translateItem(packet.slotData),
			}));
		ClientSocket.on(
			"CPacketCloseWindow",
			(packet) => client!.write("close_window", { windowId: packet.windowId }),
		);
		ClientSocket.on(
			"CPacketConfirmTransaction",
			(packet) =>
				client!.write("transaction", {
					windowId: packet.windowId,
					action: packet.uid,
					accepted: packet.accepted,
				}),
		);
	}
	minecraft(mcClient: ServerClient) {
		client = mcClient;
		client.on("window_click", (packet) => {
			let slot = Number.parseInt(packet.slot) - 5;
			if (slot < 4) slot = 3 - slot;
			if (packet.windowId != 0) slot = Number.parseInt(packet.slot);
			if (packet.windowId == 255) {
				const gui = GUIS[this.currentlyOpen];
				if (gui) gui.command(packet.item, ClientSocket, client, gui);
				return;
			}
			if (packet.windowId === 69) {
				const serverId = packet.item.nbtData.value.serverId.value;
				if (serverId) {
					handleCommand("join", serverId);
				}
				return;
			}
			const data = {
				windowId: packet.windowId,
				slotId: slot,
				button: packet.mouseButton,
				mode: packet.mode,
				itemStack: translateItemBack(packet.item),
				transactionId: packet.action,
			};
			console.log(data);
			ClientSocket.sendPacket(
				new SPacketClickWindow(data),
			);
		});
		client.on("transaction", (packet) => {
			ClientSocket.sendPacket(
				new SPacketConfirmTransaction({
					windowId: packet.windowId,
					actionNumber: packet.action,
					accepted: packet.accepted,
				}),
			);
		});
		client.on(
			"close_window",
			(packet) =>
				ClientSocket.sendPacket(
					new SPacketCloseWindow({
						windowId: packet.windowId == 255 ? 0 : packet.windowId,
					}),
				),
		);
	}
	async showPlanetsGUI() {
		if (client == undefined) {
			throw "showPlanetsGUI called while client is undefined";
		}
		const sl = await fetch(
			"https://session.coolmathblox.ca/launch/server_list/no_account",
			{
				method: "POST",
				body: "",
			},
		).then((r) => r.json())
			.then(
				(
					/**
					 * @param {{servers: ServerList}} r
					 */
					r: { servers: ServerList },
				) => r.servers.filter((s) => s.category === "planets"),
			);
		const items = [];
		for (const server of sl) {
			items.push(makeItem({
				name: removeNonASCII(server.worldName),
				item: "stained_glass_pane",
				lore: [
					`by ${server.ownerUsername}`,
					`game mode: ${server.gameMode}`,
					`max players: ${server.playerCount}/${server.maxPlayers}`,
				],
			}, {
				serverId: {
					type: "string",
					value: server.id,
				},
			}));
		}

		const itemCount = Math.ceil(items.length / 9) * 9;
		client.write("open_window", {
			windowId: 69,
			inventoryType: "minecraft:container",
			windowTitle: JSON.stringify({ text: "Planet Selection" }),
			slotCount: itemCount,
			entityId: entity.local.mcId,
		});

		const contents = Array(itemCount).fill({ blockId: -1 });
		for (let i = 0; i < items.length; i++) {
			contents[i] = items[i];
		}

		client.write("window_items", {
			windowId: 69,
			items: contents,
		});
	}
	override cleanup(requeue = false) {
		client = requeue ? client : undefined;
		this.currentlyOpen = "";
		this.ignorePacket = false;
	}
	override obtainHandlers(handlers: typeof import("../init.js")) {
		entity = handlers.entity;
	}
}

export default new GuiHandler();
