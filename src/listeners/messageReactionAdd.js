const EventListener = require("../modules/listeners/listener");

const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const Tests = require("./../mongodb/models/tests");

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
				if (!(await utils.isStaff(guild_member))) return;
				if (message.channel.id !== config.channels.moderation.requests) return;
				if (!message.author.bot) return;
				if (guild_member.bot) return;

				createEvent(message);
				break;

			case "⚠️": // Notify staff
				if (!(await utils.isNDA(guild_member))) return; // Used by NDA
				if (await utils.isStaff(await message.guild.members.fetch(message.author.id))) return; // Not used on staff
				if (message.author.id === user.id) return; // Not used on self
				if (message.author.bot) return; // Not used on a bot
				if (guild_member.bot) return; // Not used by a bot

				// eslint-disable-next-line no-case-declarations
				const check = alert_thread.messages.cache.filter(
					alert_message =>
						(alert_message.embeds[0]
							? alert_message.embeds[0].footer.text.includes(message.author.id)
							: false) &&
						alert_message.createdTimestamp > Date.now() - 600000 &&
						alert_message.author.bot
				);

				if (check.first()) return; // Not used in the last 10 minutes on the same user

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
				const timestamp_regex = new RegExp(/⏰ <t:(\d+):F>/gims);
				const platforms_regex = new RegExp(/🖥(.+)/gims);

				const embed = message.embeds[0];
				const game_title = embed.title;
				const type = embed.author.name;
				const timestamp = timestamp_regex.exec(embed.description)[1] * 1000;
				const platforms = platforms_regex.exec(embed.description)[1];
				let test_type = "unknown";

				switch (type) {
					case "Public Test":
						test_type = "public";
						break;
					case "NDA Test":
						test_type = "nda";
						break;
				}

				let member;

				if (embed.color === 0xe67e22 || embed.color === 0xffffff) {
					const user_id_regex = new RegExp(/<@!?(\d{17,19})>/gims);
					const user_id = user_id_regex.exec(embed.fields[0].value)[1];

					member = await message.guild.members.fetch(user_id);
				} else {
					const username_regex = new RegExp(/Username:\s([\w\d_]+),/gims);
					const username = username_regex.exec(embed.footer.text)[1];

					member = await message.guild.members.search({ query: username });
					member = await member.first();
				}

				// ANCHOR Check if event exists
				const events = message.guild.scheduledEvents.cache.map(event => ({
					startTime: event.scheduledStartTimestamp,
					name: event.name,
					id: event.id
				}));

				let check = false;

				await events.forEach(event => {
					if (event.name === type && event.startTime === timestamp) {
						moderation_channel.send(
							`${user} Test already scheduled for <t:${
								timestamp / 1000
							}:F>\nhttps://discord.com/events/${message.guild.id}/${event.id}`
						);
						reaction.remove();
						check = true;
					}
				});

				if (check) return;

				let channel = config.vcs.public.testing;
				let emoji = "";

				if (embed.color === 0xe67e22) {
					await await Tests.create({
						name: game_title,
						type: "accelerator",
						url: embed.url,
						date: new Date(timestamp)
					});

					channel = config.vcs.accelerator.chat;
					emoji = "🥕 ";
				} else if (type === "NDA Test") {
					channel = config.vcs.nda.testing;
					emoji = "🔒 ";
				}

				await Tests.create({
					name: game_title,
					type: test_type,
					url: embed.url,
					date: new Date(timestamp)
				});

				const testing_session = await message.guild.scheduledEvents.create({
					privacyLevel: "GUILD_ONLY",
					entityType: "VOICE",
					name: type,
					channel: message.guild.channels.cache.get(channel),
					scheduledStartTime: new Date(timestamp).toISOString(),
					scheduledEndTime: new Date(timestamp + 6000000).toISOString(),
					description: `🖥 Platforms:**${platforms}**\n\n*Subject to change*`
				});

				const pinned_message = await moderation_channel.messages.fetch(
					config.messages.testing_requests
				);

				pinned_message.edit({
					content: `${pinned_message.content}\n\n> ${emoji}**${game_title}** <t:${
						timestamp / 1000
					}:F>\n> ${message.url}`
				});

				const notification = `Hey there ${member}, we've reviewed your request for **${game_title}** to be tested by our **${
					type.split(" ")[0]
				} team** on <t:${
					timestamp / 1000
				}:F> (Local Time) and have decided to approve the request, feel free to **contact** a staff member if you have any questions regarding your testing session.\n\nEvent URL:\nhttps://discord.com/${
					message.guild.id
				}/${testing_session.id}`;

				try {
					member.send(notification);
					moderation_channel.send(
						`${user} The \`${type}\` for **${game_title}** has been scheduled for <t:${
							timestamp / 1000
						}:F>\nhttps://discord.com/events/${message.guild.id}/${testing_session.id}`
					);

					message.react("✅");
				} catch {
					const channel = message.guild.channels.cache.get(config.channels.public.request);
					channel.threads
						.create({
							name: game_title,
							autoArchiveDuration: 1440,
							type: "GUILD_PRIVATE_THREAD",
							invitable: false,
							reason: "Unable to message author regarding a testing request."
						})
						.then(thread => {
							thread.send(notification);

							moderation_channel.send(
								`${user} The \`${type}\` for **${game_title}** has been scheduled for <t:${
									timestamp / 1000
								}:F> (messaged the user through a private thread: <#${
									thread.id
								}>)\nhttps://discord.com/events/${message.guild.id}/${
									testing_session.id
								}`
							);
						});

					message.react("✅");
				}
			} catch (er) {
				console.log(er);
				message.react("❌");
				await moderation_channel.send(`${user} could not accept the test.`);
			}
		}
	}
};
