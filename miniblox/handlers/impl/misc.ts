import Handler from '../handler.ts';
import { ClientSocket, SPacketMessage, SPacketTabComplete$1, SPacketQueueNext, CPacketServerInfo } from '../../main.js';
import { translateText } from '../../utils.js';
import { CN_TO_CC } from '../../types/colors.js';
import type { ServerClient } from "minecraft-protocol";
let client: ServerClient, entity: EntityHandler, connect, world: WorldHandler, gui: GuiHandler;

/**
 * Matches a server ID (e.g. https://miniblox.io/?join=JOINCODEHERE)
 */
const JOIN_CODE = /(?:https?:\/\/^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,6}\/?join=)?([A-Z]+)/;

/**
 * Matches a server ID
 */
const SERVER_ID = /(large|small|medium|planet)-[A-z|0-9]+-[A-z|0-9]+/;

const descriptions = {
	"Server Name": "The name of the server",
	"Server ID": "The ID of the server, can be used with the /join command",
	"Invite Code":
		"The invite code of the server, can be used with the /join command and the miniblox site.",
	"Server Version": "The version of the server.",
	"Server Category": "The category of the server",
	"Access Control": "If this server is public or private",
	"World Type": "The type of world (e.g. VOID or FLAT)",
	"Cheats?": "If cheat commands are enabled",
	"Command Blocks?": "If command blocks are enabled",
	"Daylight Cycle?": "If the daylight cycle should be done",
	"Metadata": "A JSON object that I don't know what is used for.",
	"Permissions": "Permission data",
	"PvP?": "If PvP is enabled",
	"Start Time": "When the server was started"
};

// const fakeLocalStorage = {};

class IllegalArgumentException extends Error { }

/**
 * Resolves a join code to a server ID,
 * it will return {@link code} if {@link code} is already a server ID.
 * @param {string} code the invite code or a server ID.
 * @return {Promise<string | null>} a server ID if the server resolved the invite code, otherwise `null`
 */
async function resolveServerID(code: string): Promise<string | null> {
	if (SERVER_ID.test(code))
		return code; // no need for modifying, this is already a server ID.
	const joinCode = JOIN_CODE.exec(code);
	if (joinCode === null) throw new IllegalArgumentException(`Invalid invite code: ${code}`);
	const serverId = await fetch("https://session.coolmathblox.ca/launch/invite_code", {
		method: "POST",
		body: JSON.stringify({
			code: joinCode[1]
		}),
		headers: {
			"Content-Type": "application/json"
		}
	}).then(r => r.json()).then(r => r.serverId);
	return serverId;
}

function stringifyBoolean(b: boolean | null): string {
	if (b === null)
		return "\u00a7cNOT SPECIFIED";

	return b ? "\u00a72yes" : "\u00a7cno";
}

/**
 * @param {string} cmd the command name
 * @param {...string} args the arguments to the command
 * @returns {Promise<boolean>} if the command should be passed on to miniblox or not.
 */
