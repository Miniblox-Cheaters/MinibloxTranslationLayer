import Handler from '../handler.ts';
import { ClientSocket, SPacketPing, SPacketAnalytics } from '../../main.js';
import { translateText, LEVEL_TO_COLOUR } from '../../utils.js';
import * as SKINS from '../../types/skins.ts';
import { granddad } from '../../types/skins.ts';
import type { ServerClient } from "minecraft-protocol";
import type { EntityHandler } from "./entity.ts";

let client: ServerClient, entityH: EntityHandler;

const self = class TabListHandler extends Handler {
	tabs: any;
	entries: any;
	filteredPing: number;
	pingLoop: any;
	analyticsLoop: any;
	override miniblox() {
		ClientSocket.on('CPacketPlayerList', packet => {
			let lists = [[], [], [], [], []], exists = {};
			for (const entry of packet.players) {
				let nameSplit = entry.name.split(' ');
				if (entry.id == entityH.local.id) nameSplit[nameSplit.length - 1] = client.username;
				const name = nameSplit[nameSplit.length - 1].slice(0, 16);
				const uuid = entry.id == entityH.local.id ? client.uuid : entry.uuid;
				const skin = entityH.skins[entry.id] != undefined ? (SKINS[entityH.skins[entry.id]] ?? granddad) : granddad;
				const prefix = (nameSplit.length > 1 ? translateText(nameSplit.slice(0, nameSplit.length - 1).join(' ')) + ' ' : '').slice(0, 14) + translateText(`\\${(entry.color != 'white' ? entry.color : undefined) ?? (entry.id == entityH.local.id ? 'white' : 'reset')}\\`);
				const suffix = (entry.level && entry.level > 0) ? translateText(`\\${entry.level ? LEVEL_TO_COLOUR[entry.level] : 'white'}\\ (${entry.level})`) : '';
				const gamemode = entityH.gamemodes[entry.id] ?? 0;
				let oldTab = this.tabs[entry.id];
				this.entries[entry.id] = uuid;
				this.tabs[entry.id] = {
					prefix: prefix,
					suffix: suffix,
					ping: entry.ping,
					gamemode: gamemode
				};
				exists[entry.id] = true;

				let addTeam = !oldTab;
				if (oldTab) {
					if (gamemode != oldTab.gamemode) lists[1].push({ UUID: uuid, gamemode: gamemode });
					if (entry.ping != oldTab.ping) lists[2].push({ UUID: uuid, ping: entry.ping });
					if (prefix != oldTab.prefix || suffix != oldTab.suffix) {
						addTeam = true;
						client.write('scoreboard_team', {
							team: uuid.slice(0, 16),
							mode: 1
						});
					}
				} else {
					lists[0].push({
						UUID: uuid,
						name: name,
						properties: [{ name: 'textures', value: skin[0], signature: skin[1] }],
						gamemode: gamemode,
						ping: entry.ping
					});
				}

				if (addTeam) {
					client.write('scoreboard_team', {
						team: uuid.slice(0, 16),
						mode: 0,
						name: uuid.slice(0, 32),
						prefix,
						suffix,
						friendlyFire: true,
						nameTagVisibility: 'all',
						color: 0,
						players: [name]
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
				let list = lists[i];
				if (list.length <= 0) continue;
				client.write('player_info', {
					action: i,
					data: list
				});
				if (i == 0 || i == 4) entityH.checkAll();
			}

			client.write('playerlist_header', {
				header: JSON.stringify({ text: translateText('\\cyan\\You are playing on \\lime\\miniblox.io') }),
				footer: JSON.stringify({ text: translateText('\\gold\\Translation layer made by datamodel') })
			});
		});
		ClientSocket.on("CPacketPong", packet => {
			this.filteredPing += (Math.max(Date.now() - Number(packet.time), 1) - this.filteredPing) / 3;
		});
	}
	minecraft(mcClient) {
		client = mcClient;
		client.on('keep_alive', packet => {
			if (packet.keepAliveId > 0) ClientSocket.sendPacket(new SPacketPing({ time: BigInt(Date.now()) }));
		});
	}
	override cleanup(requeue = false) {
		client = requeue ? client : undefined;
		if (this.pingLoop) clearInterval(this.pingLoop);
		if (this.analyticsLoop) clearInterval(this.analyticsLoop);
		if (requeue) {
			this.pingLoop = setInterval(() => {
				client.write('keep_alive', { keepAliveId: Math.floor(Math.random() * 10000) });
			}, 1000);
			this.analyticsLoop = setInterval(() => {
				const randomBuffer = new Uint32Array(1);
				crypto.getRandomValues(randomBuffer);

				let randomNumber = randomBuffer[0] / (0xffffffff + 1);

				const max = 125;
				const min = 60;

				let fps = Math.floor(randomNumber * (max - min + 1)) + min;

				ClientSocket.sendPacket(new SPacketAnalytics({
					fps,
					ping: this.filteredPing
				}));
			}, 30000);
			if (client) {
				let data = [];
				Object.values(this.entries).forEach((uuid) => {
					data.push({ UUID: uuid });
					client.write('scoreboard_team', {
						team: uuid.slice(0, 16),
						mode: 1
					});
				})
				client.write('player_info', {
					action: 4,
					data: data
				});
			}
		}
		this.entries = {};
		this.tabs = {};
		this.filteredPing = 0;
	}
	override obtainHandlers(handlers) {
		entityH = handlers.entity;
	}
};

export default new self();