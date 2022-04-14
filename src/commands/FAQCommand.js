const Command = require("../modules/commands/command");
const tags = require("../tags.json");

const { EmbedBuilder, SelectMenuBuilder, ActionRowBuilder } = require("discord.js");

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
		const target = interaction.options.getUser("targeted_user");
		const keyword = interaction.options.getString("keyword");
		const publicMessage =
			((await utils.isActive(interaction.member)) || (await utils.isNDA(interaction.member))) &&
			target;

		const embed = new EmbedBuilder()

			.setColor(config.colors.default)
			.setDescription(tags[keyword])
			.setFooter({
				text: `Invoked by ${interaction.member.displayName}`,
				iconURL: interaction.user.avatarURL()
			});

		const options = [];

		tags.choices.forEach(option => {
			options.push({
				label: option["name"],
				value: option["value"]
			});
		});

		const selectMenu = new SelectMenuBuilder({ options: [] })

			.setCustomId("faq")
			.setPlaceholder("Get a response to another question...")
			.setOptions(...options);

		const actionRow = new ActionRowBuilder().addComponents(selectMenu);

		// Send the FAQ message (content from tags.yaml)
		interaction.reply({
			content: publicMessage ? `${target}` : null,
			embeds: [embed],
			components: [actionRow],
			ephemeral: !publicMessage
		});
	}
};
