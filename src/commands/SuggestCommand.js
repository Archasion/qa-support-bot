const Command = require("../modules/commands/command");

const { MODERATION_CHAT, BOT_FEEDBACK } = process.env;
const { MessageEmbed } = require("discord.js");

module.exports = class SuggestCommand extends Command {
	constructor(client) {
		super(client, {
			name: "suggest",
			description: "Suggest any additions, removals, or changes",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			public_only: true,
			options: [
				{
					name: "type",
					description: "The type of suggestion you'd like to create",
					required: true,
					type: Command.option_types.STRING,
					choices: [
						{
							name: "QA Utility Bot Feedback",
							value: "bot"
						}
					]
				},
				{
					description: "Your suggestion",
					name: "suggestion",
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
		const suggestion = interaction.options.getString("suggestion");

		let type = interaction.options.getString("type");
		let channel;

		// Configuring the properties to meet the suggestion type
		switch (type) {
			case "bot":
				channel = interaction.guild.channels.cache
					.get(MODERATION_CHAT)
					.threads.cache.get(BOT_FEEDBACK);

				type = "QA Utility Bot Feedback";
				break;
		}

		const embed = new MessageEmbed()

			.setColor(config.colors.default)
			.setAuthor({
				name: `${interaction.user.tag} (${interaction.member.displayName})`,
				iconURL: interaction.member.displayAvatarURL({ dynamic: true })
			})
			.setTitle(type)
			.setDescription(suggestion)
			.setFooter({ text: `ID: ${interaction.user.id}` })
			.setTimestamp();

		// Send the suggestion
		try {
			channel.send({ embeds: [embed] });

			interaction.reply({
				content:
					"We have received your feedback, thank you for trying to help us improve the community!",
				ephemeral: true
			});
		} catch {
			interaction.reply({
				content: `An error has occured while the bot was trying to process the suggestion, please contact a <@${config.roles.moderator}> or a <@${config.roles.manager}> if this keeps happening`,
				ephemeral: true
			});
		}
	}
};
