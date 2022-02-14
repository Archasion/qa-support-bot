const Command = require("../modules/commands/command");
const Tickets = require("../mongodb/models/tickets");

const { MessageEmbed } = require("discord.js");
const { TICKET_LOGS } = process.env;

let amount = 1;

module.exports = class NewTicketCommand extends Command {
	constructor(client) {
		super(client, {
			name: "new-ticket",
			description: "Create a new ticket",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			// verified_only: true,
			nda_only: true,
			options: [
				{
					description: "The topic of the ticket",
					name: "topic",
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

		const info = interaction.options.getString("topic").format();
		const ticketParent = interaction.guild.channels.cache.get(config.channels.tickets);

		// Create the ticket
		const ticket = await ticketParent.threads.create({
			name: `Ticket ${amount}`,
			autoArchiveDuration: 10080, // 7 Days
			type: "GUILD_PRIVATE_THREAD",
			invitable: false,
			reason: `New ticket: ${info}`
		});

		// Send the confirmation message
		interaction.reply({
			content: `Your ticket has been created: <#${ticket.id}> (\`${ticket.name}\`)`,
			ephemeral: true
		});

		const embed = new MessageEmbed()

			.setColor(config.colors.default_color)
			.setTitle(`Hello ${interaction.member.displayName}!`)
			.setDescription(
				"Thank you for creating a ticket. A member of staff will soon be available to assist you. Please make sure you **read** the <#922957941395570748> and the <#922957941395570748> channels to see if they answer your question."
			)
			.addField("Topic", info);

		// Send the opening message
		const message = await ticket.send({
			content: `<@&${config.roles.manager}> <@&${config.roles.moderator}> ${interaction.member}`,
			embeds: [embed]
		});

		// Store the ticket information in the database
		await Tickets.create({
			count: amount,
			thread: ticket.id,
			author: interaction.user.id,
			topic: info,
			first_message: message.id,
			active: true
		});

		const loggingEmbed = new MessageEmbed()

			.setColor(config.colors.default_color)
			.setAuthor({
				name: `${interaction.user.tag} (${interaction.member.displayName})`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setDescription(`Created a new ticket: <#${ticket.id}> (\`${ticket.name}\`)`)
			.addField("Topic", `\`\`\`${info}\`\`\``)
			.setFooter({ text: `ID: ${interaction.user.id}` })
			.setTimestamp();

		// Log the action
		interaction.guild.channels.cache.get(TICKET_LOGS).send({
			embeds: [loggingEmbed]
		});
	}
};
