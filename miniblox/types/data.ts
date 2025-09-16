import VERSION from "./version.ts";
import mcData from "minecraft-data";
import chunk, { type PCChunk as C } from "prismarine-chunk";

export const DATA = mcData(VERSION);
export const Chunk = (chunk as unknown as (ver: string) => typeof C)(
	VERSION,
) as typeof C;

export const neq2 = DATA.isNewerOrEqualTo;
export const v1_13 = neq2("1.13");
export const v1_14 = neq2("1.14");
export const v1_16 = neq2("1.16");
export const v1_17 = neq2("1.17");
export const v1_18 = neq2("1.18");
