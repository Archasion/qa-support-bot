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
		const message_id = interaction.options.getString("message_id");
		const requests = await interaction.guild.channels.cache.get(TESTING_REQUESTS);
		const message = await requests.messages.fetch(message_id);

		if (!message) {
			interaction.reply({ content: "Could not find the request", ephemeral: true });
			return;
		}

		if (message.channel.id !== TESTING_REQUESTS) {
			interaction.reply({ content: "The message must be a testing request", ephemeral: true });
			return;
		}

		if (!message.author.bot) {
			interaction.reply({ content: "The message must belong to the bot", ephemeral: true });
			return;
		}

		const create_thread = interaction.options.getBoolean("create_thread");

		let type = interaction.options.getString("action");

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

		const embed = message.embeds[0];
		let announcement_channel = null;

		switch (embed.author.name) {
			case "Public Test":
				announcement_channel = config.channels.sessions;
				break;
			case "NDA Test":
				announcement_channel = NDA_SESSIONS;
				break;
		}

		if (embed.color === 0xe67e22) {
			announcement_channel = ACCELERATOR_CHAT_VC;
		}

		announcement_channel = interaction.guild.channels.cache.get(announcement_channel);

		if (!announcement_channel) {
			interaction.reply({ content: "Could not find the announcement channel", ephemeral: true });
		}

		const fetch = await announcement_channel.messages.fetch({ limit: 1 });

		if (fetch.size > 0) {
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

		announcement_channel.send({ content: announcement }).then(async message => {
			if (type === "Start Template" && create_thread) {
				await message.startThread({
					name: embed.title,
					autoArchiveDuration: 4320,
					type: "GUILD_PUBLIC_THREAD",
					reason: `Testing has begun for ${embed.title}`
				});
			}
		});

		interaction.reply({ content: "Successfully sent the announcement", ephemeral: true });
	}
};
