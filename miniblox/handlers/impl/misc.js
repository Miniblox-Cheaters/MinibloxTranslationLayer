import Handler from './../handler.js';
import { ClientSocket, SPacketMessage, SPacketTabComplete$1 } from './../../main.js';
import { translateText } from './../../utils.js';
import { writeFile } from 'node:fs';
let client, entity, connect, world, gui;

/**
 * @param {string} cmd the command name
 * @param {...string} args the arguments to the command
 * @returns {boolean} if the command should be passed on to miniblox or not.
 */
export function handleCommand(cmd, ...args) {
	switch (cmd) {
		case "queue":
		case "play":
			connect(client, true, msg.split(' ')[1]);
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
			connect(client, true, undefined, args.join(" "));
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
	}
	return false;
}

const self = class ChatHandler extends Handler {
	miniblox(gameType) {
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

export default new self();