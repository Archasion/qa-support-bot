const Command = require("../modules/commands/command");
const Tickets = require("../mongodb/models/tickets");

const { MessageEmbed, MessageAttachment } = require("discord.js");
const { TICKET_LOGS } = process.env;

module.exports = class NewTicketCommand extends Command {
	constructor(client) {
		super(client, {
			name: "close-ticket",
			description: "Close a ticket",
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
					description: "The ticket number",
					name: "ticket",
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
		const number = interaction.options.getString("ticket");

		// Check if the input is a number
		if (isNaN(number)) {
			interaction.reply({
				content: "The ticket number must be a number",
				ephemeral: true
			});
			return;
		}

		// Get the ticket
		const ticket = await Tickets.findOne({
			count: number,
			active: true
		});

		// Check if the ticket exists
		if (!ticket) {
			interaction.reply({
				content: `Ticket ${number} does not exist`,
				ephemeral: true
			});
			return;
		}

		// Log the action
		const thread = interaction.guild.channels.cache
			.get(config.channels.tickets)
			.threads.cache.get(ticket.thread);

		const loggingEmbed = new MessageEmbed()

			.setColor(config.colors.close_ticket)
			.setAuthor({
				name: `${interaction.user.tag} (${interaction.member.displayName})`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setDescription(`Closed a ticket: \`${thread.name}\``)
			.setFooter({ text: `ID: ${interaction.user.id}` })
			.setTimestamp();

		// Write message history
		let contentToLog = [];

		await thread.messages.cache
			.filter(message => !message.author.bot)
			.forEach(message => {
				const messageTimestamp = new Date(message.createdAt);
				const messageToLog = []; // String builder

				messageToLog.push(
					`[${messageTimestamp.getHours()}:${messageTimestamp.getMinutes()}:${messageTimestamp.getSeconds()}]`
				);
				messageToLog.push(`(${message.author.tag} — ${message.author.id}):`);
				messageToLog.push(message.content);
				contentToLog.push(messageToLog.join(" "));
			});

		if (contentToLog[0]) {
			// Create .txt file
			contentToLog = [
				new MessageAttachment(
					Buffer.from(contentToLog.join("\n"), "utf8"),
					`ticket-${number}-history.txt`
				)
			];
		}

		// Log the action
		await interaction.guild.channels.cache.get(TICKET_LOGS).send({
			embeds: [loggingEmbed],
			files: contentToLog
		});

		// Close the ticket thread
		thread.delete({ reason: "Closed by a moderator" });

		// Update database
		await Tickets.updateOne({ _id: ticket._id }, { $set: { active: false } });

		// Send the confirmation message
		interaction.reply({
			content: `Ticket ${number} has been closed`,
			ephemeral: true
		});
	}
};
