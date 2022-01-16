const Command = require("../modules/commands/command");

module.exports = class ShutdownCommand extends Command {
	constructor(client) {
		super(client, {
			name: "shutdown",
			description: "Shuts down the client",
			permissions: [],
			manager_only: false,
			moderator_only: false,
			dev_only: true,
			options: []
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		log.info("Shutting Down...");

		// prettier-ignore
		await interaction.reply({
			content: "Shutting down...",
			ephemeral: true
		})
			.then(() => process.exit());
	}
};
