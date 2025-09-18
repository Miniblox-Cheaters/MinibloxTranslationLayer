import type { ServerClient } from "minecraft-protocol";

// deno-lint-ignore-file no-unused-vars
abstract class Handler {
	miniblox(gameType: string): void {}
	abstract minecraft(client: ServerClient): void;
	cleanup(requeue?: boolean): void {};
	obtainHandlers(handler: typeof import("./init.js"), connectFunction: unknown) {}
	constructor() {
		this.cleanup();
	}
}

export default Handler;