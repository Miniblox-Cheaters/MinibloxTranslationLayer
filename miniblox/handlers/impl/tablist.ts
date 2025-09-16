import Handler from "../handler.ts";
import { ClientSocket, SPacketAnalytics, SPacketPing } from "../../main.js";
import { LEVEL_TO_COLOR, translateText } from "../../utils.js";
import * as SKINS from "../../types/skins.ts";
import { granddad } from "../../types/skins.ts";
import type { ServerClient } from "minecraft-protocol";
import type { EntityHandler } from "./entity.ts";

let client: ServerClient, entityH: EntityHandler;

interface Tab {
	prefix: string;
	suffix: string;
	ping: number;
	gamemode: number;
}

interface WithUUID {
	UUID: string;
}

interface Add extends WithUUID {
	UUID: string;
	name: string;
	properties: [{
		name: "textures";
		value: string;
		signature: string;
	}];
	gamemode: number;
	ping: number;
}

interface UpdateGamemode extends WithUUID {
	gamemode: number;
}

interface UpdatePing extends WithUUID {
	ping: number;
}

type Remove = WithUUID;
type UpdateDisplayName = WithUUID;

export class TabListHandler extends Handler {
	tabs: { [entryId: string]: Tab } = {};
	entries: { [eid: string]: string } = {};
	filteredPing = -1;
	pingLoop = -2;
	analyticsLoop = -2;
	override miniblox() {
		ClientSocket.on("CPacketPlayerList", (packet) => {
			const lists: [
					Add[],
					UpdateGamemode[],
					UpdatePing[],
					UpdateDisplayName[],
					Remove[],
				] = [[], [], [], [], []],
				exists: { [uuid: string]: boolean } = {};
			for (const entry of packet.players) {
				const nameSplit = (entry.name ?? "").split(" ");
				if (entry.id == entityH.local.id) {
					nameSplit[nameSplit.length - 1] = client.username;
				}
				const name = nameSplit[nameSplit.length - 1].slice(0, 16);
				const uuid = entry.id == entityH.local.id ? client.uuid : entry.uuid;
				const a = SKINS as unknown as Record<string, [string, string]>;
				const b = entityH.skins[entry.id];
				const skin = b != undefined
					? (a[b] ?? granddad)
					: granddad;
				const prefix = (nameSplit.length > 1
					? translateText(nameSplit.slice(0, nameSplit.length - 1).join(" ")) +
						" "
					: "").slice(0, 14) +
					translateText(
						`\\${
							(entry.color != "white" ? entry.color : undefined) ??
								(entry.id == entityH.local.id ? "white" : "reset")
						}\\`,
					);
				const suffix = (entry.level && entry.level > 0)
					? translateText(
						`\\${
							entry.level ? LEVEL_TO_COLOR[entry.level] : "white"
						}\\ (${entry.level})`,
					)
					: "";
				const gamemode = entityH.gamemodes[entry.id] ?? 0;
				const oldTab = this.tabs[entry.id];
				this.entries[entry.id] = uuid;
				this.tabs[entry.id] = {
					prefix: prefix,
					suffix: suffix,
					ping: entry.ping!,
					gamemode: gamemode,
				};
				exists[entry.id] = true;

				let addTeam = !oldTab;
				if (oldTab) {
					if (gamemode != oldTab.gamemode) {
						lists[1].push({ UUID: uuid, gamemode: gamemode });
					}
					if (entry.ping != oldTab.ping) {
						lists[2].push({ UUID: uuid, ping: entry.ping! });
					}
					if (prefix != oldTab.prefix || suffix != oldTab.suffix) {
						addTeam = true;
						client.write("scoreboard_team", {
							team: uuid.slice(0, 16),
							mode: 1,
						});
					}
				} else {
					lists[0].push({
						UUID: uuid,
						name: name,
						properties: [{
							name: "textures",
							value: skin[0],
							signature: skin[1],
						}],
						gamemode: gamemode,
						ping: entry.ping!,
					});
				}

				if (addTeam) {
					client.write("scoreboard_team", {
						team: uuid.slice(0, 16),
						mode: 0,
						name: uuid.slice(0, 32),
						prefix,
						suffix,
						friendlyFire: true,
						nameTagVisibility: "all",
						color: 0,
						players: [name],
					});
				}
			}

			for (const entry of Object.keys(this.entries)) {
				if (!exists[entry]) {
					lists[4].push({ UUID: this.entries[entry] });
					delete this.entries[entry];
					delete this.tabs[entry];
				}
			}

			for (let i = 0; i < lists.length; i++) {
				const list = lists[i];
				if (list.length <= 0) continue;
				client.write("player_info", {
					action: i,
					data: list,
				});
				if (i == 0 || i == 4) entityH.checkAll();
			}

			client.write("playerlist_header", {
				header: JSON.stringify({
					text: translateText("\\cyan\\You are playing on \\lime\\miniblox.io"),
				}),
				footer: JSON.stringify({
					text: translateText("\\gold\\Translation layer made by datamodel"),
				}),
			});
		});
		ClientSocket.on("CPacketPong", (packet) => {
			this.filteredPing +=
				(Math.max(Date.now() - Number(packet.time), 1) - this.filteredPing) / 3;
		});
	}
	minecraft(mcClient: ServerClient) {
		client = mcClient;
		client.on("keep_alive", (packet) => {
			if (packet.keepAliveId > 0) {
				ClientSocket.sendPacket(new SPacketPing({ time: BigInt(Date.now()) }));
			}
		});
	}
	override cleanup(requeue = false) {
		if (this.pingLoop) clearInterval(this.pingLoop);
		if (this.analyticsLoop) clearInterval(this.analyticsLoop);
		if (requeue) {
			this.pingLoop = setInterval(() => {
				client.write("keep_alive", {
					keepAliveId: Math.floor(Math.random() * 10000),
				});
			}, 1e3);
			this.analyticsLoop = setInterval(() => {
				const randomBuffer = new Uint32Array(1);
				crypto.getRandomValues(randomBuffer);

				const randomNumber = randomBuffer[0] / (0xffffffff + 1);

				const max = 60;
				const min = 50;

				const fps = Math.floor(randomNumber * (max - min + 1)) + min;

				ClientSocket.sendPacket(
					new SPacketAnalytics({
						fps,
						ping: this.filteredPing,
					}),
				);
			}, 3e3);
			if (client) {
				const data = Object.values(this.entries).map((uuid) => ({
					UUID: uuid,
				}));
				data.forEach(({ UUID: uuid }) => {
					client.write("scoreboard_team", {
						team: uuid.slice(0, 16),
						mode: 1,
					});
				});
				client.write("player_info", {
					action: 4,
					data,
				});
			}
		}
		this.entries = {};
		this.tabs = {};
		this.filteredPing = 0;
	}
	override obtainHandlers(handlers: typeof import("../init.js")) {
		entityH = handlers.entity;
	}
};

export default new TabListHandler();
