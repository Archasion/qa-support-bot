const { MessageEmbed } = require("discord.js");
const Command = require("../modules/commands/command");

module.exports = class TopicCommand extends Command {
	constructor(client) {
		super(client, {
			name: "change-topic",
			description: "Change the topic of the ticket",
			permissions: [],
			manager_only: false,
			moderator_only: false,
			dev_only: false,
			options: [
				{
					description: "The new topic of the ticket",
					name: "new_topic",
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
		const ticket = await db.models.Ticket.findOne({
			where: { id: interaction.channel.id }
		});

		const opening_message = await interaction.channel.messages.fetch(ticket.opening_message);
		const member = await interaction.guild.members.fetch(ticket.creator);
		const topic = interaction.options.getString("new_topic");

		if (!ticket) {
			return interaction.reply({
				embeds: [
					new MessageEmbed()
						.setColor(config.colors.error_color)
						.setTitle("This isn't a ticket channel")
						.setDescription(
							"Please use this command in the ticket channel you want to change the topic of."
						)
						.setFooter({ text: config.text.footer, iconURL: interaction.guild.iconURL() })
				],
				ephemeral: true
			});
		}

		await ticket.update({
			topic: cryptr.encrypt(topic)
		});

		await interaction.channel.setTopic(`${member} | ${topic}`, {
			reason: "User updated ticket topic"
		});

		const ticket_channel = await db.models.Category.findOne({
			where: { id: ticket.category }
		});

		const description = ticket_channel.opening_message
			.replace(/{+\s?(user)?name\s?}+/gi, member.displayName)
			.replace(/{+\s?(tag|ping|mention)?\s?}+/gi, member.user.toString());

		await opening_message.edit({
			embeds: [
				new MessageEmbed()
					.setColor(config.colors.default_color)
					.setAuthor({
						name: member.user.username,
						iconURL: member.user.displayAvatarURL()
					})
					.setDescription(description)
					.addField("Topic", topic)
					.setFooter({ text: config.text.footer, iconURL: interaction.guild.iconURL() })
			],
			ephemeral: true
		});

		await interaction.reply({
			embeds: [
				new MessageEmbed()
					.setColor(config.colors.success_color)
					.setAuthor({
						name: interaction.user.username,
						iconURL: interaction.user.displayAvatarURL()
					})
					.setTitle("Topic changed")
					.setDescription("The topic of this ticket has been changed.")
					.setFooter({ text: config.text.footer, iconURL: interaction.guild.iconURL() })
			],
			ephemeral: true
		});

		action.changeTopic(interaction.guild, interaction.user, ticket, topic);
		log.info(`${interaction.user.tag} changed the topic of #${interaction.channel.name}`);
	}
};
