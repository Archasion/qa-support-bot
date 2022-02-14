const Command = require("../modules/commands/command");

const { NDA_SESSIONS, TESTING_REQUESTS, ACCELERATOR_CHAT_VC } = process.env;

module.exports = class SessionCommand extends Command {
	constructor(client) {
		super(client, {
			name: "session",
			description: "Manage session announcements",
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			permissions: [],
			manager_only: true,
			moderator_only: true,
			options: [
				{
					name: "action",
					description: "The action to perform",
					type: Command.option_types.STRING,
					required: true,
					choices: [
						{
							name: "Notice",
							value: "notice"
						},
						{
							name: "Start",
							value: "start"
						},
						{
							name: "Conclude",
							value: "conclude"
						}
					]
				},
				{
					name: "message_id",
					description: "The ID of the testing request",
					type: Command.option_types.STRING,
					required: true
				},
				{
					name: "create_thread",
					description: "Create a thread for the session",
					type: Command.option_types.BOOLEAN
				}
			]
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		const testingRequestID = interaction.options.getString("message_id");
		const requestsChannel = await interaction.guild.channels.cache.get(TESTING_REQUESTS);
		const testingRequest = await requestsChannel.messages.fetch(testingRequestID);

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

		const createThread = interaction.options.getBoolean("create_thread");
		let type = interaction.options.getString("action");

		// The type of announcement to make
		switch (type) {
			case "notice":
				type = "Notice Template";
				break;
			case "start":
				type = "Start Template";
				break;
			case "conclude":
				type = null;
				break;
		}

		const embed = testingRequest.embeds[0];
		let announcementChannel = null;

		// Check the type of the test
		switch (embed.author.name) {
			case "Public Test":
				announcementChannel = config.channels.sessions;
				break;
			case "NDA Test":
				announcementChannel = NDA_SESSIONS;
				break;
		}

		if (embed.color === 0xe67e22) {
			announcementChannel = ACCELERATOR_CHAT_VC;
		}

		// Check if the announcement channel is null
		if (!announcementChannel) {
			interaction.reply({ content: "Could not find the announcement channel", ephemeral: true });
		}

		announcementChannel = interaction.guild.channels.cache.get(announcementChannel);

		// Get the latest message in the announcement channel
		const fetch = await announcementChannel.messages.fetch({ limit: 1 });

		if (fetch.size > 0) {
			// Check if the announcement already exists
			if (fetch.first().content === announcement) {
				interaction.reply({
					content: "An announcement has already been sent for this session",
					ephemeral: true
				});
				return;
			}
		}

		let announcement = `Testing has concluded on **${embed.title}**. Thank you all for attending!\n\nThe thread will remain open for all reports and feedback for the next hour from this message. Please get everything sent in by then!`;

		try {
			// Get the announcement
			announcement = embed.fields
				.filter(
					field =>
						field.name.includes(type) &&
						field.name.slice(type.length + 4, -3) <= parseInt(Date.now() / 1000)
				)[0]
				.value.replaceAll("```", "");
		} catch {
			interaction.reply({
				content: "It is too early to post the anouncement",
				ephemeral: true
			});
			return;
		}

		// Send the announcement
		announcementChannel.send({ content: announcement }).then(async message => {
			// Check if a thread is requested for the start announcement
			if (type === "Start Template" && createThread) {
				await message.startThread({
					name: embed.title,
					autoArchiveDuration: 4320,
					type: "GUILD_PUBLIC_THREAD",
					reason: `Testing has begun for ${embed.title}`
				});
			}
		});

		// Send the confirmation message
		interaction.reply({ content: "Successfully sent the announcement", ephemeral: true });
	}
};
