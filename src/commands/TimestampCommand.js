const Command = require("../modules/commands/command");

module.exports = class TimestampCommand extends Command {
	constructor(client) {
		super(client, {
			name: "timestamp",
			description: "Links to a website that builds timestamps.",
			permissions: [],
			public_only: true,
			ignored: {
				roles: [],
				channels: [],
				threads: []
			}
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		interaction.reply({
			content:
				"Feel free to use this website to build timestamps (no mobile support):\nhttps://archasion.github.io/Discord-Timestamp-Builder/",
			ephemeral: true
		});
	}
};
