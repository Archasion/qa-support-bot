const Command = require("../modules/commands/command");

module.exports = class MessageCommand extends Command {
	constructor(client) {
		super(client, {
			name: "message",
			description: "Send a message as the bot",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			manager_only: true,
			dev_only: true,
			options: [
				{
					name: "text",
					description: "The content of the message",
					required: true,
					type: Command.option_types.STRING
				}
			]
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		const text = interaction.options.getString("text").format();

		// Send the confirmation message
		await interaction.reply({
			content: "The message has been sent",
			ephemeral: true
		});

		// Send the message
		await interaction.channel.send({ content: text });
	}
};
