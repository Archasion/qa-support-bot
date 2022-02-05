const Command = require("../modules/commands/command");

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
			nda_only: false,
			dev_only: false,
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

		const requests = await interaction.guild.channels.cache.get(config.channels.moderation.requests);
		const message = await requests.messages.fetch(message_id);

		if (!message) {
			interaction.reply({ content: "Could not find the request", ephemeral: true });
			return;
		}

		if (!message.author.bot) {
			interaction.reply({ content: "The message must belong to the bot", ephemeral: true });
			return;
		}

		const embed = message.embeds[0];
		let announcement_channel = null;

		switch (embed.author.name) {
			case "Public Test":
				announcement_channel = config.channels.public.sessions;
				break;
			case "NDA Test":
				announcement_channel = config.channels.nda.sessions;
				break;
		}

		announcement_channel = interaction.guild.channels.cache.get(announcement_channel);

		if (!announcement_channel) {
			interaction.reply({ content: "Could not find the announcement channel", ephemeral: true });
		}

		let announcement = `Testing has concluded on **${embed.title}**. Thank you all for attending!\n\nThe thread will remain open for all reports and feedback for the next hour from this message. Please get everything sent in by then!`;

		if (type) {
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
		}

		const fetch = await announcement_channel.messages.fetch({ limit: 1 });

		if (fetch.first().content === announcement) {
			interaction.reply({
				content: "An announcement has already been sent for this session",
				ephemeral: true
			});
			return;
		}

		announcement_channel.send({ content: announcement }).then(async message => {
			if (type === "Start Template" && create_thread) {
				await message.startThread({
					name: embed.title,
					autoArchiveDuration: 120,
					type: "GUILD_PUBLIC_THREAD",
					reason: `Testing has begun for ${embed.title}`
				});
			}
		});

		interaction.reply({ content: "Successfully sent the announcement", ephemeral: true });
	}
};
