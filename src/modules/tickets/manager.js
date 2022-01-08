const EventEmitter = require("events");
const TicketArchives = require("./archives");
const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

/** Manages tickets */
module.exports = class TicketManager extends EventEmitter {
	/**
	 * Create a TicketManager instance
	 * @param {import('../..').Bot} client
	 */
	constructor(client) {
		super();

		/** The Discord Client */
		this.client = client;

		this.setMaxListeners(config.max_listeners);

		this.archives = new TicketArchives(this.client);
	}

	/**
	 * Create a new ticket
	 * @param {string} guild_id - ID of the guild to create the ticket in
	 * @param {string} creator_id - ID of the ticket creator (user)
	 * @param {string} category_id - ID of the ticket category
	 * @param {string} [topic] - The ticket topic
	 */
	async create(guild_id, creator_id, category_id, topic) {
		if (!topic) {
			topic = "";
		}

		const caticket_row = await db.models.Category.findOne({ where: { id: category_id } });

		if (!caticket_row) {
			throw new Error("Ticket category does not exist");
		}

		const cat_channel = await this.client.channels.fetch(category_id);

		if (cat_channel.children.size >= 50) {
			throw new Error("Ticket category has reached child channel limit (50)");
		}

		const number = (await db.models.Ticket.count({ where: { guild: guild_id } })) + 1;

		const guild = this.client.guilds.cache.get(guild_id);
		const creator = await guild.members.fetch(creator_id);
		const name = caticket_row.name_format
			.replace(/{+\s?(user)?name\s?}+/gi, creator.displayName)
			.replace(/{+\s?num(ber)?\s?}+/gi, number);

		const t_channel = await guild.channels.create(name, {
			parent: category_id,
			reason: `${creator.user.tag} requested a new ticket channel`,
			topic: `${creator}${topic.length > 0 ? ` | ${topic}` : ""}`,
			type: "GUILD_TEXT"
		});

		t_channel.permissionOverwrites.edit(
			creator_id,
			{
				ATTACH_FILES: true,
				READ_MESSAGE_HISTORY: true,
				SEND_MESSAGES: true,
				VIEW_CHANNEL: true
			},
			`Ticket channel created by ${creator.user.tag}`
		);

		const ticket_row = await db.models.Ticket.create({
			category: category_id,
			creator: creator_id,
			guild: guild_id,
			id: t_channel.id,
			number,
			topic: topic.length === 0 ? null : cryptr.encrypt(topic)
		});

		(async () => {
			const settings = await utils.getSettings(guild.id);

			topic = ticket_row.topic ? cryptr.decrypt(ticket_row.topic) : "";

			if (caticket_row.image) {
				await t_channel.send({ content: caticket_row.image });
			}

			const description = caticket_row.opening_message
				.replace(/{+\s?(user)?name\s?}+/gi, creator.displayName)
				.replace(/{+\s?(tag|ping|mention)?\s?}+/gi, creator.user.toString());
			const embed = new MessageEmbed()
				.setColor(config.colors.default_color)
				.setAuthor({ name: creator.user.username, iconURL: creator.displayAvatarURL() })
				.setDescription(description)
				.setFooter({ text: config.text.footer, iconURL: guild.iconURL() });

			if (topic) {
				embed.addField("Topic", topic);
			}

			const components = new MessageActionRow();

			if (caticket_row.claiming) {
				components.addComponents(
					new MessageButton()
						.setCustomId("ticket.claim")
						.setLabel("Claim")
						.setEmoji("🙌")
						.setStyle("SECONDARY")
				);
			}

			if (settings.close_button) {
				components.addComponents(
					new MessageButton()
						.setCustomId("ticket.close")
						.setLabel("Close")
						.setEmoji("✖️")
						.setStyle("DANGER")
				);
			}

			const mentions =
				// prettier-ignore
				caticket_row.ping instanceof Array && caticket_row.ping.length > 0
					? caticket_row.ping
						.map(id =>
							id === "everyone" ? "@everyone" : id === "here" ? "@here" : `<@&${id}>`
						)
						.join(", ")
					: "";
			const sent = await t_channel.send({
				components: caticket_row.claiming || settings.close_button ? [components] : [],
				content: `${mentions}\n${creator.user.toString()} has created a new ticket`,
				embeds: [embed]
			});
			await sent.pin({ reason: "Ticket opening message" });

			await ticket_row.update({ opening_message: sent.id });

			const pinned = t_channel.messages.cache.last();

			if (pinned.system) {
				pinned
					.delete({ reason: "Cleaning up system message" })
					.catch(() => log.warn("Failed to delete system pin message"));
			}

			if (caticket_row.require_topic && topic.length === 0) {
				const collector_message = await t_channel.send({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.default_color)
							.setTitle("Ticket Topic")
							.setDescription(
								"Please briefly state what this ticket is about in a a few words."
							)
							.setFooter({
								text: `${config.text.footer} • Expires in 120 seconds`,
								iconURL: guild.iconURL()
							})
					]
				});

				const filter = message => message.author.id === ticket_row.creator;
				const collector = t_channel.createMessageCollector({ filter, time: 120000 });

				collector.on("collect", async message => {
					topic = message.content;
					await ticket_row.update({ topic: cryptr.encrypt(topic) });
					await t_channel.setTopic(`${creator} | ${topic}`, {
						reason: "User updated ticket topic"
					});
					await sent.edit(
						new MessageEmbed()
							.setColor(config.colors.default_color)
							.setAuthor({
								name: creator.user.username,
								iconURL: creator.displayAvatarURL()
							})
							.setDescription(description)
							.addField("Topic", topic)
							.setFooter({ text: config.text.footer, iconURL: guild.iconURL() })
					);
					await message.react("");
					collector.stop();
				});

				collector.on("end", async () => {
					collector_message
						.delete()
						.catch(() => log.warn("Failed to delete topic collector message"));
				});
			}
		})();

		log.info(`${creator.user.tag} created a new ticket in "${guild.name}"`);

		this.emit("create", ticket_row.id, creator_id);

		return ticket_row;
	}

	/**
	 * Close a ticket
	 * @param {(string|number)} ticket_id - The channel ID, or the ticket number
	 * @param {string?} closer_id - ID of the member who is closing the ticket, or null
	 * @param {string} [guild_id] - The ID of the ticket's guild (used if a ticket number is provided instead of ID)
	 * @param {string} [reason] - The reason for closing the ticket
	 */
	async close(ticket_id, closer_id, guild_id, reason) {
		const ticket_row = await this.resolve(ticket_id, guild_id);
		if (!ticket_row) {
			throw new Error(`A ticket with the ID or number "${ticket_id}" could not be resolved`);
		}

		ticket_id = ticket_row.id;

		this.emit("beforeClose", ticket_id);

		const guild = this.client.guilds.cache.get(ticket_row.guild);
		const channel = await this.client.channels.fetch(ticket_row.id);

		const close = async () => {
			const pinned = await channel.messages.fetchPinned();
			await ticket_row.update({
				closed_by: closer_id || null,
				closed_reason: reason ? cryptr.encrypt(reason) : null,
				open: false,
				pinned_messages: [...pinned.keys()]
			});

			if (closer_id) {
				const closer = await guild.members.fetch(closer_id);

				await this.archives.updateMember(ticket_id, closer);

				let description = `This ticket has been closed by ${closer.user.toString()}.\nThe channel will be deleted in 5 seconds.`;
				if (reason) {
					description += `\n\nReason: ${reason}`;
				}

				await channel.send({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.success_color)
							.setAuthor({
								name: closer.user.username,
								iconURL: closer.user.displayAvatarURL()
							})
							.setTitle("Ticket Closed")
							.setDescription(description)
							.setFooter({ text: config.text.footer, iconURL: guild.iconURL() })
					]
				});

				setTimeout(async () => {
					await channel.delete(
						`Ticket channel closed by ${closer.user.tag}${reason ? `: "${reason}"` : ""}`
					);
				}, 5000);

				log.info(
					`${closer.user.tag} closed a ticket (${ticket_id})${reason ? `: "${reason}"` : ""}`
				);
			} else {
				let description =
					"This ticket has been closed.\nThe channel will be deleted in 5 seconds.";
				if (reason) {
					description += `\n\nReason: ${reason}`;
				}

				await channel.send({
					embeds: [
						new MessageEmbed()
							.setColor(config.colors.success_color)
							.setTitle("Ticket Closed")
							.setDescription(description)
							.setFooter({ text: config.text.footer, iconURL: guild.iconURL() })
					]
				});

				setTimeout(async () => {
					await channel.delete(`Ticket channel closed${reason ? `: "${reason}"` : ""}`);
				}, 5000);

				log.info(`A ticket was closed (${ticket_id})${reason ? `: "${reason}"` : ""}`);
			}
		};

		if (channel) {
			await close();
		}

		this.emit("close", ticket_id);
		return ticket_row;
	}

	/**
	 *
	 * @param {(string|number)} ticket_id - ID or number of the ticket
	 * @param {string} [guild_id] - The ID of the ticket's guild (used if a ticket number is provided instead of ID)
	 */
	async resolve(ticket_id, guild_id) {
		let ticket_row;

		if (this.client.channels.resolve(ticket_id)) {
			ticket_row = await db.models.Ticket.findOne({ where: { id: ticket_id } });
		} else {
			ticket_row = await db.models.Ticket.findOne({
				where: {
					guild: guild_id,
					number: ticket_id
				}
			});
		}

		return ticket_row;
	}
};
