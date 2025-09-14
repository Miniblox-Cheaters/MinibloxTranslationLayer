// deno-lint-ignore-file no-unused-vars
class Handler {
	constructor() { this.cleanup(); }
	miniblox() {}
	/**
	 * @param {import("minecraft-protocol").ServerClient} client 
	 */
	minecraft(client) {}
	cleanup() {}
	/**
	 * 
	 * @param {import("./init.js")} handler 
	 */
	obtainHandlers(handler, connectFunction) {}
}

export default Handler;