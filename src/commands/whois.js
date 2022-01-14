const Command = require("../modules/commands/command");

module.exports = class WhoisCommand extends Command {
	constructor(client) {
		super(client, {
			name: "whois",
			description: "Find a user by nickname",
			permissions: [],
			staff_only: true,
			dev_only: false,
			internal: true,
			options: [
				{
					name: "nickname",
					description: "The nickname to search for",
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
		const nickname = interaction.options.getString("nickname").format();
		let member = await interaction.guild.members.search({ query: nickname });
		member = member.first();

		if (member) {
			await interaction.reply({
				content: `${member} (\`${member.id}\`) is verified as **${member.displayName}**`,
				ephemeral: true
			});
		} else {
			await interaction.reply({
				content: `No one is verified as **${nickname}**`,
				ephemeral: true
			});
		}
	}
};