export async function handleCommand(cmd: string, ...args: string[]): Promise<boolean> {
	switch (cmd) {
		case "q":
		case "queue":
		case "play":
			connect(client, true, args[0]);
			break;
		case "login":
			try {
				await Deno.writeTextFile("./login.token", args.join(" "));
				client.write('chat', {
					message: JSON.stringify({
						extra: [translateText('\\green\\Successfully logged in! Rejoin the game.')],
						text: ''
					}),
					position: 1
				});
			} catch (err) {
				client.write('chat', {
					message: JSON.stringify({
						extra: [translateText(`\\red\\Failed to save file! ${err.message}`)],
						text: ''
					}),
					position: 1
				});
				console.error(err);
			}
			break;
		case "join": {
			const code = args.join(" ");
			try {
				const resolved = await resolveServerID(code) ?? code;
				connect(client, true, undefined, resolved);
			} catch (e) {
				client.write('chat', {
					message: JSON.stringify({
						extra: [translateText(`\\red\\Failed to join server! ${e.message}`)],
						text: ''
					}),
					position: 1
				});
			}
			break;
		}
		case "resync":
			if (entity.teleport) {
				client.write('position', {
					x: entity.teleport.x,
					y: entity.teleport.y,
					z: entity.teleport.z,
					yaw: 0,
					pitch: 0,
					flags: 24
				});

				client.write('chat', {
					message: JSON.stringify({
						extra: [translateText('\\green\\Re-synced!')],
						text: ''
					}),
					position: 1
				});
			}
			break;
		case "reloadchunks":
			world.reload();
			break;
		case "desync": {
			entity.desyncFlag = !entity.desyncFlag;
			const desynced = entity.desyncFlag;
			const lol = desynced ? "Desync" : "Resync";
			client.write('chat', {
				message: JSON.stringify({
					extra: [translateText(`\\${desynced ? "red" : "green"}\\${lol}ed`)],
					text: ''
				}),
				position: 1
			});
			break;
		}
		case "planets":
			gui.showPlanetsGUI();
			break;

		case "next":
			ClientSocket.sendPacket(new SPacketQueueNext);
			//connect(client, true, MiscHandler.INSTANCE.gameType);
			break;

		case "serverid":
		case "id":
		case "invite": {
			const { inviteCode, serverId } = MiscHandler.serverInfo;
			client.write('chat', {
				message: JSON.stringify({
					extra: [
						"Invite code: https://miniblox.io/?join=",
						{
							text: MiscHandler.serverInfo.inviteCode,
							color: "yellow",
							hoverEvent: {
								action: "show_text",
								value: `This is the invite code for the server.
You can join this using the link provided or with /join ${inviteCode}`
							}
						},
						"\nServer ID: ",
						{
							text: serverId,
							color: "yellow",
							hoverEvent: {
								action: "show_text",
								value: `This is the ID of the server.
You can't use this with the normal Miniblox site,
but you can join it using /join ${serverId}`
							}
						},
						"\nWant more? Run ",
						{
							text: "/serverinfo",
							color: "yellow",
							clickEvent: {
								action: "run_command",
								value: "/serverinfo"
							}
						},
						" for even more (probably useless) info about this server"
					],
					text: ""
				}),
				position: 1
			});
			break;
		}
		case "serverinfo": {
			const {
				serverName, serverId,
				inviteCode, serverVersion,
				serverCategory, accessControl,
				worldType, cheats,
				commandBlocksEnabled, doDaylightCycle,
				metadata, playerPermissionEntries,
				pvpEnabled, startTime
			} = MiscHandler.serverInfo;
			const perms = playerPermissionEntries.filter(e => e.permissionLevel > 0);
			const tbl = {
				"Server Name": serverName,
				"Server ID": serverId,
				"Invite Code": inviteCode ?? "missing",
				"Server Version": serverVersion,
				"Server Category": serverCategory,
				"Access Control": accessControl,
				"World Type": worldType,
				"Cheats?": stringifyBoolean(cheats),
				"Command Blocks?": stringifyBoolean(commandBlocksEnabled),
				"Daylight Cycle?": stringifyBoolean(doDaylightCycle),
				"Metadata": metadata ?? "missing",
				"Permissions": perms.length > 0 ? perms.join(", ") : "None",
				"PvP?": stringifyBoolean(pvpEnabled),
				"Start Time": new Date(Number(startTime)).toLocaleString()
			};
			const built = [
				"§2SERVER INFO:§r\n",
				...Object.entries(tbl).flatMap(([k, v]) => {
					return [`${k}: `, {
						text: `${v}\n`,
						color: "yellow",
						hoverEvent: {
							action: "show_text",
							value: descriptions[k] ?? "Couldn't find a description for this"
						}
					}];
				})
			];
			client.write('chat', {
				message: JSON.stringify({
					extra: built,
					text: ''
				}),
				position: 1
			});
			break;
		}
		default:
			return false;
	}
	return true;
}

export class MiscHandler extends Handler {
	static INSTANCE = new MiscHandler();
	static serverInfo = {

		/** @type {string} */
		serverId: "???",
		/** @type {string} */
		serverName: "???",
		/** @type {string} */
		serverVersion: "???",
		/** @type {string} */
		serverCategory: "???",
		/** @type {string} */
		accessControl: "???",
		/** @type {string} */
		worldType: "???",
		/** @type {boolean | undefined} */
		doDaylightCycle: true,
		/** @type {string | undefined} */
		inviteCode: "???",
		/** @type {boolean | undefined} */
		cheats: false,
		/** @type {boolean | undefined} */
		pvpEnabled: true,
		/** @type {BigInt} */
		startTime: -1n,
		/** @type {PlayerPermissionEntry[]} */
		playerPermissionEntries: [],
		/** @type {string | undefined} */
		metadata: "???",
		/** @type {boolean | undefined} */
		commandBlocksEnabled: false
	};

	gameType: string = "???";

