const Command = require("../modules/commands/command");

const { TESTING_REQUESTS, ACCELERATOR_SESSIONS, NDA_SESSIONS } = process.env;
const { ChannelType, GuildScheduledEventStatus } = require("discord.js");

module.exports = class RescheduleCommand extends Command {
	constructor(client) {
		super(client, {
			name: "reschedule",
			description: "Restart a session announcement timer",
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			manager_only: true,
			moderator_only: true,
			permissions: [],
			options: [
				{
					name: "type",
					description: "The type of announcement to re-add",
					required: true,
					type: Command.option_types.STRING,
					choices: [
						{
							name: "Notice Announcement",
							value: "notice"
						},
						{
							name: "Start Announcement",
							value: "start"
						},
						{
							name: "Concluding Announcement",
							value: "conclude"
						},
						{
							name: "All Announcements",
							value: "all"
						}
					]
				},
				{
					name: "message_id",
					description: "The message ID of the testing request",
					required: true,
					type: Command.option_types.STRING
				}
			]
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		const type = interaction.options.getString("type");
		const messageId = interaction.options.getString("message_id");

		const requestsChannel = await interaction.guild.channels.cache.get(TESTING_REQUESTS);
		const testingRequest = await requestsChannel.messages.fetch(messageId);

		// Check if the message exists
		if (!testingRequest) {
			interaction.reply({ content: "Could not find the request", ephemeral: true });
			return;
		}

		// Check if the message author is a bot
		if (!testingRequest.author.bot) {
			interaction.reply({ content: "The message must belong to the bot", ephemeral: true });
			return;
		}

		const timestampRegex = new RegExp(/⏰ <t:(\d+):F>/gims);
		const embed = testingRequest.embeds[0].data;

		// Information regarding the test
		const test = {
			name: embed.title,
			type: embed.author.name,
			prefix: embed.author.name.split(" ")[0].toLowerCase(),
			timestamp: timestampRegex.exec(embed.description)[1] * 1000
		};

		// Check whether the test is for accelerators
		if (embed.color === 0xe67e22 || embed.color === 0xffffff) test.prefix = "accelerator";

		// Get the event from already-scheduled eventss
		let testingSession;

		const events = interaction.guild.scheduledEvents.cache.map(event => ({
			startTimestamp: event.scheduledStartTimestamp,
			name: event.name,
			id: event.id
		}));

		events.forEach(event => {
			if (
				event.startTimestamp === test.timestamp &&
				(event.name === test.name || event.name === test.type)
			)
				testingSession = interaction.guild.scheduledEvents.cache.get(event.id);
		});

		// Only allow announcement rescheduling with pre-set events
		if (!testingSession) {
			interaction.reply({
				content: `There are no events for \`${test.name}\``,
				ephemeral: true
			});
			return;
		}

		// Configure the announcement channel
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

		announcementChannel = interaction.guild.channels.cache.get(announcementChannel);

		// prettier-ignore
		// Reschedule the chosen announcement(s)
		switch (type) {
			case "notice":
				if (global[`session_notice_${messageId}`]) {
					clearTimeout(global[`session_notice_${messageId}`]);
					delete global[`session_notice_${messageId}`];
				}

				noticeAnnouncement(testingSession, test, messageId, announcementChannel, embed);
				break;

			case "start":
				if (global[`session_start_${messageId}`]) {
					clearTimeout(global[`session_start_${messageId}`]);
					delete global[`session_start_${messageId}`];
				}

				startAnnouncement(testingSession, test, messageId, announcementChannel, embed);
				break;

			case "conclude":
				if (global[`session_conclude_${messageId}`]) {
					clearTimeout(global[`session_conclude_${messageId}`]);
					delete global[`session_conclude_${messageId}`];
				}

				concludeAnnouncement(testingSession, test, messageId, announcementChannel);
				break;

			default:
				if (global[`session_notice_${messageId}`]) {
					clearTimeout(global[`session_notice_${messageId}`]);
					delete global[`session_notice_${messageId}`];
				}

				if (global[`session_start_${messageId}`]) {
					clearTimeout(global[`session_start_${messageId}`]);
					delete global[`session_start_${messageId}`];
				}

				if (global[`session_conclude_${messageId}`]) {
					clearTimeout(global[`session_conclude_${messageId}`]);
					delete global[`session_conclude_${messageId}`];
				}

				noticeAnnouncement(testingSession, test, messageId, announcementChannel, embed);
				startAnnouncement(testingSession, test, messageId, announcementChannel, embed);
				concludeAnnouncement(testingSession, test, messageId, announcementChannel);

				interaction.reply({
					content: `**All announcements** for \`${test.name}\` have been rescheduled`,
					ephemeral: true
				});
				return;
		}

		interaction.reply({
			content: `The **${type} announcement** for \`${test.name}\` has been rescheduled`,
			ephemeral: true
		});
	}
};

//
//

// eslint-disable-next-line max-params
function noticeAnnouncement(testingSession, test, messageId, announcementChannel, embed) {
	global[`session_notice_${messageId}`] = setTimeout(
		() => {
			testingSession.setName(test.name);

			announcementChannel.send(
				embed.fields
					.filter(field => field.name.includes("Notice Template"))[0]
					.value.split("```")[1]
			);

			delete global[`session_notice_${messageId}`];
		},
		test.timestamp - Date.now() - 3600000 > 0 ? test.timestamp - Date.now() - 3600000 : 2000
	); // An hour before the start
}

// eslint-disable-next-line max-params
function startAnnouncement(testingSession, test, messageId, announcementChannel, embed) {
	global[`session_start_${messageId}`] = setTimeout(() => {
		testingSession.setStatus(GuildScheduledEventStatus.Active);

		announcementChannel
			.send(
				embed.fields
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

		delete global[`session_start_${messageId}`];
	}, test.timestamp - Date.now());
}

function concludeAnnouncement(testingSession, test, messageId, announcementChannel) {
	global[`session_conclude_${messageId}`] = setTimeout(() => {
		testingSession.setStatus(GuildScheduledEventStatus.Completed);

		announcementChannel.send(
			`Testing has concluded on **${test.name}**. Thank you all for attending!\n\nThe thread will remain open for all reports and feedback for the next hour from this message. Please get everything sent in by then!`
		);

		delete global[`session_conclude_${messageId}`];
	}, test.timestamp - Date.now() + 3600000);
}
