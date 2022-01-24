const Command = require("../modules/commands/command");

const { MessageActionRow, MessageSelectMenu } = require("discord.js");

module.exports = class EmbedCommand extends Command {
	constructor(client) {
		super(client, {
			name: "embed",
			description: "Build a customized embed",
			permissions: [],
			manager_only: true,
			moderator_only: true,
			nda_only: false,
			dev_only: true,
			options: [
				{
					name: "channel",
					description:
						"The channel to send the embed in, if not specified default will be the current channel",
					required: false,
					type: Command.option_types.CHANNEL,
				},
			],
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		const row = new MessageActionRow().addComponents(
			new MessageSelectMenu()
				.setCustomId("embed.creator")
				.setPlaceholder("Choose how you want to style the embed")
				.setMinValues(1)
				.addOptions([
					{
						label: "Add title",
						value: "title",
						description: "Add a title to the embed.",
					},
					{
						label: "Add description",
						value: "description",
						description: "Add a description to the embed.",
					},
					{
						label: "(TODO) Add message content",
						value: "content",
						description:
							"This is the raw message content; not sent within the embed.",
					},
					{
						label: "Add color",
						value: "color",
						description:
							"A color shown on the left-side of the embed.",
					},
				])
		);

		await interaction.reply({
			content:
				"Select every styling option that you want the embed to have.",
			components: [row],
			ephemeral: true,
		});
	}
};
