const Command = require("../modules/commands/command");
const Tickets = require("../mongodb/models/tickets");

const {
	EmbedBuilder,
	MessageAttachment,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	ModalBuilder
} = require("discord.js");

const { TICKET_LOGS } = process.env;

module.exports = class TicketCommand extends Command {
	constructor(client) {
		super(client, {
			name: "ticket",
			description: "Create a new ticket",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			public_only: true,
			options: [
				{
					description: "Create a new ticket",
					name: "create",
					type: Command.option_types.SUB_COMMAND,
					options: [
						{
							description: "The topic of the ticket",
							name: "topic",
							required: true,
							type: Command.option_types.STRING
						}
					]
				},
				{
					name: "close",
					description: "Close a ticket",
					type: Command.option_types.SUB_COMMAND,
					options: [
						{
							description: "The ticket number",
							name: "ticket",
							required: true,
							type: Command.option_types.STRING
						}
					]
				},
				{
					name: "topic",
					description: "Change the topic of a ticket",
					type: Command.option_types.SUB_COMMAND,
					options: []
				}
			]
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
			// ANCHOR Create ticket
			case "create":
				// Check if there are any tickets in the database
				if ((await Tickets.countDocuments()) !== 0) {
					const checkLimit = await Tickets.findOne({
						author: interaction.user.id,
						active: true
					});

					// Check if the user has an active ticket
					if (checkLimit) {
						interaction.reply({
							content: `You already have an active ticket: <#${checkLimit.thread}>`,
							ephemeral: true
						});
						return;
					}
				}

				const newTextInput = new TextInputBuilder()
					.setCustomId("topic")
					.setLabel("Briefly describe your issue/question")
					.setStyle(TextInputStyle.Paragraph)
					.setMinLength(8)
					.setMaxLength(1024)
					.setRequired(true)
					.setPlaceholder("Describe your issue/question...")
					.setValue("");

				const newActionRow = new ActionRowBuilder().addComponents(newTextInput);
				const newModal = new ModalBuilder()
					.setCustomId("create_ticket")
					.setTitle("Create a Support Ticket")
					.addComponents(newActionRow);

				interaction.showModal(newModal);
				break;

			// ANCHOR Close ticket
			case "close":
				if (!(await utils.isStaff(interaction.member))) {
					interaction.reply({
						content: "Only moderators+ are able to close tickets.",
						ephemeral: true
					});
					return;
				}

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
				const closeTicket = await Tickets.findOne({
					count: number,
					active: true
				});

				// Check if the ticket exists
				if (!closeTicket) {
					interaction.reply({
						content: `Ticket ${number} does not exist`,
						ephemeral: true
					});
					return;
				}

				// Log the action
				const ticketThread = interaction.guild.channels.cache
					.get(config.channels.tickets)
					.threads.cache.get(closeTicket.thread);

				const logCloseTicket = new EmbedBuilder()

					.setColor(0xf55f5f) // Red
					.setAuthor({
						name: `${interaction.user.tag} (${interaction.member.displayName})`,
						iconURL: interaction.user.displayAvatarURL({ dynamic: true })
					})
					.setDescription(`Closed a ticket: \`${ticketThread.name}\``)
					.setFooter({ text: `ID: ${interaction.user.id}` })
					.setTimestamp();

				// Write message history
				let contentToLog = [];

				await ticketThread.messages.cache
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
					embeds: [logCloseTicket],
					files: contentToLog
				});

				// Close the ticket thread
				ticketThread.delete({ reason: "Closed by a moderator" });

				// Update database
				await Tickets.updateOne({ _id: closeTicket._id }, { $set: { active: false } });

				// Send the confirmation message
				interaction.reply({
					content: `Ticket ${number} has been closed`,
					ephemeral: true
				});
				break;

			// ANCHOR Change ticket topic
			case "topic":
				const textInput = new TextInputBuilder()
					.setCustomId("new_topic")
					.setLabel("What is the new topic?")
					.setStyle(TextInputStyle.Paragraph)
					.setMinLength(8)
					.setMaxLength(1024)
					.setRequired(true)
					.setPlaceholder("Enter the new topic...")
					.setValue("");

				const actionRow = new ActionRowBuilder().addComponents(textInput);
				const modal = new ModalBuilder()
					.setCustomId("ticket_topic_change")
					.setTitle("Change your ticket's topic")
					.addComponents(actionRow);

				interaction.showModal(modal);
				break;
		}
	}
};
