import { readString, writeString } from "../../buf_utils.ts";
import Handler from "../handler.ts";
import { ClientSocket, SPACKET_MAP } from "../../main.js";
import { ServerClient } from "minecraft-protocol";

let mcClient: ServerClient;

const S_PACKET_N2C = new Map(Object.entries(SPACKET_MAP));
// off by default since it seems to slow down stuff a lot
const SEND_RECV_PACKET_PAYLOAD = false;

// these (s2c packets) are blacklisted for one of the following reasons:
// - they are sent uselessly
// - you probably don't need them
// - they send too much data
// - or are handled well enough by the translation layer
const C_BLACKLIST = [
	"CPacketChunkData", // a lot of data
	"CPacketJoinGame", // why?
	"CPacketTabComplete",
	"CPacketSoundEffect",
	"CPacketBlockUpdate",
	// TODO: separate custom packet for this
	"CPacketPlayerReconciliation",
	"CPacketDisconnect",
	"CPacketPlayerPosLook",
	"CPacketSpawnPlayer",
	"CPacketEntityProperties",
	"CPacketWindowItems",
	"CPacketMessage",
	"CPacketUpdateStatus",
	"CPacketScoreboard",
	"CPacketPlayerList",
	"CPacketUpdateHealth",
	"CPacketEntityPositionAndRotation",
	"CPacketEntityRelativePositionAndRotation",
	"CPacketPong",
	"CPacketTimeUpdate",
	"CPacketSetExperience",
	"CPacketOpenShop",
	"CPacketEntityAction",
	"CPacketEntityMetadata",
];

/** @param {Buffer} buffer */
function parseSendPacketBuf(buffer: Buffer) {
	try {
		const { value: id, end: e } = readString(buffer);
		const { value: json } = readString(buffer, e);
		const data = JSON.parse(json);
		return { id, data };
	} catch (err) {
		console.error("Error parsing packet buffer:", err);
	}
}

export class PacketInterop extends Handler {
	/**
	 * 
	 * @param {string} pkt name of the packet
	 * @param {Message} body packet data
	 */
	static handleSocketPacket(pkt: string, body: Message) {
		if (C_BLACKLIST.includes(pkt))
			return;

		console.log(pkt);

		const j = JSON.stringify(body);
		const len = pkt.length + j.length;

		const data = Buffer.alloc(len);
		const off = writeString(data, 0, pkt);
		writeString(data, off, j);
		mcClient.write('custom_payload', {
			channel: 'layer:receive_packet',
			data
		});
	}
	override miniblox() {
		if (!SEND_RECV_PACKET_PAYLOAD) return;
		ClientSocket.socket?.onAny(PacketInterop.handleSocketPacket)
	}
	/** @param {import("minecraft-protocol").ServerClient} client */
	minecraft(client: import("minecraft-protocol").ServerClient) {
		mcClient = client;
		client.on('custom_payload', packet => {
			/** @type {string} */
			const channel: string = packet.channel;

			if (channel == 'layer:send_packet') {
				const _ = parseSendPacketBuf(packet.data);
				if (_ === undefined) return;
				const { id, data } = _;
				const pkt = S_PACKET_N2C.get(id);
				if (!pkt) {
					console.info("unknown packet:", id);
					return;
				}
				console.info(`Received packet from minecraft: ${id} -> `, pkt, "data:", data);
				ClientSocket.sendPacket(pkt.fromJson(data));
			}
		});
	}
}

export default new PacketInterop();
