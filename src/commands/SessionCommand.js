const Command = require("../modules/commands/command");

const { NDA_SESSIONS, TESTING_REQUESTS } = process.env;

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
							name: "Notice (Pre-Announcement)",
							value: "notice"
						},
						{
							name: "Start (Start of Test)",
							value: "start"
						},
						{
							name: "Conclude (End of Test)",
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
				},
				{
					name: "form_url",
					description: "Add a URL to a form if the developer requests one",
					type: Command.option_types.STRING
				},
				{
					name: "force_announce",
					description: "Bypass the announcement time restriction.",
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
		const forceAnnounce = interaction.options.getBoolean("force_announce");
		const testingRequestID = interaction.options.getString("message_id");
		const formURL = interaction.options.getString("form_url");
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

		if (type === "notice" && forceAnnounce) {
			interaction.reply({
				content:
					"Please announce manually, forced notice announcements will have incorrect timestamps.",
				ephemeral: true
			});
			return;
		}

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

		let announcement = `Testing has concluded on **${embed.title}**. Thank you all for attending!\n\nThe thread will remain open for all reports and feedback for the next hour from this message. Please get everything sent in by then!`;

		// Check whether it is too early to post the announcement
		if (type) {
			try {
				// Get the announcement
				announcement = embed.fields;
				if (!forceAnnounce) {
					announcement = announcement
						.filter(
							field =>
								field.name.includes(type) &&
								field.name.slice(type.length + 4, -3) <= parseInt(Date.now() / 1000)
						)[0]
						.value.split("```")[1];
				} else {
					announcement = announcement
						.filter(field => field.name.includes(type))[0]
						.value.split("```")[1];
				}
			} catch {
				interaction.reply({
					content: "It is too early to post the anouncement",
					ephemeral: true
				});
				return;
			}
		}

		// Check the type of the test
		switch (embed.author.name) {
			case "Public Test":
				announcementChannel = config.channels.sessions;
				break;
			case "NDA Verified Test":
				announcementChannel = NDA_SESSIONS;
				break;
		}

		// Check if the announcement channel is null
		if (!announcementChannel) {
			interaction.reply({ content: "Could not find the announcement channel", ephemeral: true });
		}

		announcementChannel = interaction.guild.channels.cache.get(announcementChannel);

		if (formURL && type === "Start Template") {
			announcement += `\n\nReport Bugs/Feedback Here:\n${formURL}`;
		}

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

		// Send the announcement
		announcementChannel.send({ content: announcement }).then(async message => {
			message.react("284099057348247562"); // Thumbs up
			// Check if a thread is requested for the start announcement
			if (type === "Start Template" && createThread) {
				await message.startThread({
					name: embed.title,
					autoArchiveDuration: 4320, // 3 Days
					type: "GUILD_PUBLIC_THREAD",
					reason: `Testing has begun for ${embed.title}`
				});
			}
		});

		// Role developer
		let member;
		let roleMessage = "";
		if (type === "Start Template") {
			// Fetch the game developer
			if (embed.color === 0xe67e22 || embed.color === 0xffffff) {
				const userIDRegex = new RegExp(/<@!?(\d{17,19})>/gims);
				const userID = userIDRegex.exec(embed.fields[0].value)[1];

				member = await testingRequest.guild.members.fetch(userID);
			} else {
				const usernameRegex = new RegExp(/Username:\s@?([\w\d_]+),/gims);
				const username = usernameRegex.exec(embed.footer.text)[1];

				member = await testingRequest.guild.members.search({ query: username });
				member = await member.first();
			}
		}

		if (member) {
			member.roles.add(config.roles.developer);
			roleMessage = `\nThe developer role has been added to ${member}`;
		}

		// Send the confirmation message
		interaction.reply({
			content: `Successfully sent the announcement${roleMessage}`,
			ephemeral: true
		});
	}
};
