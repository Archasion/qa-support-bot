const EventListener = require("../modules/listeners/listener");

const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

module.exports = class MessageReactionAddEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "messageReactionAdd" });
	}

	async execute(reaction, user) {
		let { message, emoji } = reaction;
		message = await message.channel.messages.fetch(message.id);

		const moderation_channel = message.guild.channels.cache.get(config.channels.moderation.chat);
		const alert_thread = await moderation_channel.threads.fetch(config.threads.alerts);
		const guild_member = await message.guild.members.fetch(user.id);

		switch (emoji.name) {
			case "📅": // Create event and message developer
			case "🗓️":
				if (!(await utils.isStaff(await message.guild.members.fetch(message.author.id)))) return;
				if (message.channel.id === config.channels.moderation.requests) return;
				if (!message.author.bot) return;

				createEvent(message);
				break;

			case "⚠️": // Notify staff
				if (!(await utils.isNDA(guild_member))) return; // Used by NDA
				if (await utils.isStaff(await message.guild.members.fetch(message.author.id))) return; // Not used on staff
				if (message.author.id === user.id) return; // Not used on self
				if (message.author.bot) return; // Not used on a bot

				// eslint-disable-next-line no-case-declarations
				const check = alert_thread.messages.cache.filter(
					alert_message =>
						(alert_message.embeds[0]
							? alert_message.embeds[0].footer.text.includes(message.author.id)
							: false) &&
						alert_message.createdTimestamp > Date.now() - 600000 &&
						alert_message.author.bot
				);

				if (check.first()) return; // Not used in the last 10 minutes

				notifyStaff(message);
				break;
		}

		async function notifyStaff(message) {
			const embed = new MessageEmbed()

				.setColor(config.colors.default_color)
				.setAuthor({
					name: `Reported by ${user.tag} (${user.id})`,
					iconURL: user.displayAvatarURL()
				})
				.setDescription(`Message Content:\n\`\`\`${message.content}\`\`\``)
				.setFooter({
					text: `Reported against ${message.author.tag} (${message.author.id})`,
					iconURL: message.author.displayAvatarURL({ dynamic: true })
				})
				.setTimestamp();

			const message_url = new MessageActionRow().addComponents(
				new MessageButton().setURL(message.url).setLabel("Jump to Message").setStyle("LINK")
			);

			alert_thread.send({
				content: "@here",
				embeds: [embed],
				components: [message_url]
			});
		}

		async function createEvent(message) {
			try {
				const username_regex = new RegExp(/Username:\s([\w\d_]+),/gims);
				const timestamp_regex = new RegExp(/⏰ <t:(\d+):F>/gims);
				const platforms_regex = new RegExp(/🖥(.+)/gims);

				const embed = message.embeds[0];
				const timestamp = timestamp_regex.exec(embed.description)[1] * 1000;
				const platforms = platforms_regex.exec(embed.description)[1];

				const username = username_regex.exec(embed.footer.text)[1];
				let member = await message.guild.members.search({ query: username });
				member = member.first();

				// ANCHOR Check if event exists
				const events = message.guild.scheduledEvents.cache.map(event => ({
					startTime: event.scheduledStartTimestamp,
					name: event.name,
					id: event.id
				}));

				let check = false;

				await events.forEach(event => {
					if (event.name === embed.author.name && event.startTime === timestamp) {
						moderation_channel.send(
							`${user} Test already scheduled for <t:${
								timestamp / 1000
							}:F>\nhttps://discord.com/events/${message.guild.id}/${event.id}`
						);
						check = true;
					}
				});

				if (check) return;

				let channel = config.vcs.public.testing;
				if (embed.author.name === "NDA Test") channel = config.vcs.nda.testing;

				const testing_session = await message.guild.scheduledEvents.create({
					privacyLevel: "GUILD_ONLY",
					entityType: "VOICE",
					name: embed.author.name,
					channel: message.guild.channels.cache.get(channel),
					scheduledStartTime: new Date(timestamp).toISOString(),
					scheduledEndTime: new Date(timestamp + 6000000).toISOString(),
					description: `🖥 Platforms:**${platforms}**\n\n*Subject to change*`
				});

				const pinned_message = moderation_channel.messages.fetch(
					config.messages.testing_requests
				);

				pinned_message.edit({
					content: `${pinned_message.content}\n\n> ${
						embed.author.name === "NDA Test" ? "🔒 " : ""
					}**${embed.title}** <t:${timestamp / 1000}:F>\n> ${message.url}`
				});

				const notification = `Hey there ${member}, we've reviewed your request for **${
					embed.title
				}** to be tested by our **${embed.author.name.split(" ")[0]} team** on <t:${
					timestamp / 1000
				}:F> (Local Time) and have decided to approve the request, feel free to **contact** a staff member if you have any questions regarding your testing session.\n\nEvent URL:\nhttps://discord.com/${
					message.guild.id
				}/${testing_session.id}`;

				try {
					await member.send(notification);
					moderation_channel.send(
						`${user} The \`${embed.author.name}\` for **${
							embed.title
						}** has been scheduled for <t:${
							timestamp / 1000
						}:F>\nhttps://discord.com/events/${message.guild.id}/${testing_session.id}`
					);

					message.react("✅");
				} catch {
					const channel = message.guild.channels.cache.get(config.channels.public.request);
					channel.threads
						.create({
							name: embed.title,
							autoArchiveDuration: 1440,
							type: "GUILD_PRIVATE_THREAD",
							reason: "Unable to message author regarding a testing request."
						})
						.then(thread => {
							thread.send(notification);

							moderation_channel.send(
								`${user} The \`${embed.author.name}\` for **${
									embed.title
								}** has been scheduled for <t:${
									timestamp / 1000
								}:F> (messaged the user through a private thread: <#${
									thread.id
								}>)\nhttps://discord.com/events/${message.guild.id}/${
									testing_session.id
								}`
							);
						});

					message.react("❌");
				}
			} catch {
				await moderation_channel.send(`${user} could not accept the test.`);
			}
		}
	}
};
