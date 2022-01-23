const { MessageEmbed, MessageAttachment } = require("discord.js");
const Command = require("../modules/commands/command");

const file = new MessageAttachment(config.urls.avatar, config.images.avatar);

module.exports = class PanelCommand extends Command {
	constructor(client) {
		super(client, {
			name: "panel",
			description: "The ticket panel",
			permissions: [],
			manager_only: true,
			moderator_only: false,
			nda_only: false,
			dev_only: false,
			options: []
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		const description = `Please read the following before creating a ticket
		
		**We're not Roblox Support**
		We cannot help you with any issues or reports related to Roblox, please contact Roblox Support instead
		
		**Read the FAQ**
		Please read general and general since the information there may answer your question(s)
		
		**Still need support?**
		If you have read everything above and you still need support, you can create a new ticket by using the following command:
		
		\`/new-ticket (a brief description of your issue)\``;

		const panel_channel = await interaction.guild.channels.create("create-a-ticket", {
			position: 1,
			reason: `${interaction.user.tag} created a new panel`,
			type: "GUILD_TEXT",
			permissionOverwrites: [
				{
					allow: ["VIEW_CHANNEL", "READ_MESSAGE_HISTORY"],
					deny: ["SEND_MESSAGES", "ADD_REACTIONS"],
					id: interaction.guild.roles.everyone
				},
				{
					allow: ["SEND_MESSAGES", "EMBED_LINKS", "ADD_REACTIONS"],
					id: this.client.user.id
				}
			]
		});

		panel_channel.send({
			embeds: [
				new MessageEmbed()
					.setColor(config.colors.default_color)
					.setTitle("Create Ticket")
					.setDescription(description)
					.setThumbnail(`attachment://${config.images.avatar}`)
					.setFooter({ text: config.text.footer, iconURL: interaction.guild.iconURL() })
			],
			files: [file]
		});

		await interaction.reply({
			content: panel_channel.toString(),
			ephemeral: true
		});
	}
};
