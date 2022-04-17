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

// Regex
const descriptionRegex = new RegExp(/<t:(?<timestamp>\d+):F>\n> 🖥(?<platforms>.+)/gims);
const usernameRegex = new RegExp(/Username: @?([\w\d_]{3,20}),/gims);
const userIdRegex = new RegExp(/<@!?(\d{17,19})>/gims);

module.exports = class MessageReactionAddEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "messageReactionAdd" });
	}

	async execute(reaction, user) {
		let { message, emoji } = reaction;
		message = await message.channel.messages.fetch(message.id);

		const moderationChat = message.guild.channels.cache.get(MODERATION_CHAT);
		const testingRequests = message.guild.channels.cache.get(TESTING_REQUESTS);
		const discussionThread = testingRequests.threads.cache.get(REQUEST_DISCUSSION_THREAD);

		const alertThread = await moderationChat.threads.fetch(MODERATION_ALERTS);
		const member = await message.guild.members.fetch(user.id);

		switch (emoji.name) {
			case "📅": // Create event and message developer
			case "📆":
			case "🗓️":
				if (message.channel.id !== TESTING_REQUESTS) return;
				if (!(await utils.isStaff(member))) return;
				if (!message.author.bot) return;
				if (member.bot) return;

				createEvent(message);
				break;

			case "⚠️": // Notify staff
				if (!(await utils.isNDA(member))) return;
				if (await utils.isStaff(await message.guild.members.fetch(message.author.id))) return;
				if (message.author.id === user.id) return;
				if (message.author.bot) return;
				if (member.bot) return;

				notifyStaff();
				break;
		}

		/**
		 * Notify staff of a pontentially rule breaking message
		 * @returns {Promise<void>}
		 */

		async function notifyStaff() {
			// prettier-ignore
			const cooldownCheck = alertThread.messages.cache.filter(
				alertMessage =>
					(alertMessage.embeds[0] ? alertMessage.embeds[0].data.footer.text.includes(message.author.id) : false) &&
					alertMessage.createdTimestamp > Date.now() - 600000 &&
					alertMessage.author.bot
			);

			if (cooldownCheck.first()) return; // Not used in the last 10 minutes on the same user

			const alert = new EmbedBuilder()

				.setAuthor({
					name: `Reported against ${message.author.tag} (${message.author.id})`,
					iconURL: message.author.displayAvatarURL({ dynamic: true })
				})
				.addFields({
					name: "Message Content",
					value: `\`\`\`${message.content}\`\`\``
				})
				.setFooter({
					text: `Reported by ${user.tag} (${user.id})`,
					iconURL: user.displayAvatarURL({ dynamic: true })
				})

				.setColor(config.colors.default)
				.setTimestamp();

			// Quick action buttons
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

			const jumpToMessage = new ActionRowBuilder().addComponents(
				new ButtonBuilder({})
					.setURL(message.url)
					.setLabel("Jump to Message")
					.setStyle(ButtonStyle.Link)
			);

			// Alert staff
			alertThread.send({
				content: "@here",
				embeds: [alert],
				components: [quickActions, jumpToMessage]
			});
		}

		/**
		 * Schedule the testing session
		 * Schedule automated announcements
		 * Notify the developer
		 * @returns {Promise<void>}
		 */

		// Create event for the testing request
		async function createEvent(message) {
			try {
				const request = message.embeds[0].data;

				const { groups } = descriptionRegex.exec(request.description);
				const { timestamp, platforms } = groups;

				// Session properties
				const session = {
					name: request.title,
					type: request.author.name,
					prefix: request.author.name.split(" ")[0].toLowerCase(),
					timestamp: timestamp * 1000,
					platforms
				};

				if (request.color === 0xe67e22 || request.color === 0xffffff)
					session.prefix = "accelerator";

				// Map every event's start time, name and ID
				const events = message.guild.scheduledEvents.cache.map(event => ({
					start: event.scheduledStartTimestamp,
					name: event.name,
					id: event.id
				}));

				let duplicateCheck = false;

				// prettier-ignore
				// Check whether the event already exists
				await events.forEach(event => {
					if ((event.name === session.type || event.name === session.name) && event.start === session.timestamp) {
						// String Builder
						const description = [];

						description.push(`${user}`);
						description.push(`Test already scheduled for <t:${session.timestamp / 1000}:F>\n`);
						description.push(`https://discord.com/events/${message.guild.id}/${event.id}`);

						duplicateCheck = true;

						discussionThread.send(description.join(""));
						reaction.remove();
					}
				});

				if (duplicateCheck) return;

				let testingVoiceChat = config.vcs.testing;
				let cosmeticEmoji = "";

				// Set the cosmetic emoji and the testing voice chat (store accelerator test in the database if applicable)
				if (session.prefix === "accelerator") {
					await Tests.create({
						name: session.name,
						url: request.url,
						type: session.prefix,
						date: new Date(session.timestamp)
					});

					testingVoiceChat = ACCELERATOR_TESTING_VC;
					cosmeticEmoji = "<:accelerator:941804781830283396> ";
				} else if (session.prefix === "nda") {
					testingVoiceChat = NDA_TESTING_VC;
					cosmeticEmoji = "<:nda:905799212350992475> ";
				}

				// Store the test in the database
				await Tests.create({
					name: session.name,
					type: session.prefix,
					url: request.url,
					date: new Date(session.timestamp)
				});

				// Create the event
				const sessionEvent = await message.guild.scheduledEvents.create({
					name: session.type,
					entityType: ChannelType.GuildVoice,
					privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,

					channel: message.guild.channels.cache.get(testingVoiceChat),
					scheduledStartTime: new Date(session.timestamp).toISOString(),
					scheduledEndTime: new Date(session.timestamp + 3600000).toISOString(),

					description: `Platforms:**${session.platforms}**\n\n*Subject to change*`
				});

				const pinnedMessage = await testingRequests.messages.fetch(ACTIVE_TESTING_REQUESTS);

				// String Builder
				const updatedPinnedMessage = [];

				updatedPinnedMessage.push(`${pinnedMessage.content}\n\n`);
				updatedPinnedMessage.push(`> ${cosmeticEmoji}**${session.name}** `);
				updatedPinnedMessage.push(`<t:${session.timestamp / 1000}:F>\n`);
				updatedPinnedMessage.push(`> ${message.url}`);

				// Update the pinned message with the tests
				pinnedMessage.edit({ content: updatedPinnedMessage.join("") });

				let developer;

				// String Builder
				let directMessage = [];

				// prettier-ignore
				directMessage.push("we've reviewed your request for ");
				directMessage.push(`**${session.name}** to be tested by our `);
				directMessage.push(`**${session.type.split(" ")[0]} Team** on `);
				directMessage.push(`<t:${session.timestamp / 1000}:F> `);
				directMessage.push("(Local Time) and have decided to approve the request. ");
				directMessage.push("Feel free to **contact** a staff member if you have any questions.");
				directMessage.push("\n\nEvent URL:\n");
				directMessage.push(`https://discord.com/events/${message.guild.id}/${sessionEvent.id}`);

				// String Builder
				const confirmation = [];

				confirmation.push(`${user} The \`${session.type}\` `);
				confirmation.push(`for **${session.name}** has been scheduled for`);
				confirmation.push(`<t:${session.timestamp / 1000}:F>\n`);
				confirmation.push(`https://discord.com/events/${message.guild.id}/${sessionEvent.id}`);

				// Fetch the and message the developer
				try {
					// Get user from field
					if (session.prefix === "accelerator") {
						const userId = userIdRegex.exec(request.fields[0].value)[1];

						if (!userId) throw new Error("No user ID found");
						developer = await message.guild.members.fetch(userId);
					}

					// Get user from footer
					else {
						const username = usernameRegex.exec(request.footer.text)[1];

						if (!username) throw new Error("No username found");

						developer = await message.guild.members.search({ query: username });
						developer = await developer.first();
					}

					directMessage = [`Hey there ${developer}, `, ...directMessage];

					discussionThread.send(confirmation.join(""));
					developer.send(directMessage.join(""));

					// Managed to message developer
					message.react("912042941181227078").catch(() => message.react("✅"));
				} catch (error) {
					// The user exists but couldn't be messaged
					if (error.message !== "No user ID found" && error.message !== "No username found") {
						const requestChannel = message.guild.channels.cache.get(config.channels.request);

						requestChannel.threads
							.create({
								name: session.name,
								autoArchiveDuration: 1440, // 1 Day
								type: ChannelType.GuildPrivateThread,
								invitable: false,
								reason: "Unable to message author regarding a testing request."
							})
							.then(thread => thread.send(directMessage));
					}

					// Cannot message developer
					message.react("912837490585513994").catch(() => message.react("❌"));
				}

				// Set the announcement channel based on the session type
				let announcementChannel;

				switch (session.type) {
					case "Public Test":
						announcementChannel = config.channels.sessions;
						break;
					case "NDA Verified Test":
						announcementChannel = NDA_SESSIONS;
						break;
				}

				if (session.prefix === "accelerator") announcementChannel = ACCELERATOR_SESSIONS;
				announcementChannel = message.guild.channels.cache.get(announcementChannel);

				// prettier-ignore
				// Schedule the notice announcement
				global[`session_notice_${message.id}`] = setTimeout(() => {
					sessionEvent.setName(session.name);

					announcementChannel.send(request.fields
						.filter(field => field.name.includes("Notice Template"))[0]
						.value.split("```")[1]);

					delete global[`session_notice_${message.id}`];
				}, session.timestamp - Date.now() - 3600000 > 0 ? session.timestamp - Date.now() - 3600000 : 2000); // An hour before the start

				// prettier-ignore
				// Schedule the starting announcement
				global[`session_start_${message.id}`] = setTimeout(() => {
					sessionEvent.setStatus(GuildScheduledEventStatus.Active);

					announcementChannel.send(request.fields
						.filter(field => field.name.includes("Start Template"))[0]
						.value.split("```")[1])

						.then(async msg => {
							msg.react("284099057348247562"); // Thumbs up

							await msg.startThread({
								name: session.name,
								autoArchiveDuration: 4320, // 3 Days
								type: ChannelType.GuildPublicThread,
								reason: `Testing has begun for ${session.name}`
							});
						});

					delete global[`session_start_${message.id}`];
				}, session.timestamp - Date.now());

				// prettier-ignore
				// Schedule the concluding announcement
				global[`session_conclude_${message.id}`] = setTimeout(() => {
					sessionEvent.setStatus(GuildScheduledEventStatus.Completed);

					announcementChannel.send(
						`Testing has concluded on **${session.name}**. Thank you all for attending!\n\nThe thread will remain open for all reports and feedback for the next hour from this message. Please get everything sent in by then!`
					);

					delete global[`session_conclude_${message.id}`];
				}, session.timestamp - Date.now() + 3600000);
			} catch (error) {
				reaction.remove();

				// prettier-ignore
				if (error.message.includes("Cannot schedule event in the past")) {
					discussionThread.send(`${user} could not accept the request because it is in the past.`);
					return;
				}

				console.log(error);
				discussionThread.send(`${user} could not accept the test.`);
			}
		}
	}
};
