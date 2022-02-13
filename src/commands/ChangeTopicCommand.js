const Command = require("../modules/commands/command");
const Tickets = require("../mongodb/models/tickets");

const { MessageEmbed } = require("discord.js");
const { TICKET_LOGS } = process.env;

module.exports = class NewTicketCommand extends Command {
	constructor(client) {
		super(client, {
			name: "change-ticket-topic",
			description: "Change the topic of a ticket",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			manager_only: true,
			moderator_only: true,
			options: [
				{
					description: "The new ticket topic",
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
		const ticket = await Tickets.findOne({
			author: interaction.user.id,
			active: true
		});

		if (!ticket) {
			interaction.reply({
				content: "You do not have any active tickets",
				ephemeral: true
			});
			return;
		}

		const info = interaction.options.getString("new_topic").format();

		// Check if the topic is the same
		if (ticket.topic === info) {
			interaction.reply({
				content: "The topic is already set to this",
				ephemeral: true
			});
			return;
		}

		const thread = await interaction.guild.channels.cache
			.get(config.channels.tickets)
			.threads.cache.get(ticket.thread);

		// Update first message
		let message;
		try {
			message = await thread.messages.fetch(ticket.first_message);
		} catch {
			interaction.reply({
				content: "The original message with the topic could not be edited",
				ephemeral: true
			});
			return;
		}

		const old_topic = message.embeds[0].fields[0].value;

		message.embeds[0].fields[0].value = info;
		message.edit({ content: message.content, embeds: message.embeds });

		// Logging
		const logging_embed = new MessageEmbed()

			.setColor(config.colors.change_topic)
			.setAuthor({
				name: `${interaction.user.tag} (${interaction.member.displayName})`,
				iconURL: interaction.user.displayAvatarURL()
			})
			.setDescription(`Changed the topic of a ticket: <#${ticket.thread}> (\`${thread.name}\`)`)
			.addField("Old Topic", `\`\`\`${old_topic}\`\`\``)
			.addField("New Topic", `\`\`\`${info}\`\`\``)
			.setFooter({ text: `ID: ${interaction.user.id}` })
			.setTimestamp();

		interaction.guild.channels.cache.get(TICKET_LOGS).send({
			embeds: [logging_embed]
		});

		// Update database
		await Tickets.updateOne({ _id: ticket._id }, { $set: { topic: info } });

		interaction.reply({
			content: `Set the topic of <#${ticket.thread}> to:\n\`\`\`${info}\`\`\``,
			ephemeral: true
		});
	}
};
