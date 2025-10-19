export default class API {
	/** @type {string} */
	auth;
	friends = new FriendsAPI(this.auth);
	/** @param {string} auth */
	constructor(auth) {
		this.auth = auth;
	}
}

export class APIError extends Error {
	/** @type {string} */
	apiType;

	/**
	 * @param {string | undefined} message
	 * @param {ErrorOptions | undefined} options
	 * @param {string} apiType
	*/
	constructor(message, options, apiType) {
		super(message, options);
	}

	/** @param {string | undefined} message @param {string} apiType */
	constructor(message, apiType) {
		super(message);
		this.apiType = apiType;
	}
}

/**
@typedef {
{
	friendId: number,
	username: string,
	rank: string | null
}
} FriendData
*/

/**
@typedef {{
	active: FriendData[],
	out: FriendData[],
	in: FriendData[]
}} FriendsStatus 
*/

export class FriendsAPI {
	/** @type {string} */
	auth;
	/** @param {string} auth */
	constructor(auth) {
		this.auth = auth;
	}
	/**
	 * wrapper around fetch that adds authorization header
	 * @param {string | URL | Request} input
	 * @param {RequestInit | undefined} init
	*/
	async #fetch(input, init) {
		const init = init ?? {
			headers: {
				authorization: this.auth
			}
		};

		init?.headers.authorization = this.auth;

		return await fetch(input, init);
	}
	/**
	 * @param {string} name
	 * */
	async add(name) {
		const res = await this.#fetch("https://session.coolmathblox.ca/friends/add", {
			"headers": {
				accept: "application/json, text/plain, */*",
				"accept-language": "en-US,en;q=0.9",
				"cache-control": "no-cache",
				"content-type": "application/json",
				pragma: "no-cache",
				priority: "u=1, i",
				"sec-ch-ua": "\"Not=A?Brand\";v=\"24\", \"Chromium\";v=\"140\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"Linux\"",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "cross-site",
				Referer: "https://miniblox.io/"
			},
			"body": JSON.stringify({
				target: name
			}),
			"method": "POST"
		});
		/** @type {{success: true, message: null} | {success: false, message: string}} */
		const d = await res.json();

		const { success, message } = d;

		if (!res.ok || !success) {
			throw new APIError(`Add friend request failed: ${message}`,
				{ cause: res },
				"Friends"
			);
		}
	}

	/** @param {string} target */
	async search(target) {
		const r = await this.#fetch("https://session.coolmathblox.ca/friends/search", {
			"headers": {
				"accept": "application/json, text/plain, */*",
				"accept-language": "en-US,en;q=0.9",
				"cache-control": "no-cache",
				"content-type": "application/json",
				"pragma": "no-cache",
				"priority": "u=1, i",
				"sec-ch-ua": "\"Not=A?Brand\";v=\"24\", \"Chromium\";v=\"140\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"Linux\"",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "cross-site",
				"Referer": "https://miniblox.io/"
			},
			"body": JSON.stringify({
				target
			}),
			"method": "POST"
		});

		if (!r.ok) {
			throw new APIError("search friends API result not OK", {
				cause: r
			}, "Friends");
		}

		/** @type {string[]} */
		const results = await r.json().then(d => d.results);

		return results;
	}

	async status() {
		/** @type {FriendsStatus} */
		const res = await this.#fetch("https://session.coolmathblox.ca/friends/status", {
			"headers": {
				accept: "application/json, text/plain, */*",
				"accept-language": "en-US,en;q=0.9",
				"cache-control": "no-cache",
				"content-type": "application/json",
				pragma: "no-cache",
				priority: "u=1, i",
				"sec-ch-ua": "\"Not=A?Brand\";v=\"24\", \"Chromium\";v=\"140\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"Linux\"",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "cross-site",
				"Referer": "https://miniblox.io/"
			},
			"body": "{}",
			"method": "POST"
		}).then(r => r.json());

		return res;
	}
}