const Command = require("../modules/commands/command");

const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

module.exports = class SuggestCommand extends Command {
	constructor(client) {
		super(client, {
			name: "suggest",
			description: "Suggest any additions, removals, or changes",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			public_only: true,
			options: [
				{
					name: "type",
					description: "The type of suggestion you'd like to create",
					required: true,
					type: Command.option_types.STRING,
					choices: [
						{
							name: "QA Utility Bot Feedback",
							value: "bot"
						}
					]
				}
			]
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		let type = interaction.options.getString("type");
		let customID;

		// Configuring the properties to meet the suggestion type
		switch (type) {
			case "bot":
				type = "QA Utility Bot Feedback";
				customID = "bot_suggestion";
				break;
		}

		const textInput = new TextInputBuilder()
			.setCustomId("suggestion")
			.setLabel("What is your suggestion?")
			.setStyle(TextInputStyle.Paragraph)
			.setMinLength(8)
			.setMaxLength(1024)
			.setRequired(true)
			.setPlaceholder("Enter your suggestion...")
			.setValue("");

		const actionRow = new ActionRowBuilder().addComponents(textInput);
		const modal = new ModalBuilder().setCustomId(customID).setTitle(type).addComponents(actionRow);

		interaction.showModal(modal);
	}
};
