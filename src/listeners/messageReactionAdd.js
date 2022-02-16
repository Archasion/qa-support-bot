const EventListener = require("../modules/listeners/listener");
const Tests = require("./../mongodb/models/tests");

const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

const {
	TESTING_REQUESTS,
	MODERATION_CHAT,
	ACTIVE_TESTING_REQUESTS,
	NDA_TESTING_VC,
	ACCELERATOR_CHAT_VC,
	MODERATION_ALERTS,
	REQUEST_DISCUSSION_THREAD
} = process.env;

module.exports = class MessageReactionAddEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "messageReactionAdd" });
	}

	async execute(reaction, user) {
		let { message, emoji } = reaction;
		message = await message.channel.messages.fetch(message.id);

		const moderationChat = message.guild.channels.cache.get(MODERATION_CHAT);
		const discussionThread = message.guild.channels.cache
			.get(TESTING_REQUESTS)
			.threads.cache.get(REQUEST_DISCUSSION_THREAD);
		const alertThread = await moderationChat.threads.fetch(MODERATION_ALERTS);
		const guildMember = await message.guild.members.fetch(user.id);

		switch (emoji.name) {
			case "📅": // Create event and message developer
			case "📆":
			case "🗓️":
				if (!(await utils.isStaff(guildMember))) return;
				if (message.channel.id !== TESTING_REQUESTS) return;
				if (!message.author.bot) return;
				if (guildMember.bot) return;

				createEvent(message);
				break;

			case "⚠️": // Notify staff
				if (!(await utils.isNDA(guildMember))) return; // Used by NDA
				if (await utils.isStaff(await message.guild.members.fetch(message.author.id))) return; // Not used on staff
				if (message.author.id === user.id) return; // Not used on self
				if (message.author.bot) return; // Not used on a bot
				if (guildMember.bot) return; // Not used by a bot

				// eslint-disable-next-line no-case-declarations
				const check = alertThread.messages.cache.filter(
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

		// Alert staff
		async function notifyStaff(message) {
			const embed = new MessageEmbed()

				.setColor(config.colors.default_color)
				.setAuthor({
					name: `Reported by ${user.tag} (${user.id})`,
					iconURL: user.displayAvatarURL({ dynamic: true })
				})
				.addField("Message Content", `\`\`\`${message.content}\`\`\``)
				.setFooter({
					text: `Reported against ${message.author.tag} (${message.author.id})`,
					iconURL: message.author.displayAvatarURL({ dynamic: true })
				})
				.setTimestamp();

			// Moderation buttons
			const quickActions = new MessageActionRow().addComponents(
				new MessageButton()
					.setCustomId("delete_message")
					.setLabel("Mark as Resolved")
					.setStyle("SUCCESS"),
				new MessageButton()
					.setCustomId("10_timeout_mod_alert")
					.setLabel("Timeout [10m]")
					.setStyle("DANGER"),
				new MessageButton()
					.setCustomId("30_timeout_mod_alert")
					.setLabel("Timeout [30m]")
					.setStyle("DANGER")
			);

			const messageURL = new MessageActionRow().addComponents(
				new MessageButton().setURL(message.url).setLabel("Jump to Message").setStyle("LINK")
			);

			// Alert staff
			alertThread.send({
				content: "@here",
				embeds: [embed],
				components: [quickActions, messageURL]
			});
		}

		// Create event for the testing request
		async function createEvent(message) {
			try {
				const timestampRegex = new RegExp(/⏰ <t:(\d+):F>/gims);
				const platformRegex = new RegExp(/🖥(.+)/gims);

				const embed = message.embeds[0];
				const gameTitle = embed.title;
				const type = embed.author.name;
				const timestamp = timestampRegex.exec(embed.description)[1] * 1000;
				const platforms = platformRegex.exec(embed.description)[1];
				const testType = type.split(" ")[0].toLowerCase();

				let member;

				// Fetch the game developer
				if (embed.color === 0xe67e22 || embed.color === 0xffffff) {
					const userIDRegex = new RegExp(/<@!?(\d{17,19})>/gims);
					const userID = userIDRegex.exec(embed.fields[0].value)[1];

					member = await message.guild.members.fetch(userID);
				} else {
					const usernameRegex = new RegExp(/Username:\s([\w\d_]+),/gims);
					const username = usernameRegex.exec(embed.footer.text)[1];

					member = await message.guild.members.search({ query: username });
					member = await member.first();
				}

				// Check if the event exists
				const events = message.guild.scheduledEvents.cache.map(event => ({
					startTime: event.scheduledStartTimestamp,
					name: event.name,
					id: event.id
				}));

				let check = false;

				// Respond if the event exists
				await events.forEach(event => {
					if (event.name === type && event.startTime === timestamp) {
						discussionThread.send(
							`${user} Test already scheduled for <t:${
								timestamp / 1000
							}:F>\nhttps://discord.com/events/${message.guild.id}/${event.id}`
						);
						reaction.remove();
						check = true;
					}
				});

				if (check) return;

				let channel = config.vcs.testing;
				let emoji = "";

				// Set the emoji and store the test in the database
				if (embed.color === 0xe67e22) {
					await await Tests.create({
						name: gameTitle,
						type: "accelerator",
						url: embed.url,
						date: new Date(timestamp)
					});

					channel = ACCELERATOR_CHAT_VC;
					emoji = "<:accelerator:941804781830283396> ";
				} else if (type === "NDA Verified Test") {
					channel = NDA_TESTING_VC;
					emoji = "<:nda:905799212350992475> ";
				}

				// Store the test in the database
				await Tests.create({
					name: gameTitle,
					type: testType,
					url: embed.url,
					date: new Date(timestamp)
				});

				// Create the event
				const testing_session = await message.guild.scheduledEvents.create({
					privacyLevel: "GUILD_ONLY",
					entityType: "VOICE",
					name: type,
					channel: message.guild.channels.cache.get(channel),
					scheduledStartTime: new Date(timestamp).toISOString(),
					scheduledEndTime: new Date(timestamp + 6000000).toISOString(),
					description: `🖥 Platforms:**${platforms}**\n\n*Subject to change*`
				});

				const pinned_message = await moderationChat.messages.fetch(ACTIVE_TESTING_REQUESTS);

				// Update the pinned message with the tests
				pinned_message.edit({
					content: `${pinned_message.content}\n\n> ${emoji}**${gameTitle}** <t:${
						timestamp / 1000
					}:F>\n> ${message.url}`
				});

				const notification = `Hey there ${member}, we've reviewed your request for **${gameTitle}** to be tested by our **${
					type.split(" ")[0]
				} team** on <t:${
					timestamp / 1000
				}:F> (Local Time) and have decided to approve the request, feel free to **contact** a staff member if you have any questions regarding your testing session.\n\nEvent URL:\nhttps://discord.com/${
					message.guild.id
				}/${testing_session.id}`;

				// Message the developer
				try {
					member.send(notification);
					discussionThread.send(
						`${user} The \`${type}\` for **${gameTitle}** has been scheduled for <t:${
							timestamp / 1000
						}:F>\nhttps://discord.com/events/${message.guild.id}/${testing_session.id}`
					);
				} catch {
					const channel = message.guild.channels.cache.get(config.channels.request);
					channel.threads
						.create({
							name: gameTitle,
							autoArchiveDuration: 1440, // 1 Day
							type: "GUILD_PRIVATE_THREAD",
							invitable: false,
							reason: "Unable to message author regarding a testing request."
						})
						.then(thread => {
							thread.send(notification);

							discussionThread.send(
								`${user} The \`${type}\` for **${gameTitle}** has been scheduled for <t:${
									timestamp / 1000
								}:F> (messaged the user through a private thread: <#${
									thread.id
								}>)\nhttps://discord.com/events/${message.guild.id}/${
									testing_session.id
								}`
							);
						});
				}

				message.react("912042941181227078");
			} catch {
				message.react("912837490585513994");
				await discussionThread.send(`${user} could not accept the test.`);
			}
		}
	}
};
