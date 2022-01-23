const { MessageEmbed } = require("discord.js");
const Command = require("../modules/commands/command");

const yaml = require("js-yaml");
const fs = require("fs");

const { path } = require("./../utils/fs");

const fileContents = fs.readFileSync(path("/src/tags.yaml"), "utf8");
const tags = yaml.load(fileContents);

module.exports = class EvalCommand extends Command {
	constructor(client) {
		super(client, {
			name: "tag",
			description: "Reply with the answer to a common question",
			permissions: [],
			manager_only: true,
			moderator_only: true,
			nda_only: true,
			dev_only: false,
			options: [
				{
					name: "keyword",
					description: "The keyword for the question",
					required: true,
					type: Command.option_types.STRING,
					choices: tags.choices
				},
				{
					description: "Mention a user in the message (nothing by default)",
					name: "targeted_user",
					required: false,
					type: Command.option_types.USER
				}
			]
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		const check = await interaction.channel.messages
			.fetch()
			.then(messages =>
				messages.filter(
					message =>
						message.type === "APPLICATION_COMMAND" &&
						(message.embeds[0]
							? message.embeds[0].footer
								? message.embeds[0].footer.text.includes("Invoked by")
								: message.embeds[0]
							: message.embeds[0]) &&
						message.createdTimestamp > Date.now() - 60000
				)
			);

		if (check.first()) {
			interaction.reply({
				content: "The command has already been used by someone less than 1 minute ago",
				ephemeral: true
			});
			return;
		}

		const keyword = interaction.options.getString("keyword").toLowerCase();
		const target = interaction.options.getUser("targeted_user");

		try {
			interaction.reply({
				content: target ? `${target}` : null,
				embeds: [
					new MessageEmbed()
						.setColor(config.colors.default_color)
						.setDescription(tags[keyword])
						.setFooter({
							text: `Invoked by ${interaction.member.displayName}`,
							iconURL: interaction.user.avatarURL()
						})
				]
			});
		} catch {
			interaction.reply({
				content: `Invalid keyword: \`${keyword}\``,
				ephemeral: true
			});
		}
	}
};
