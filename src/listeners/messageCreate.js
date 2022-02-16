const EventListener = require("../modules/listeners/listener");

const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { MODERATION_CHAT, NDA_APPLICATIONS } = process.env;

module.exports = class MessageCreateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "messageCreate" });
	}

	async execute(message) {
		if (!message.guild) return;

		// #verify
		if (message.channel.id === "436232260392452102") {
			if (await utils.isStaff(message.member)) return;
			if (!message.content.toLowerCase().includes("!verify")) {
				message
					.reply({
						content: "Please use `!verify` to verify your account.",
						allowedMentions: {
							repliedUser: true
						}
					})
					.then(response => {
						setTimeout(() => {
							response.delete().catch(() => log.error("Couldn't delete the response"));
						}, 8000); // 8 seconds
					});
			}
		}

		if (message.channel.type === "GUILD_PUBLIC_THREAD") {
			// ANCHOR Automatic deletion
			if (message.channel.parent.id === config.channels.sessions) {
				// Sentence includes word(s)
				// prettier-ignore
				const wildcard = ["fuck", "shit"];

				// Sentence is exactly the word(s)
				// prettier-ignore
				const exact = ["hi", "hello", "hey", "sup", "yo", "whats up", "lol", "wow", "ok", "lmao", "ha", "haha"];

				let remove = false;
				const input = message.content.toLowerCase();

				for (const word of exact) {
					if (input === word) remove = true;
				}

				for (const word of wildcard) {
					if (input.includes(word)) remove = true;
				}

				if (input.length <= 3 && !input.match(/^(?:\^+|y[eu][sp]|no)$/gims)) remove = true;
				if (remove) return message.delete();
			}
		}

		// Underage detector
		if (
			message.content.match(/i(\sa)?'?m\s?(only\s)?([8-9]|1[0-2])(\s|$)/gi) &&
			!message.member.roles.cache.has(config.roles.moderator) &&
			!message.member.roles.cache.has(config.roles.nda_verified)
		) {
			potentiallyUnderage();
		}

		// Underage detector [NDA]
		if (
			message.content.match(/i(\sa)?'?m\s?(only\s)?([8-9]|1[0-4])(\s|$)/gi) &&
			!message.member.roles.cache.has(config.roles.moderator) &&
			message.member.roles.cache.has(config.roles.nda_verified)
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
			const username = message.embeds[0].author.name;
			try {
				let member = await message.guild.members.search({ query: username });
				member = member.first();

				if (!member.roles.cache.has(config.roles.active_tester)) message.react("⚠️");
			} catch {
				message.react("⚠️");
			}
		}

		// Ignore bot input
		if (message.author.bot) return;

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

			const messageURL = new MessageActionRow().addComponents(
				new MessageButton().setURL(message.url).setLabel("Jump to Message").setStyle("LINK")
			);

			// Send the alert
			message.guild.channels.cache.get(MODERATION_CHAT).send({
				content: `<@&${config.roles.moderator}>`,
				components: [messageURL],
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

			const messageURL = new MessageActionRow().addComponents(
				new MessageButton().setURL(message.url).setLabel("Jump to Message").setStyle("LINK")
			);

			// Send the alert
			message.guild.channels.cache.get(MODERATION_CHAT).send({
				content: `<@&${config.roles.moderator}>`,
				components: [messageURL],
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

			const messageURL = new MessageActionRow().addComponents(
				new MessageButton().setURL(message.url).setLabel("Jump to Message").setStyle("LINK")
			);

			// Send the alert
			message.guild.channels.cache.get(MODERATION_CHAT).send({
				content: `<@&${config.roles.moderator}>`,
				components: [messageURL],
				embeds: [embed]
			});
		}
	}
};
