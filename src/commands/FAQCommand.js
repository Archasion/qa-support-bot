const Command = require("../modules/commands/command");
const yaml = require("js-yaml");
const fs = require("fs");

const { MessageEmbed } = require("discord.js");
const { path } = require("../utils/fs");

const fileContents = fs.readFileSync(path("/src/tags.yaml"), "utf8");
const tags = yaml.load(fileContents);

module.exports = class FAQCommand extends Command {
	constructor(client) {
		super(client, {
			name: "faq",
			description: "Reply with the answer to a common question",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			cooldown: 5,
			public_only: true,
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
		const keyword = interaction.options.getString("keyword").toLowerCase();
		const target = interaction.options.getUser("targeted_user");
		const publicMessage =
			((await utils.isActive(interaction.member)) || (await utils.isNDA(interaction.member))) &&
			target;

		try {
			// Send the FAQ message (content from tags.yaml)
			interaction.reply({
				content: publicMessage ? `${target}` : null,
				embeds: [
					new MessageEmbed()
						.setColor(config.colors.default)
						.setDescription(tags[keyword])
						.setFooter({
							text: `Invoked by ${interaction.member.displayName}`,
							iconURL: interaction.user.avatarURL()
						})
				],
				ephemeral: !publicMessage
			});
		} catch {
			interaction.reply({
				content: `Invalid keyword: \`${keyword}\``,
				ephemeral: true
			});
		}
	}
};
