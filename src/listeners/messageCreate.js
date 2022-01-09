const EventListener = require("../modules/listeners/listener");
const fetch = require("node-fetch");
const { MessageAttachment, MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

module.exports = class MessageCreateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "messageCreate" });
	}

	async execute(message) {
		if (!message.guild) {
			return;
		}

		const settings = await utils.getSettings(message.guild.id);
		const ticket_row = await db.models.Ticket.findOne({ where: { id: message.channel.id } });

		if (
			message.content.match(/i(\sa)?'?m\s?(only\s)?([8-9]|1[0-2])(\s|$)/gi) &&
			!message.member.roles.cache.has(config.ids.roles.moderator) &&
			!message.member.roles.cache.has(config.ids.roles.nda_verified)
		) {
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

			message.guild.channels.cache.get(config.ids.channels.staff).send({
				content: `<@&${config.ids.roles.moderator}>`,
				components: [messageUrl],
				embeds: [embed]
			});
		}

		if (
			message.content.match(/i(\sa)?'?m\s?(only\s)?([8-9]|1[0-4])(\s|$)/gi) &&
			!message.member.roles.cache.has(config.ids.roles.moderator) &&
			message.member.roles.cache.has(config.ids.roles.nda_verified)
		) {
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

			message.guild.channels.cache.get(config.ids.channels.staff).send({
				content: `<@&${config.ids.roles.moderator}>`,
				components: [messageUrl],
				embeds: [embed]
			});
		}

		if (
			message.content.includes(process.env.NDA_FORM_KEY) &&
			!message.member.roles.cache.has(config.ids.roles.moderator)
		) {
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

			message.guild.channels.cache.get(config.ids.channels.staff).send({
				content: `<@&${config.ids.roles.moderator}>`,
				components: [messageUrl],
				embeds: [embed]
			});
		}

		if (ticket_row) {
			const ignore = [this.client.user.id, ticket_row.creator];
			if (!ticket_row.first_response && !ignore.includes(message.author.id)) {
				ticket_row.first_response = new Date();
			}

			ticket_row.last_message = new Date();
			await ticket_row.save();
		} else if (message.content.startsWith("tickets/")) {
			if (!message.member.permissions.has("MANAGE_GUILD")) {
				return;
			}

			if (message.content.toLowerCase().match(/tickets\/tags/i)) {
				const attachments = [...message.attachments.values()];

				if (attachments.length >= 1) {
					log.info(`Downloading tags for "${message.guild.name}"`);
					const data = await (await fetch(attachments[0].url)).json();
					settings.tags = data;
					await settings.save();
					log.success(`Updated tags for "${message.guild.name}"`);
					this.client.commands.publish(message.guild);

					message.channel.send({
						content: "The settings have been updated.",
						ephermal: true
					});
				} else {
					const list = Object.keys(settings.tags).map(t => `❯ **\`${t}\`**`);

					const attachment = new MessageAttachment(
						Buffer.from(JSON.stringify(settings.tags, null, 2)),
						"tags.json"
					);

					return message.channel.send({
						embeds: [
							new MessageEmbed()
								.setColor(config.colors.default_color)
								.setTitle("Tag List")
								.setDescription(list.join("\n"))
								.setFooter({
									text: config.text.footer,
									iconURL: message.guild.iconURL()
								})
						],
						files: [attachment]
					});
				}
			}
			// eslint-disable-next-line no-useless-return, curly
		} else if (message.author.bot) return;
	}
};