	/**
	 * @param {CPacketServerInfo} packet
	 */
	static setServerInfoData(packet: CPacketServerInfo) {
		const {
			serverName, serverId,
			inviteCode, serverVersion,
			serverCategory, accessControl,
			worldType, cheats,
			commandBlocksEnabled, doDaylightCycle,
			metadata, playerPermissionEntries,
			pvpEnabled, startTime
		} = packet;

		MiscHandler.serverInfo = {
			serverName, serverId,
			inviteCode, serverVersion,
			serverCategory, accessControl,
			worldType, cheats,
			commandBlocksEnabled, doDaylightCycle,
			metadata, playerPermissionEntries,
			pvpEnabled, startTime
		};
	}
	/**
	 * @param {string} gameType
	 */
	override miniblox(gameType: string) {
		this.gameType = gameType;
		ClientSocket.on('CPacketServerInfo', MiscHandler.setServerInfoData);
		ClientSocket.on("CPacketServerMetadata", packet => {
			MiscHandler.serverInfo.metadata = packet.metadata;
		});
		ClientSocket.on("CPacketChangeServers", packet => {
			console.info(`Got change server packet, url: ${packet.url}`)
		});
		ClientSocket.on("CPacketQueueNext", packet => {
			console.log(`Got queue next packet, minigame id = ${packet.minigameId}, config = ${packet.minigameConfig}`)
			connect(client, true, packet.minigameId);
		})
		ClientSocket.on('CPacketMessage', /**  @param {CPacketMessage} packet **/(packet: CPacketMessage) => {
			const msg = packet.text;
			if (msg !== undefined) {
				const extra = [translateText(msg)];
				if (packet.color !== undefined && CN_TO_CC[packet.color] !== undefined)
					extra.splice(0, 0, CN_TO_CC[packet.color]);

				// const toast = packet.toast ?? false;
				const position = /*toast
					? 2
					: */packet.id === undefined
						? 1
						: 0;

				client.write('chat', {
					message: JSON.stringify({
						extra,
						text: ''
					}),
					position
				});

				if (packet.id === undefined && msg.includes('Summary')) {
					client.write('chat', {
						message: JSON.stringify({
							text: '',
							extra: [
								{
									text: "Click here",
									color: "aqua",
									clickEvent: {
										action: "run_command",
										value: "/next"
									}
								},
								' to play again!'
							]
						}),
						position: 1
					});
				}
			}
		});
		ClientSocket.on('CPacketTitle', packet => {
			client.write('title', {
				action: 2,
				fadeIn: 6,
				stay: Math.floor(packet.duration / 50),
				fadeOut: 6
			});
			client.write('title', {
				action: 0,
				text: JSON.stringify({ text: translateText(packet.title) })
			});
		});
		// ClientSocket.on("CPacketLocalStorage", packet => {
		// 	const action = packet.action;
		// 	const act = CPacketLocalStorage_Action[action];
		// 	console.log(`local storage: ${act} ${packet.key}${packet.value ? `${packet.value}` : ""}`);
		// 	switch (packet.action) {
		// 		case CPacketLocalStorage_Action.SET:
		// 			fakeLocalStorage[packet.key] = packet.value;
		// 			break;

		// 		case CPacketLocalStorage_Action.REMOVE:
		// 			delete fakeLocalStorage[packet.key];

		// 		case CPacketLocalStorage_Action.DEFAULT:
		// 			console.info("don't know how to handle 'default' local storage actions")
		// 			break;
		// 	}
		// });
		ClientSocket.on('CPacketTabComplete', packet => client.write('tab_complete', { matches: packet.matches }));
	}
	minecraft(mcClient) {
		client = mcClient;
		client.on('chat', async packet => {
			/**
			 * @type {string}
			 */
			const msg: string = packet.message;
			if (msg.startsWith("/")) {
				const parts = msg.split(" ");
				const cmd = parts.shift().substring(1);
				const handled = await handleCommand(cmd, ...parts);
				if (handled) return;
			}
			ClientSocket.sendPacket(new SPacketMessage({ text: msg }));
		});
		client.on('tab_complete', packet => {
			if ((packet.text.startsWith('/queue') || packet.text.startsWith('/play')) && packet.text.indexOf(' ') != -1) {
				const split = packet.text.split(' ')[1].toLocaleLowerCase();
				client.write('tab_complete', {
					matches: [
						'skywars', 'eggwars',
						'spleef', 'survival', 'creative',
						'duels_bridge', 'blockhunt',
						'parkour', 'oitq',
						'kitpvp', 'blitzbuild', 'murder',
						'pvp'
					].filter((str) => str.substring(0, split.length) == split)
				});
				return;
			}
			ClientSocket.sendPacket(new SPacketTabComplete$1({ message: packet.text }));
		});
	}
	override cleanup(requeue = false) {
		client = requeue ? client : undefined;
	}
	override obtainHandlers(handlers: typeof import("../init.js"), connectFunction: (client: ServerClient, requeue?: boolean, gamemode?: string, code?: string) => Promise<void>) {
		connect = connectFunction;
		entity = handlers.entity;
		world = handlers.world;
		gui = handlers.gui;
	}
};

export default MiscHandler.INSTANCE;
