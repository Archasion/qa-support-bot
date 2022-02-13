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
		if ((await Tickets.countDocuments()) !== 0) {
			const check_limit = await Tickets.findOne({
				author: interaction.user.id,
				active: true
			}); // Check if the user has an active ticket

			if (check_limit) {
				interaction.reply({
					content: `You already have an active ticket: <#${check_limit.thread}>`,
					ephemeral: true
				});
				return;
			}

			amount = (await Tickets.countDocuments()) + 1; // Get the ticket count
		}

		// Creating the ticket
		const info = interaction.options.getString("topic").format();
		const ticket_channel = interaction.guild.channels.cache.get(config.channels.tickets);

		const ticket = await ticket_channel.threads.create({
			name: `Ticket ${amount}`,
			autoArchiveDuration: 60,
			type: "GUILD_PUBLIC_THREAD",
			// invitable: false,
			reason: `New ticket: ${info}`
		});

		interaction.reply({
			content: `Your ticket has been created: <#${ticket.id}> (\`${ticket.name}\`)`,
			ephemeral: true
		});

		// Sending message in ticket channel
		const embed = new MessageEmbed()

			.setColor(config.colors.default_color)
			.setTitle(`Hello ${interaction.member.displayName}!`)
			.setDescription(
				"Thank you for creating a ticket. A member of staff will soon be available to assist you. Please make sure you **read** the <#922957941395570748> and the <#922957941395570748> channels to see if they answer your question."
			)
			.addField("Topic", info);

		const message = await ticket.send({
			content: `<@&${config.roles.manager} > <@&${config.roles.moderator} > ${interaction.member}`,
			embeds: [embed]
		});

		// Storing information in database
		await Tickets.create({
			count: amount,
			thread: ticket.id,
			author: interaction.user.id,
			topic: info,
			first_message: message.id,
			active: true
		});

		// Logging
		const logging_embed = new MessageEmbed()

			.setColor(config.colors.default_color)
			.setAuthor({
				name: `${interaction.user.tag} (${interaction.member.displayName})`,
				iconURL: interaction.user.displayAvatarURL()
			})
			.setDescription(`Created a new ticket: <#${ticket.id}> (\`${ticket.name}\`)`)
			.addField("Topic", `\`\`\`${info}\`\`\``)
			.setFooter({ text: `ID: ${interaction.user.id}` })
			.setTimestamp();

		interaction.guild.channels.cache.get(TICKET_LOGS).send({
			embeds: [logging_embed]
		});
	}
};
