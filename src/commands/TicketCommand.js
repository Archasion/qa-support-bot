/* eslint-disable no-case-declarations */
const Command = require("../modules/commands/command");
const Tickets = require("../mongodb/models/tickets");

const { EmbedBuilder, MessageAttachment, ChannelType } = require("discord.js");
const { TICKET_LOGS } = process.env;

let amount = 1;

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
					options: [
						{
							description: "The new ticket topic",
							name: "new_topic",
							required: true,
							type: Command.option_types.STRING
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

					// Get the ticket count
					amount = (await Tickets.countDocuments()) + 1;
				}

				const ticketTopic = interaction.options.getString("topic").format();
				const ticketParent = interaction.guild.channels.cache.get(config.channels.tickets);

				// Create the ticket
				const createTicket = await ticketParent.threads.create({
					name: `Ticket ${amount}`,
					autoArchiveDuration: 10080, // 7 Days
					type: ChannelType.PrivateThread,
					invitable: false,
					reason: `New ticket: ${ticketTopic}`
				});

				// Send the confirmation message
				interaction.reply({
					content: `Your ticket has been created: <#${createTicket.id}> (\`${createTicket.name}\`)`,
					ephemeral: true
				});

				const embed = new EmbedBuilder()

					.setColor(config.colors.default)
					.setTitle(`Hello ${interaction.member.displayName}!`)
					.setDescription(
						"Thank you for creating a ticket. A member of staff will soon be available to assist you. Please make sure you **read** the <#928087044671045652> and the <#928088826591719444> channels to see if they answer your question."
					)
					.addFields({ name: "Topic", value: ticketTopic });

				// Send the opening message
				const openingMessage = await createTicket.send({
					content: `<@&${config.roles.manager}> <@&${config.roles.moderator}> ${interaction.member}`,
					embeds: [embed]
				});

				// Store the ticket information in the database
				await Tickets.create({
					count: amount,
					thread: createTicket.id,
					author: interaction.user.id,
					topic: ticketTopic,
					first_message: openingMessage.id,
					active: true
				});

				const logCreateTicket = new EmbedBuilder()

					.setColor(config.colors.success)
					.setAuthor({
						name: `${interaction.user.tag} (${interaction.member.displayName})`,
						iconURL: interaction.user.displayAvatarURL({ dynamic: true })
					})
					.setDescription(
						`Created a new ticket: <#${createTicket.id}> (\`${createTicket.name}\`)`
					)
					.addFields({ name: "Topic", value: `\`\`\`${ticketTopic}\`\`\`` })
					.setFooter({ text: `ID: ${interaction.user.id}` })
					.setTimestamp();

				// Log the action
				interaction.guild.channels.cache.get(TICKET_LOGS).send({
					embeds: [logCreateTicket]
				});
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
				// Get the ticket
				const ticket = await Tickets.findOne({
					author: interaction.user.id,
					active: true
				});

				// Check if the ticket exists
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

				const oldTopic = message.embeds[0].fields[0].value;

				// Update the message embed
				message.embeds[0].fields[0].value = info;
				message.edit({ content: message.content, embeds: message.embeds });

				const logging_embed = new EmbedBuilder()

					.setColor(config.colors.change_topic)
					.setAuthor({
						name: `${interaction.user.tag} (${interaction.member.displayName})`,
						iconURL: interaction.user.displayAvatarURL({ dynamic: true })
					})
					.setDescription(
						`Changed the topic of a ticket: <#${ticket.thread}> (\`${thread.name}\`)`
					)
					.addFields(
						{ name: "Old Topic", value: `\`\`\`${oldTopic}\`\`\`` },
						{ name: "New Topic", value: `\`\`\`${info}\`\`\`` }
					)
					.setFooter({ text: `ID: ${interaction.user.id}` })
					.setTimestamp();

				// Log the action
				interaction.guild.channels.cache.get(TICKET_LOGS).send({
					embeds: [logging_embed]
				});

				// Update database
				await Tickets.updateOne({ _id: ticket._id }, { $set: { topic: info } });

				// Send the confirmation message
				interaction.reply({
					content: `Set the topic of <#${ticket.thread}> to:\n\`\`\`${info}\`\`\``,
					ephemeral: true
				});
		}
	}
};
