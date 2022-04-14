const Command = require("../modules/commands/command");
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");

module.exports = class TicketEmbedCommand extends Command {
	constructor(client) {
		super(client, {
			name: "ticket-embed",
			description: "Send the ticket creation tutorial embed",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			dev_only: true,
			options: []
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		const ticketChannel = interaction.guild.channels.cache.get("942902391588675605"); // #create-a-ticket

		const helpfulChannels = [
			"928088826591719444", // #info
			"928093660384493638", // #request
			"928087044671045652" // #rules
		];

		// prettier-ignore
		const embed = new EmbedBuilder()

			.setColor(config.colors.default)
			.setDescription("Please read the following before creating a ticket")
			.setThumbnail(this.client.user.displayAvatarURL({ dynamic: true }))
			.setFields(
				{
					name: "We're not Roblox Support",
					value: "We cannot help you with any issues or reports related to Roblox, please contact Roblox Support instead"
				},
				{
					name: "Read the FAQ",
					value: `Please read the content of the following channels before creating a ticket; the information there may answer your question(s): <#${helpfulChannels.join("> <#")}>`
				},
				{
					name: "Still need support?",
					value: "If you have read everything above and you still need support, you can create a new ticket by clicking the button below or using the following command:\n\n`/ticket create (a brief description of your issue)`"
				}
			);

		const button = new ButtonBuilder({})

			.setCustomId("prompt_ticket_create")
			.setLabel("Create a Ticket")
			.setStyle(ButtonStyle.Secondary);

		const actionRow = new ActionRowBuilder().addComponents(button);

		ticketChannel.send({
			embeds: [embed],
			components: [actionRow]
		});

		interaction.reply({
			content: "The ticket creation embed has been sent!",
			ephemeral: true
		});
	}
};
