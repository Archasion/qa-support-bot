const Command = require("../modules/commands/command");

module.exports = class RebootCommand extends Command {
	constructor(client) {
		super(client, {
			name: "reboot",
			description: "Reboots the client",
			permissions: [],
			staff_only: false,
			dev_only: true,
			internal: true,
			options: []
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		log.info("Rebooting...");

		await interaction
			.reply({
				content: "Rebooting...",
				ephemeral: true
			})
			.then(() => this.client.destroy())
			.then(() => this.client.login(process.env.DISCORD_TOKEN))
			.then(() => log.info("Rebooted Successfully!"))
			.then(() => {
				interaction.editReply({
					content: "Rebooted Successfully!",
					ephemeral: true
				});
			});
	}
};
