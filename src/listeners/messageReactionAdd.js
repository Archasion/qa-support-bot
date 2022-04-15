const EventListener = require("../modules/listeners/listener");
const Tests = require("./../mongodb/models/tests");

const {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	GuildScheduledEventPrivacyLevel,
	GuildScheduledEventStatus
} = require("discord.js");

const {
	TESTING_REQUESTS,
	MODERATION_CHAT,
	ACTIVE_TESTING_REQUESTS,
	NDA_TESTING_VC,
	ACCELERATOR_TESTING_VC,
	MODERATION_ALERTS,
	REQUEST_DISCUSSION_THREAD,
	ACCELERATOR_SESSIONS,
	NDA_SESSIONS
} = process.env;

module.exports = class MessageReactionAddEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "messageReactionAdd" });
	}

	async execute(reaction, user) {
		let { message, emoji } = reaction;
		message = await message.channel.messages.fetch(message.id);

		const moderationChat = message.guild.channels.cache.get(MODERATION_CHAT);
		const testingRequests = message.guild.channels.cache.get(TESTING_REQUESTS);
		const alertThread = await moderationChat.threads.fetch(MODERATION_ALERTS);
		const guildMember = await message.guild.members.fetch(user.id);

		const discussionThread = message.guild.channels.cache
			.get(TESTING_REQUESTS)
			.threads.cache.get(REQUEST_DISCUSSION_THREAD);

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

				const check = alertThread.messages.cache.filter(
					alert_message =>
						(alert_message.embeds[0]
							? alert_message.embeds[0].data.footer.text.includes(message.author.id)
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
			const embed = new EmbedBuilder()

				.setColor(config.colors.default)
				.setAuthor({
					name: `Reported against ${message.author.tag} (${message.author.id})`,
					iconURL: message.author.displayAvatarURL({ dynamic: true })
				})
				.addFields({ name: "Message Content", value: `\`\`\`${message.content}\`\`\`` })
				.setFooter({
					text: `Reported by ${user.tag} (${user.id})`,
					iconURL: user.displayAvatarURL({ dynamic: true })
				})
				.setTimestamp();

			// Moderation buttons
			const quickActions = new ActionRowBuilder().addComponents(
				new ButtonBuilder({})
					.setCustomId("delete_message")
					.setLabel("Mark as Resolved")
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder({})
					.setCustomId("10_timeout_mod_alert")
					.setLabel("Timeout [10m]")
					.setStyle(ButtonStyle.Danger),
				new ButtonBuilder({})
					.setCustomId("30_timeout_mod_alert")
					.setLabel("Timeout [30m]")
					.setStyle(ButtonStyle.Danger)
			);

			const messageURL = new ActionRowBuilder().addComponents(
				new ButtonBuilder({})
					.setURL(message.url)
					.setLabel("Jump to Message")
					.setStyle(ButtonStyle.Link)
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
				const embed = message.embeds[0].data;

				const timestampRegex = new RegExp(/⏰ <t:(\d+):F>/gims);
				const platformRegex = new RegExp(/🖥(.+)/gims);

				const test = {
					name: embed.title,
					type: embed.author.name,
					prefix: embed.author.name.split(" ")[0].toLowerCase(),
					timestamp: timestampRegex.exec(embed.description)[1] * 1000,
					platforms: platformRegex.exec(embed.description)[1]
				};

				if (embed.color === 0xe67e22 || embed.color === 0xffffff) test.prefix = "accelerator";

				// Check if the event exists
				const events = message.guild.scheduledEvents.cache.map(event => ({
					startTime: event.scheduledStartTimestamp,
					name: event.name,
					id: event.id
				}));

				let check = false;

				// prettier-ignore
				// Respond if the event exists
				await events.forEach(event => {
					if ((event.name === test.type || event.name === test.name) && event.startTime === test.timestamp) {
						discussionThread.send(`${user} Test already scheduled for <t:${test.timestamp / 1000}:F>\nhttps://discord.com/events/${message.guild.id}/${event.id}`);
						reaction.remove();
						check = true;
					}
				});

				if (check) return;

				let testingVoiceChat = config.vcs.testing;
				let cosmeticEmoji = "";

				// Set the emoji and store the test in the database
				if (test.prefix === "accelerator") {
					await Tests.create({
						name: test.name,
						type: test.prefix,
						url: embed.url,
						date: new Date(test.timestamp)
					});

					testingVoiceChat = ACCELERATOR_TESTING_VC;
					cosmeticEmoji = "<:accelerator:941804781830283396> ";
				} else if (test.prefix === "nda") {
					testingVoiceChat = NDA_TESTING_VC;
					cosmeticEmoji = "<:nda:905799212350992475> ";
				}

				// Store the test in the database
				await Tests.create({
					name: test.name,
					type: test.prefix,
					url: embed.url,
					date: new Date(test.timestamp)
				});

				// Create the event
				const testingSession = await message.guild.scheduledEvents.create({
					privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
					entityType: ChannelType.GuildVoice,
					name: test.type,
					channel: message.guild.channels.cache.get(testingVoiceChat),
					scheduledStartTime: new Date(test.timestamp).toISOString(),
					scheduledEndTime: new Date(test.timestamp + 3600000).toISOString(),
					description: `🖥 Platforms:**${test.platforms}**\n\n*Subject to change*`
				});

				const pinnedMessage = await testingRequests.messages.fetch(ACTIVE_TESTING_REQUESTS);

				// prettier-ignore
				// Update the pinned message with the tests
				pinnedMessage.edit({
					content: `${pinnedMessage.content}\n\n> ${cosmeticEmoji}**${test.name}** <t:${test.timestamp / 1000}:F>\n> ${message.url}`
				});

				let member;

				// Fetch the game developer
				if (test.prefix === "accelerator") {
					const userIdRegex = new RegExp(/<@!?(\d{17,19})>/gims);
					const userId = userIdRegex.exec(embed.fields[0].value)[1];

					member = await message.guild.members.fetch(userId);
				} else {
					const usernameRegex = new RegExp(/Username:\s@?([\w\d_]+),/gims);
					const username = usernameRegex.exec(embed.footer.text)[1];

					member = await message.guild.members.search({ query: username });
					member = await member.first();
				}

				// No member found
				if (!member) {
					message.react("912837490585513994");
					return;
				}

				const directMessage = `Hey there ${member}, we've reviewed your request for **${
					test.name
				}** to be tested by our **${test.type.split(" ")[0]} team** on <t:${
					test.timestamp / 1000
				}:F> (Local Time) and have decided to approve the request, feel free to **contact** a staff member if you have any questions regarding your testing session.\n\nEvent URL:\nhttps://discord.com/events/${
					message.guild.id
				}/${testingSession.id}`;

				// prettier-ignore
				// Try to message the developer
				try {
					member.send(directMessage);
					discussionThread.send(`${user} The \`${test.type}\` for **${test.name}** has been scheduled for <t:${test.timestamp / 1000}:F>\nhttps://discord.com/events/${message.guild.id}/${testingSession.id}`);
				} catch {
					const channel = message.guild.channels.cache.get(config.channels.request);

					channel.threads
						.create({
							name: test.name,
							autoArchiveDuration: 1440, // 1 Day
							type: ChannelType.GuildPrivateThread,
							invitable: false,
							reason: "Unable to message author regarding a testing request."
						})
						.then(thread => {
							thread.send(directMessage);

							discussionThread.send(
								`${user} The \`${test.type}\` for **${
									test.name
								}** has been scheduled for <t:${
									test.timestamp / 1000
								}:F> (messaged the user through a private thread: <#${
									thread.id
								}>)\nhttps://discord.com/events/${message.guild.id}/${testingSession.id}`
							);
						});
				}

				// // Success
				message.react("912042941181227078");

				// Automatically send announcements
				let announcementChannel;

				switch (test.type) {
					case "Public Test":
						announcementChannel = config.channels.sessions;
						break;
					case "NDA Verified Test":
						announcementChannel = NDA_SESSIONS;
						break;
				}

				if (test.prefix === "accelerator") {
					announcementChannel = ACCELERATOR_SESSIONS;
				}

				announcementChannel = message.guild.channels.cache.get(announcementChannel);

				// prettier-ignore
				// NOTICE
				global[`session_notice_${message.id}`] = setTimeout(() => {
					testingSession.setName(test.name);

					announcementChannel.send(embed.fields
						.filter(field => field.name.includes("Notice Template"))[0]
						.value.split("```")[1]);

					delete global[`session_notice_${message.id}`];
				}, test.timestamp - Date.now() - 3600000 > 0 ? test.timestamp - Date.now() - 3600000 : 2000); // An hour before the start

				// prettier-ignore
				// START
				global[`session_start_${message.id}`] = setTimeout(() => {
					testingSession.setStatus(GuildScheduledEventStatus.Active);

					announcementChannel.send(embed.fields
						.filter(field => field.name.includes("Start Template"))[0]
						.value.split("```")[1]
					)
						.then(async msg => {
							// msg.react("284099057348247562"); // Thumbs up
							await msg.startThread({
								name: test.name,
								autoArchiveDuration: 4320, // 3 Days
								type: ChannelType.GuildPublicThread,
								reason: `Testing has begun for ${test.name}`
							});
						});

					delete global[`session_start_${message.id}`];
				}, test.timestamp - Date.now());

				// prettier-ignore
				// CONCLUDE
				global[`session_conclude_${message.id}`] = setTimeout(() => {
					testingSession.setStatus(GuildScheduledEventStatus.Completed);

					announcementChannel.send(
						`Testing has concluded on **${test.name}**. Thank you all for attending!\n\nThe thread will remain open for all reports and feedback for the next hour from this message. Please get everything sent in by then!`
					);

					delete global[`session_conclude_${message.id}`];
				}, test.timestamp - Date.now() + 3600000);

				//
			} catch (error) {
				console.log(error);
				message.react("912837490585513994");
				await discussionThread.send(`${user} could not accept the test.`);
			}
		}
	}
};
