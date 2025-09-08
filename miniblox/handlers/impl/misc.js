import Handler from './../handler.js';
import { ClientSocket, SPacketMessage, SPacketTabComplete$1, CPacketServerInfo, PlayerPermissionEntry } from './../../main.js';
import { translateText } from './../../utils.js';
import { writeFile } from 'node:fs';
let client, entity, connect, world, gui;

/**
 * Matches a server ID (e.g. https://miniblox.io/?join=JOINCODEHERE)
 */
const JOIN_CODE = /(?:https?:\/\/^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,6}\/?join=)?([A-Z]+)/;

/**
 * Matches a server ID
 */
const SERVER_ID = /(large|small|medium|planet)-[A-z|0-9]+-[A-z|0-9]+/;

class IllegalArgumentException extends Error { }

/**
 * Resolves a join code to a server ID,
 * it will return {@link code} if {@link code} is already a server ID.
 * @param {string} code the invite code or a server ID.
 * @return {Promise<string | null>} a server ID if the server resolved the invite code, otherwise `null`
 */
async function resolveServerID(code) {
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

/**
 * @param {boolean | null} b
 * @returns {string}
 */
function stringifyBoolean(b) {
	if (b === null)
		return "\u00a7cNOT SPECIFIED";

	return b ? "\u00a72yes" : "\u00a7cno";
}

/**
 * @param {string} cmd the command name
 * @param {...string} args the arguments to the command
 * @returns {boolean} if the command should be passed on to miniblox or not.
 */
export async function handleCommand(cmd, ...args) {
	switch (cmd) {
		case "q":
		case "queue":
		case "play":
			connect(client, true, args[0]);
			return true;
		case "login":
			writeFile('./login.token', args.join(" "), (err) => {
				if (err) {
					client.write('chat', {
						message: JSON.stringify({
							extra: [translateText('\\red\\Failed to save file!' + err.message)],
							text: ''
						}),
						position: 1
					});
					throw err;
				}

				client.write('chat', {
					message: JSON.stringify({
						extra: [translateText('\\green\\Successfully logged in! Rejoin the game.')],
						text: ''
					}),
					position: 1
				});
			});
			return true;
		case "join":
			const code = args.join(" ");
			try {
				const resolved = await resolveServerID(code) ?? code;
				connect(client, true, undefined, resolved);
			} catch (e) {

			}
			return true;
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
			return true;
		case "reloadchunks":
			world.chunks = [];
			world.queued = [];
			return true;
		case "desync":
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
			return true;
		case "planets":
			gui.showPlanetsGUI();
			return true;

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
		case "serverinfo":
			const {
				serverName, serverId,
				inviteCode, serverVersion,
				serverCategory, accessControl,
				worldType, cheats,
				commandBlocksEnabled, doDaylightCycle,
				metadata, playerPermissionEntries,
				pvpEnabled, startTime
			} = MiscHandler.serverInfo;
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
				"§2SERVER INFO:§r",
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
			return true;
	}
	return false;
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
		/** @type {boolean?} */
		doDaylightCycle: true,
		/** @type {string?} */
		inviteCode: "???",
		/** @type {boolean?} */
		cheats: false,
		/** @type {boolean?} */
		pvpEnabled: true,
		/** @type {BigInt} */
		startTime: -1n,
		/** @type {PlayerPermissionEntry[]} */
		playerPermissionEntries: [],
		/** @type {string?} */
		metadata: "???",
		/** @type {boolean?} */
		commandBlocksEnabled: false
	};
	/**
	 * @param {CPacketServerInfo} packet
	 */
	static setServerInfoData(packet) {
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
	miniblox(gameType) {
		ClientSocket.on('CPacketServerInfo', MiscHandler.setServerInfoData);
		ClientSocket.on('CPacketMessage', packet => {
			if (packet.text) {
				client.write('chat', {
					message: JSON.stringify({
						extra: [translateText(packet.text)],
						text: ''
					}),
					position: packet.id == undefined ? 1 : 0
				});

				if (packet.id == undefined && packet.text.includes('Summary')) {
					client.write('chat', {
						message: JSON.stringify({
							text: '',
							extra: [
								{
									text: 'Click here',
									color: 'aqua',
									clickEvent: {
										action: 'run_command',
										value: '/play ' + gameType
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
		ClientSocket.on('CPacketTabComplete', packet => client.write('tab_complete', { matches: packet.matches }));
	}
	minecraft(mcClient) {
		client = mcClient;
		client.on('chat', packet => {
			/**
			 * @type {string}
			 */
			const msg = packet.message;
			if (msg.startsWith("/")) {
				const parts = msg.split(" ");
				const cmd = parts.shift().substring(1);
				const handled = handleCommand(cmd, ...parts);
				if (!!handled) return;
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
	cleanup(requeue) {
		client = requeue ? client : undefined;
	}
	obtainHandlers(handlers, connectFunction) {
		connect = connectFunction;
		entity = handlers.entity;
		world = handlers.world;
		gui = handlers.gui;
	}
};

export default MiscHandler.INSTANCE;
