const Command = require("../modules/commands/command");

module.exports = class ResetReminderCommand extends Command {
	constructor(client) {
		super(client, {
			name: "reset-reminder",
			description: "Reset your reminder",
			permissions: [],
			ignored: {
				roles: [],
				channels: [],
				threads: []
			},
			manager_only: true,
			moderator_only: true,
			nda_only: false,
			dev_only: true,
			options: [
				{
					name: "reminder_id",
					description:
						"The ID of the reminder to remove (seperate using commas to reset multiple reminders)",
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
		const reminder_ids = interaction.options.getString("reminder_id").replace(/\s+/g, "").split(",");

		reminder_ids.forEach(async reminder_id => {
			const reminder = await db.models.Reminder.findOne({
				where: {
					user_id: interaction.user.id,
					reminder_id
				}
			});

			if (!reminder) {
				return interaction.reply({
					content: `Cannot resolve the reminder ID: ${reminder_id}`,
					ephemeral: true
				});
			}

			await clearTimeout(global[`reminder_${interaction.user.id}_${reminder.reminder_id}`]);
			delete global[`reminder_${interaction.user.id}_${reminder.reminder_id}`];

			await reminder.destroy();
		});

		await interaction.reply({
			content: `The following reminder${reminder_ids.length > 1 ? "s" : ""} ha${
				reminder_ids.length > 1 ? "ve" : "s"
			} been reset: \`${reminder_ids.join("`, `")}\``,
			ephemeral: true
		});
	}
};
