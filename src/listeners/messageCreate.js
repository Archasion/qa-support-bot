const EventListener = require("../modules/listeners/listener");

const {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType
} = require("discord.js");

const { MODERATION_CHAT, NDA_APPLICATIONS, MESSAGE_LOGS } = process.env;

module.exports = class MessageCreateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "messageCreate" });
	}

	async execute(message) {
		if (!message.guild) return;
		if (message.author.bot) return;

		const messageLogs = message.guild.channels.cache.get(MESSAGE_LOGS);

		if (message.channel.id === config.channels.verify) {
			if (await utils.isStaff(message.member)) return;
			if (message.author.bot) return;

			if (!message.content.match("^!(?:re|un)?verify$")) {
				message
					.reply({
						content: "Please use `!verify` to verify your account.",
						allowedMentions: { repliedUser: true }
					})
					.then(response => {
						setTimeout(() => {
							response.delete().catch(() => log.error("Couldn't delete the response"));
						}, 8000); // 8 seconds
					});
			}
		}

		// prettier-ignore
		const whitelistedFileExtensions = ["jpg", "jpeg", "png", "gif", "gifv", "webm", "mp4", "wav", "mp3", "ogg", "mov", "flac"];

		// Attachment filter
		if (
			message.attachments.size > 0 &&
			!message.author.bot &&
			!(await utils.isStaff(message.member))
		) {
			message.attachments.forEach(attachment => {
				const fileExtension = attachment.name.split(".").pop();

				if (!whitelistedFileExtensions.includes(fileExtension.toLowerCase())) {
					const log = new EmbedBuilder()

						.setAuthor({
							name: message.author.tag,
							iconURL: message.author.displayAvatarURL()
						})
						.setDescription(
							`Message sent by ${message.member} deleted in <#${message.channel.id}>`
						)
						.addFields({
							name: "Reason",
							value: `File extension not in the whitelist: \`${fileExtension}\``
						})
						.setFooter({
							text: `ID: ${message.author.id}`,
							iconURL: message.author.displayAvatarURL()
						})

						.setColor(config.colors.default)
						.setTitle("Message Deleted")
						.setTimestamp();

					messageLogs.send({ embeds: [log] });

					message.delete();
					return;
				}
			});
		}

		if (message.channel.type === ChannelType.GuildPublicThread) {
			// Session thread filter
			if (message.channel.parent.id === config.channels.sessions) {
				// Sentence includes word(s)
				const wildcard = ["fuck", "shit"];

				// prettier-ignore
				// Sentence is exactly the word(s)
				const exact = ["hi", "hello", "hey", "sup", "yo", "whats up", "lol", "wow", "ok", "lmao", "ha", "haha"];

				const input = message.content.toLowerCase();
				let remove = false;

				for (const word of exact) {
					if (input === word) remove = true;
				}

				for (const word of wildcard) {
					if (input.includes(word)) remove = true;
				}

				if (message.attachments.size === 0) {
					if (input.length <= 3 && !input.match(/^(?:\^+|y[eu][sp]|no)$/gims)) remove = true;
				}

				if (remove) return message.delete();
			}
		}

		// Underage detector
		if (
			message.content.match(/i(\sa)?'?m\s?(only\s)?([8-9]|1[0-2])(\s|$)/gi) &&
			!message.member.roles.cache.has(config.roles.moderator) &&
			!message.member.roles.cache.has(config.roles.ndaVerified)
		) {
			potentiallyUnderage();
		}

		// Underage detector [NDA]
		if (
			message.content.match(/i(\sa)?'?m\s?(only\s)?([8-9]|1[0-4])(\s|$)/gi) &&
			!message.member.roles.cache.has(config.roles.moderator) &&
			message.member.roles.cache.has(config.roles.ndaVerified)
		) {
			potentiallyUnderageNDA();
		}

		// Application leak detector
		if (
			message.content.includes(process.env.NDA_FORM_KEY) &&
			!message.member.roles.cache.has(config.roles.moderator)
		) {
			leakingApplication();
		}

		// Application validation [Active Tester]
		if (message.channel.id === NDA_APPLICATIONS && message.author.bot) {
			const username = message.embeds[0].data.author.name;

			try {
				let member = await message.guild.members.search({ query: username });
				member = member.first();

				if (!member.roles.cache.has(config.roles.activeTester)) message.react("⚠️");
			} catch {
				message.react("⚠️");
			}
		}

		/**
		 * Response to an underage flag
		 * @name potentiallyUnderage
		 * @returns {Promise<void>} Sends the alert in the moderation channel
		 * @function
		 */
		async function potentiallyUnderage() {
			const alert = new EmbedBuilder()

				.setFooter({
					text: `ID: ${message.author.id}`,
					iconURL: message.author.displayAvatarURL({ dynamic: true })
				})
				.addFields(
					{ name: "Reason", value: "Potentially Underage" },
					{ name: "Message Content", value: `\`\`\`${message.content}\`\`\`` }
				)

				.setColor(config.colors.default)
				.setDescription(`${message.author} has been flagged.`)
				.setTimestamp();

			const messageUrl = new ActionRowBuilder().addComponents(
				new ButtonBuilder({})
					.setURL(message.url)
					.setLabel("Jump to Message")
					.setStyle(ButtonStyle.Link)
			);

			// Send the alert
			message.guild.channels.cache.get(MODERATION_CHAT).send({
				content: `<@&${config.roles.moderator}> <@&${config.roles.manager}>`,
				components: [messageUrl],
				embeds: [alert]
			});
		}

		/**
		 * Response to an underage flag (For NDA)
		 * @name potentiallyUnderageNDA
		 * @returns {Promise<void>} Sends the alert in the moderation channel
		 * @function
		 */
		async function potentiallyUnderageNDA() {
			const alert = new EmbedBuilder()

				.setFooter({
					text: `ID: ${message.author.id}`,
					iconURL: message.author.displayAvatarURL({ dynamic: true })
				})
				.addFields(
					{ name: "Reason", value: "Potentially Underage for NDA" },
					{ name: "Message Content", value: `\`\`\`${message.content}\`\`\`` }
				)

				.setColor(config.colors.default)
				.setDescription(`${message.author} has been flagged.`)
				.setTimestamp();

			const messageUrl = new ActionRowBuilder().addComponents(
				new ButtonBuilder({})
					.setURL(message.url)
					.setLabel("Jump to Message")
					.setStyle(ButtonStyle.Link)
			);

			// Send the alert
			message.guild.channels.cache.get(MODERATION_CHAT).send({
				content: `<@&${config.roles.manager}>`,
				components: [messageUrl],
				embeds: [alert]
			});
		}

		/**
		 * Response to an application leak
		 * @name leakingApplication
		 * @returns {Promise<void>} Sends the alert in the moderation channel
		 * @function
		 */
		async function leakingApplication() {
			const alert = new EmbedBuilder()

				.setFooter({
					text: `ID: ${message.author.id}`,
					iconURL: message.author.displayAvatarURL({ dynamic: true })
				})
				.addFields(
					{ name: "Reason", value: "Leaking the NDA Application" },
					{ name: "Message Content", value: `\`\`\`${message.content}\`\`\`` }
				)

				.setColor(config.colors.default)
				.setDescription(`${message.author} has been flagged.`)
				.setTimestamp();

			const messageUrl = new ActionRowBuilder().addComponents(
				new ButtonBuilder({})
					.setURL(message.url)
					.setLabel("Jump to Message")
					.setStyle(ButtonStyle.Link)
			);

			// Send the alert
			message.guild.channels.cache.get(MODERATION_CHAT).send({
				content: `<@&${config.roles.moderator}> <@&${config.roles.manager}>`,
				components: [messageUrl],
				embeds: [alert]
			});
		}
	}
};
