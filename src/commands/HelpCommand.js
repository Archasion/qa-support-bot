const Command = require("../modules/commands/command");

const { EmbedBuilder } = require("discord.js");

module.exports = class HelpCommand extends Command {
	constructor(client) {
		super(client, {
			name: "help",
			description: "List the commands you have access to",
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			public_only: true,
			permissions: [],
			options: []
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
	async execute(interaction) {
		// Check the user's rank
		const isModerator = await utils.isModerator(interaction.member);
		const isManager = await utils.isManager(interaction.member);
		const isDeveloper = await utils.isDeveloper(interaction.member);
		const isVerified = await utils.isVerified(interaction.member);
		const isNDA = await utils.isNDA(interaction.member);

		const commands = this.manager.commands.filter(command => {
			// Validate the user's permissions
			if (command.permissions.length >= 1) {
				return interaction.member.permissions.has(command.permissions);
			}

			// Validate the user's rank
			if (
				(command.moderator_only && isModerator) ||
				(command.manager_only && isManager) ||
				(command.public_only && isVerified) ||
				(command.nda_only && isNDA) ||
				(command.dev_only && isDeveloper)
			)
				return true;

			if (
				!command.moderator_only &&
				!command.manager_only &&
				!command.public_only &&
				!command.nda_only &&
				!command.dev_only
			)
				return true;

			return false;
		});

		// Create a list of commands the user has access to
		const listOfCommands = commands.map(command => {
			const description =
				command.description.length > 50
					? command.description.substring(0, 50) + "..."
					: command.description;
			return `**\`/${command.name}\` ·** ${description}`;
		});

		// Respond with the list of commands
		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setColor(config.colors.default)
					.setTitle("Help")
					.setDescription(
						"The commands you have access to are listed below. To create a ticket, type `/new-ticket`."
					)
					.addFields({ name: "Commands", value: listOfCommands.join("\n") })
			],
			ephemeral: true
		});
	}
};
