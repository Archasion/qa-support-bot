/**
 * A command
 */
module.exports = class Command {
	/**
	 *
	 * @typedef CommandOption
	 * @property {string} name - The option's name
	 * @property {number} type - The option's type (use `Command.option_types`)
	 * @property {string} description - The option's description
	 * @property {CommandOption[]} [options] - The option's options
	 * @property {(string|number)[]} [choices] - The option's choices
	 * @property {boolean} [required] - Is this arg required? Defaults to `false`
	 */
	/**
	 * Create a new Command
	 * @param {import('../../').Bot} client - The Discord Client
	 * @param {Object} data - Command data
	 * @param {string} data.name - The name of the command (3-32)
	 * @param {string} data.description - The description of the command (1-100)
	 * @param {boolean} [data.manager_only] - Only allow managers+ to use this command?
	 * @param {boolean} [data.moderator_only] - Only allow moderators to use this command?
	 * @param {boolean} [data.nda_only] - Only allow NDA Testers to use this command?
	 * @param {boolean} [data.dev_only] - Only allow developers to use this command?
	 * @param {string[]} [data.permissions] - Array of permissions needed for a user to use this command
	 * @param {number} [data.cooldown] - The wait period (in seconds) to run the command again
	 * @param {CommandOption[]} [data.options] - The command's options
	 */
	constructor(client, data) {
		/** The Discord Client */
		this.client = client;

		/** The CommandManager */
		this.manager = this.client.commands;

		if (typeof data !== "object") {
			throw new TypeError(`Expected type of command "data" to be an object, got "${typeof data}"`);
		}

		/**
		 * The name of the command
		 * @type {string}
		 */
		this.name = data.name;

		/**
		 * The command description
		 * @type {string}
		 */
		this.description = data.description;

		/**
		 * Only allow moderators to use this command?
		 * @type {boolean}
		 * @default false
		 */
		this.moderator_only = data.moderator_only === true;

		/**
		 * Only allow NDA Testers to use this command?
		 * @type {boolean}
		 * @default false
		 */
		this.nda_only = data.nda_only === true;

		/**
		 * Only allow managers+ to use this command?
		 * @type {boolean}
		 * @default false
		 */
		this.manager_only = data.manager_only === true;

		/**
		 * Only allow developers to use this command?
		 * @type {boolean}
		 * @default false
		 */
		this.dev_only = data.dev_only === true;

		/**
		 * Array of permissions needed for a user to use this command
		 * @type {string[]}
		 */
		this.permissions = data.permissions ?? [];

		/**
		 * The wait period (in seconds) to run the command again
		 * @type {number}
		 */
		this.cooldown = data.cooldown;

		/**
		 * The command options
		 * @type {CommandOption[]}
		 */
		this.options = data.options ?? [];

		try {
			this.manager.register(this); // Register the command
		} catch (error) {
			log.error(error);
			return;
		}
	}

	async build(guild) {
		return {
			defaultPermission: !this.moderator_only,
			description: this.description,
			name: this.name,
			options: typeof this.options === "function" ? await this.options(guild) : this.options
		};
	}

	static get option_types() {
		return {
			SUB_COMMAND: 1,
			SUB_COMMAND_GROUP: 2,
			STRING: 3,
			INTEGER: 4,
			BOOLEAN: 5,
			USER: 6,
			CHANNEL: 7,
			ROLE: 8,
			MENTIONABLE: 9,
			NUMBER: 10
		};
	}
};
