const Command = require("../modules/commands/command");

const { TESTING_REQUESTS } = process.env;

module.exports = class CancelCommand extends Command {
	constructor(client) {
		super(client, {
			name: "cancel",
			description: "Cancel a pending announcement",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			moderator_only: true,
			manager_only: true,
			options: [
				{
					name: "type",
					description: "Which type of pending announcement to cancel",
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
					description: "The message ID belonging to the testing request",
					name: "message_id",
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

		const name = testingRequest.embeds[0].data.title;

		switch (type) {
			case "all":
				if (
					!global[`session_notice_${messageId}`] &&
					!global[`session_start_${messageId}`] &&
					!global[`session_conclude_${messageId}`]
				) {
					interaction.reply({
						content: `\`${name}\` does not have any scheduled announcements`,
						ephemeral: true
					});
					return;
				}

				clearTimeout(global[`session_notice_${messageId}`]);
				clearTimeout(global[`session_start_${messageId}`]);
				clearTimeout(global[`session_conclude_${messageId}`]);

				delete global[`session_notice_${messageId}`];
				delete global[`session_start_${messageId}`];
				delete global[`session_conclude_${messageId}`];

				break;

			case "notice":
				if (!global[`session_notice_${messageId}`]) {
					interaction.reply({
						content: `\`${name}\` does not have scheduled notice announcement`,
						ephemeral: true
					});
					return;
				}

				clearTimeout(global[`session_notice_${messageId}`]);
				delete global[`session_notice_${messageId}`];
				break;

			case "start":
				if (!global[`session_start_${messageId}`]) {
					interaction.reply({
						content: `\`${name}\` does not have scheduled start announcement`,
						ephemeral: true
					});
					return;
				}

				clearTimeout(global[`session_start_${messageId}`]);
				delete global[`session_start_${messageId}`];
				break;

			case "conclude":
				if (!global[`session_conclude_${messageId}`]) {
					interaction.reply({
						content: `\`${name}\` does not have scheduled concluding announcement`,
						ephemeral: true
					});
					return;
				}

				clearTimeout(global[`session_conclude_${messageId}`]);
				delete global[`session_conclude_${messageId}`];
				break;
		}

		if (type === "all") {
			interaction.reply({
				content: `**All announcements** have been cleared for \`${name}\``,
				ephemeral: true
			});
			return;
		}

		interaction.reply({
			content: `The **${type} announcement** have been cleared for \`${name}\``,
			ephemeral: true
		});
	}
};
