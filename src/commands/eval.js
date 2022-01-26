const { MessageEmbed } = require("discord.js");
const Command = require("../modules/commands/command");

module.exports = class EvalCommand extends Command {
	constructor(client) {
		super(client, {
			name: "eval",
			description: "Evaluates code.",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			manager_only: false,
			moderator_only: false,
			nda_only: false,
			dev_only: true,
			options: [
				{
					description: "The code to evaluate.",
					name: "code",
					required: true,
					type: Command.option_types.STRING
				},
				{
					description: "Should the result be sent publicly?",
					name: "public",
					required: false,
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
		const codeToEvaluate = interaction.options.getString("code");
		const publicResult = interaction.options.getBoolean("public") ?? false;

		if (codeToEvaluate.match(/(env|DISCORD_TOKEN|DB_ENCRYPTION_KEY|NDA_FORM_KEY)/gi)) {
			return interaction.reply({
				content: "Cannot evaluate code that contains sensitive information.",
				ephemeral: !publicResult
			});
		}

		const embed = new MessageEmbed().setColor(config.colors.default_color);

		try {
			let evaluatedCode = eval(codeToEvaluate);

			if (typeof evaluatedCode === "object") {
				evaluatedCode = JSON.stringify(evaluatedCode, null, "\t");
			}

			if (
				typeof evaluatedCode !== "string" &&
				typeof evaluatedCode !== "number" &&
				typeof evaluatedCode !== "boolean"
			) {
				return await interaction.reply({
					content: `The output could not be converted to text (output type: ${typeof evaluatedCode})`,
					ephemeral: !publicResult
				});
			}

			embed.setTitle("Evaluated code");
			embed.setDescription(`\`\`\`js\n${evaluatedCode}\n\`\`\``);
			embed.setTimestamp();
		} catch (error) {
			embed.setTitle("Failed to evaluate code");
			embed.setDescription(`\`\`\`js\n${error}\n\`\`\``);
			embed.setTimestamp();
		}

		return interaction.reply({
			embeds: [embed],
			ephemeral: !publicResult
		});
	}
};
