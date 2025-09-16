export interface Vector3 {
	x: number;
	y: number;
	z: number;
}

export const DEG2RAD = Math.PI / 180, RAD2DEG = 180 / Math.PI;

/**
 * @param {number} ang angle to convert
 * @param {boolean} ignore don't limit the angle value
 * @param {number} num thing
 * @returns converted angle
 */
export function convertAngle(ang: number, ignore: boolean, num: number = 0) {
	let angle = ang;
	if (!ignore) angle = angle / 256 * Math.PI * 2;
	angle = (((angle * -1) * RAD2DEG) - (num != undefined ? num : 0)) * 256 / 360;
	return convertToByte(angle);
}

/**
 * @param {number} byte
 * @returns {number} clamped
 */
export function clampByte(byte: number): number {
	return Math.min(Math.max(byte, -128), 127);
}

export function clampToBox(pos: Vector3, box: Vector3) {
	const convertedBox = convertServerPos(box);
	return {
		x: Math.min(Math.max(pos.x, convertedBox.x - 0.4), convertedBox.x + 0.4),
		y: Math.min(
			Math.max(pos.y + 1.62, convertedBox.y - 0.1),
			convertedBox.y + 1.9,
		),
		z: Math.min(Math.max(pos.z, convertedBox.z - 0.4), convertedBox.z + 0.4),
	};
}

/**
 * @param {number} num to convert to byte
 * @returns {number} {@link num} converted to a byte
 */
export function convertToByte(num: number): number {
	let converted = num & 0xFF;
	converted = converted > 127 ? converted - 256 : converted;
	return converted;
}

/**
 * @param {Vector3} pos
 * @returns {Vector3}
 */
export function convertServerPos(pos: Vector3): Vector3 {
	return { x: pos.x / 32, y: pos.y / 32, z: pos.z / 32 };
}
