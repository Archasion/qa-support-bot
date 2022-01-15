const EventListener = require("../modules/listeners/listener");
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

module.exports = class MessageCreateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "messageCreate" });
	}

	async execute(message) {
		if (!message.guild) return;

		// ANCHOR UNDERAGE
		if (
			message.content.match(/i(\sa)?'?m\s?(only\s)?([8-9]|1[0-2])(\s|$)/gi) &&
			!message.member.roles.cache.has(config.roles.moderator) &&
			!message.member.roles.cache.has(config.roles.nda_verified)
		) {
			potentiallyUnderage();
		}

		// ANCHOR UNDERAGE [NDA]
		if (
			message.content.match(/i(\sa)?'?m\s?(only\s)?([8-9]|1[0-4])(\s|$)/gi) &&
			!message.member.roles.cache.has(config.roles.moderator) &&
			message.member.roles.cache.has(config.roles.nda_verified)
		) {
			potentiallyUnderageNDA();
		}

		// ANCHOR APPLICATION LEAK
		if (
			message.content.includes(process.env.NDA_FORM_KEY) &&
			!message.member.roles.cache.has(config.roles.moderator)
		) {
			leakingApplication();
		}

		// ANCHOR VALIDATE APPLICATION
		if (message.channel.id === config.channels.moderation.applications && message.author.bot) {
			const username = message.embeds[0].author.name;
			try {
				let member = await message.guild.members.search({ query: username });
				member = member.first();

				if (!member.roles.cache.has(config.roles.active_tester)) message.react("⚠️");
			} catch {
				message.react("⚠️");
			}
		}

		// ANCHOR TICKETS
		const ticket_row = await db.models.Ticket.findOne({
			where: { id: message.channel.id }
		});

		if (ticket_row) {
			const ignore = [this.client.user.id, ticket_row.creator];
			if (!ticket_row.first_response && !ignore.includes(message.author.id)) {
				ticket_row.first_response = new Date();
			}

			ticket_row.last_message = new Date();
			await ticket_row.save();
		} else if (message.author.bot) return;

		// ANCHOR FUNCTIONS

		/**
		 * Response to an underage flag
		 * @name potentiallyUnderage
		 * @returns {Promise} Sends the alert in the moderation channel
		 * @function
		 */
		async function potentiallyUnderage() {
			const embed = new MessageEmbed()

				.setColor(config.colors.default_color)
				.setDescription(`${message.author} has been flagged.`)
				.setFooter({
					text: `ID: ${message.author.id}`,
					iconURL: message.author.displayAvatarURL({ dynamic: true })
				})
				.addField("Reason", "Potentially Underage")
				.addField("Message Content", `\`\`\`${message.content}\`\`\``)
				.setTimestamp();

			const messageUrl = new MessageActionRow().addComponents(
				new MessageButton().setURL(message.url).setLabel("Jump to Message").setStyle("LINK")
			);

			message.guild.channels.cache.get(config.channels.moderation).send({
				content: `<@&${config.roles.moderator}>`,
				components: [messageUrl],
				embeds: [embed]
			});
		}

		/**
		 * Response to an underage flag (For NDA)
		 * @name potentiallyUnderageNDA
		 * @returns {Promise} Sends the alert in the moderation channel
		 * @function
		 */
		async function potentiallyUnderageNDA() {
			const embed = new MessageEmbed()

				.setColor(config.colors.default_color)
				.setDescription(`${message.author} has been flagged.`)
				.setFooter({
					text: `ID: ${message.author.id}`,
					iconURL: message.author.displayAvatarURL({ dynamic: true })
				})
				.addField("Reason", "Potentially Underage for NDA")
				.addField("Message Content", `\`\`\`${message.content}\`\`\``)
				.setTimestamp();

			const messageUrl = new MessageActionRow().addComponents(
				new MessageButton().setURL(message.url).setLabel("Jump to Message").setStyle("LINK")
			);

			message.guild.channels.cache.get(config.channels.moderation).send({
				content: `<@&${config.roles.moderator}>`,
				components: [messageUrl],
				embeds: [embed]
			});
		}

		/**
		 * Response to an application leak
		 * @name leakingApplication
		 * @returns {Promise} Sends the alert in the moderation channel
		 * @function
		 */
		async function leakingApplication() {
			const embed = new MessageEmbed()

				.setColor(config.colors.default_color)
				.setDescription(`${message.author} has been flagged.`)
				.setFooter({
					text: `ID: ${message.author.id}`,
					iconURL: message.author.displayAvatarURL({ dynamic: true })
				})
				.addField("Reason", "Leaking the NDA application")
				.addField("Message Content", `\`\`\`${message.content}\`\`\``)
				.setTimestamp();

			const messageUrl = new MessageActionRow().addComponents(
				new MessageButton().setURL(message.url).setLabel("Jump to Message").setStyle("LINK")
			);

			message.guild.channels.cache.get(config.channels.moderation).send({
				content: `<@&${config.roles.moderator}>`,
				components: [messageUrl],
				embeds: [embed]
			});
		}
	}
};
