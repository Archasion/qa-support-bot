const Command = require("../modules/commands/command");
const roblox = require("noblox.js");

let ID;

module.exports = class WhoisCommand extends Command {
	constructor(client) {
		super(client, {
			name: "whois",
			description: "Find a user by nickname",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			// verified_only: true,
			nda_only: true,
			options: [
				{
					name: "username",
					description: "The username to search for",
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
		const username = interaction.options.getString("username").format();

		let member = await interaction.guild.members.search({ query: username });
		member = member.first();

		// Check if the member exists
		if (!member) {
			interaction.reply({
				content: `Could not find anyone with the username **${username}**`,
				ephemeral: true
			});
			return;
		}

		// Check if the member is verified
		if (!member.roles.cache.has(config.roles.public)) {
			interaction.reply({ content: `**${member.displayName}** is not verified`, ephemeral: true });
			return;
		}

		try {
			// The the Roblox user ID from username
			ID = await roblox.getIdFromUsername(username);
		} catch {
			interaction.reply({
				content: "Invalid username",
				ephemeral: true
			});
			return;
		}

		// Send the information
		await interaction.reply({
			content: `${member} (\`${member.id}\`) is verified as **${member.displayName}**\n<https://roblox.com/users/${ID}/profile>`,
			ephemeral: true
		});
	}
};
