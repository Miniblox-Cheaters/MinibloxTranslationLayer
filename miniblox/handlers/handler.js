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
	 * @param {import("./init")} handler 
	 */
	obtainHandlers(handler) {}
}

export default Handler;