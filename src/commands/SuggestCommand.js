const Command = require("../modules/commands/command");
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
			verified_only: true,
			options: [
				{
					name: "type",
					description: "The type of suggestion you'd like to create",
					required: true,
					type: Command.option_types.STRING,
					choices: [
						{
							name: "QA Utility Bot Feedback",
							value: "bot test"
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
				channel = interaction.guild.members.cache.get(config.users.developers[0]);
				type = "QA Utility Bot Feedback";
				break;
		}

		const embed = new MessageEmbed()

			.setColor(config.colors.default)
			.setAuthor({
				name: `${interaction.author.tag} (${interaction.member.displayName})`,
				iconURL: interaction.author.displayAvatarURL({ dynamic: true })
			})
			.setTitle(type)
			.setDescription(suggestion)
			.setFooter({ text: `ID: ${interaction.author.id}` })
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
