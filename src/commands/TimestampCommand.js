const Command = require("../modules/commands/command");

module.exports = class TimestampCommand extends Command {
	constructor(client) {
		super(client, {
			name: "timestamp",
			description: "Creates a timestamp.",
			permissions: [],
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
				"Feel free to use website to build timestamps:\nhttps://archasion.github.io/Discord-Timestamp-Builder/",
			ephemeral: true
		});
	}
};
