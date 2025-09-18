import type { Buffer } from "@std/io";

/**
 * Reads a VarInt from a Deno Buffer.
 * @param buffer The Deno Buffer to read from.
 * @param offset The starting offset in the buffer.
 * @returns An object containing the read value and the end offset.
 */
export function readVarInt(
	buffer: Buffer,
	offset: number = 0,
): { value: number; end: number } {
	let value = 0;
	let length = 0;
	let currentByte: number | undefined;

	while (true) {
		currentByte = buffer.bytes()[offset + length];
		if (currentByte === undefined) {
			throw new Error("Unexpected end of buffer while reading VarInt.");
		}
		value |= (currentByte & 0x7F) << (length * 7);
		length += 1;
		if (length > 5) {
			throw new Error("VarInt exceeds allowed bounds.");
		}
		if ((currentByte & 0x80) !== 0x80) {
			break;
		}
	}
	return { value, end: offset + length };
}

/**
 * Writes a VarInt to a Deno Buffer.
 * @param buffer The Deno Buffer to write to.
 * @param offset The starting offset in the buffer.
 * @param value The value to write as a VarInt.
 * @returns The new offset after writing the VarInt.
 */
export function writeVarInt(
	buffer: Buffer,
	offset: number,
	value: number,
): number {
	const bytes = new Uint8Array(5);
	let index = 0;

	while ((value & 0xFFFFFF80) !== 0) {
		bytes[index++] = (value & 0x7F) | 0x80;
		value >>>= 7;
	}
	bytes[index++] = value & 0x7F;

	buffer.writeSync(bytes.subarray(0, index));
	return offset + index;
}

/**
 * Reads a string from a Deno Buffer, prefixed with a VarInt length.
 * @param buffer The Deno Buffer to read from.
 * @param offset The starting offset in the buffer.
 * @returns An object containing the read string and the end offset.
 */
export function readString(
	buffer: Buffer,
	offset: number = 0,
): { value: string; end: number } {
	const { value: len, end: varIntEnd } = readVarInt(buffer, offset);
	const stringBytes = buffer.bytes().subarray(varIntEnd, varIntEnd + len);
	if (stringBytes.length < len) {
		throw new Error("Buffer too short to read string.");
	}
	const value = new TextDecoder().decode(stringBytes);
	return { value, end: varIntEnd + len };
}

/**
 * Writes a string to a Deno Buffer, prefixed with a VarInt length.
 * @param buffer The Deno Buffer to write to.
 * @param offset The starting offset in the buffer.
 * @param string The string to write.
 * @returns The new offset after writing the string.
 */
export function writeString(
	buffer: Buffer,
	offset: number,
	string: string,
): number {
	const stringBytes = new TextEncoder().encode(string);

	if (stringBytes.length > 32767) {
		throw new Error(
			`String too big (was ${stringBytes.length} bytes encoded, max 32767)`,
		);
	}

	offset = writeVarInt(buffer, offset, stringBytes.length);
	buffer.writeSync(stringBytes);
	return offset + stringBytes.length;
}
