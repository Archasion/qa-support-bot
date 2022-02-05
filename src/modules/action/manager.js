const EventEmitter = require("events");
const { MessageEmbed, MessageAttachment } = require("discord.js");
const { TICKET_LOGS } = process.env;

/** Manages tickets */
module.exports = class LoggingManager extends EventEmitter {
	/**
	 * Create a LoggingManager instance
	 * @param {import('../..').Bot} client
	 */
	constructor(client) {
		super();

		/** The Discord Client */
		this.client = client;

		this.setMaxListeners(config.max_listeners);
	}

	/**
	 * Log the creation of a new ticket
	 * @param {object} guild The guild's object
	 * @param {object} creator The user object
	 * @param {object} ticket - The ticket object
	 * @param {string} [topic] - The ticket topic
	 */
	async createTicket(guild, creator, ticket, topic) {
		const loggingChannel = guild.channels.cache.get(TICKET_LOGS);
		const member = guild.members.cache.get(creator.id);

		const sb = []; // New string builder
		sb.push("Created a new ticket: "); // User
		sb.push(`\`ticket-${ticket.number}\``); // Ticket

		const embed = new MessageEmbed()

			.setColor(config.colors.default_color)
			.setAuthor({
				name: `${creator.tag} (${member.nickname})`,
				iconURL: creator.displayAvatarURL()
			})
			.setDescription(sb.join(""))
			.addField("Topic", `\`\`\`${topic}\`\`\``, false)
			.setFooter({ text: `ID: ${creator.id}` })
			.setTimestamp();

		loggingChannel.send({ embeds: [embed] });
	}

	/**
	 * Log the ticket being closed
	 * @param {object} guild The guild's object
	 * @param {object} creator The user object
	 * @param {string} reason - The reason for closing the ticket
	 * @param {number} ticket - The ticket's ID
	 */
	async closeTicket(guild, creator, reason, ticket) {
		const loggingChannel = guild.channels.cache.get(TICKET_LOGS);
		const member = guild.members.cache.get(creator.id);

		ticket = await this.client.channels.cache.get(ticket);

		const sb = []; // New string builder
		sb.push("Closed a ticket: "); // User
		sb.push(`\`${ticket.name}\``); // Ticket

		const embed = new MessageEmbed()

			.setColor(0x6b456b)
			.setAuthor({
				name: `${creator.tag} (${member.nickname})`,
				iconURL: creator.displayAvatarURL()
			})
			.setDescription(sb.join(""))
			.setFooter({ text: `ID: ${creator.id}` })
			.setTimestamp();

		if (reason !== null) {
			embed.addField("Reason", `\`\`\`${reason}\`\`\``, false);
		}

		let contentToLog = [];

		ticket.messages.cache
			.filter(message => !message.author.bot)
			.forEach(message => {
				const messageTimestamp = new Date(message.createdAt);
				const messageToLog = []; // New string builder

				messageToLog.push(
					`[${messageTimestamp.getHours()}:${messageTimestamp.getMinutes()}:${messageTimestamp.getSeconds()}]`
				);
				messageToLog.push(`(${message.author.tag} — ${message.author.id}):`);
				messageToLog.push(message.content);
				contentToLog.push(messageToLog.join(" "));
			});

		if (contentToLog[0]) {
			contentToLog = [
				new MessageAttachment(
					Buffer.from(contentToLog.join("\n"), "utf8"),
					`${ticket.name}-history.txt`
				)
			];
		}

		loggingChannel.send({ embeds: [embed], files: contentToLog });
	}

	/**
	 * Log the ticket's topic being changed
	 * @param {object} guild The guild's object
	 * @param {object} creator The user object
	 * @param {object} ticket - The ticket object
	 * @param {string} topic - The new topic
	 */
	async changeTopic(guild, creator, ticket, topic) {
		const loggingChannel = guild.channels.cache.get(TICKET_LOGS);
		const member = guild.members.cache.get(creator.id);

		const sb = []; // New string builder
		sb.push("Changed the topic of a ticket: "); // User
		sb.push(`\`ticket-${ticket.number}\``); // Ticket

		const embed = new MessageEmbed()

			.setColor(0xf5cd3d)
			.setAuthor({
				name: `${creator.tag} (${member.nickname})`,
				iconURL: creator.displayAvatarURL()
			})
			.setDescription(sb.join(""))
			.addField("New Topic", `\`\`\`${topic}\`\`\``, false)
			.setFooter({ text: `ID: ${creator.id}` })
			.setTimestamp();

		loggingChannel.send({ embeds: [embed] });
	}

	/**
	 * Log the addition of a user to a ticket
	 * @param {object} guild The guild's object
	 * @param {object} creator The user object
	 * @param {object} member - The user object
	 * @param {object} ticket - The ticket object
	 */
	async addMember(guild, creator, member, ticket) {
		const loggingChannel = guild.channels.cache.get(TICKET_LOGS);
		const user = guild.members.cache.get(creator.id);

		const sb = []; // New string builder
		sb.push("Added a member to a ticket: "); // User
		sb.push(`\`ticket-${ticket.number}\``); // Ticket

		const embed = new MessageEmbed()

			.setColor(0xd3f53d)
			.setAuthor({
				name: `${creator.tag} (${user.nickname})`,
				iconURL: creator.displayAvatarURL()
			})
			.setDescription(sb.join(""))
			.addField("Added Member", `${member.tag} (\`${member.id}\`)`, false)
			.setFooter({ text: `ID: ${creator.id}` })
			.setTimestamp();

		loggingChannel.send({ embeds: [embed] });
	}

	/**
	 * Log the removal of a user from a ticket
	 * @param {object} guild The guild's object
	 * @param {object} creator The user object
	 * @param {object} member - The user object
	 * @param {object} ticket - The ticket object
	 */
	async removeMember(guild, creator, member, ticket) {
		const loggingChannel = guild.channels.cache.get(TICKET_LOGS);
		const user = guild.members.cache.get(creator.id);

		const sb = []; // New string builder
		sb.push("Removed a member from a ticket: "); // User
		sb.push(`\`ticket-${ticket.number}\``); // Ticket

		const embed = new MessageEmbed()

			.setColor(0xf56b3d)
			.setAuthor({
				name: `${creator.tag} (${user.nickname})`,
				iconURL: creator.displayAvatarURL()
			})
			.setDescription(sb.join(""))
			.addField("Removed Member", `${member.tag} (\`${member.id}\`)`, false)
			.setFooter({ text: `ID: ${creator.id}` })
			.setTimestamp();

		loggingChannel.send({ embeds: [embed] });
	}
};
