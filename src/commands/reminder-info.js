const Command = require("../modules/commands/command");
const { Interaction, MessageEmbed } = require("discord.js");

module.exports = class ReminderInfoCommand extends Command {
    constructor(client) {
        super(client, {
            name: "reminder-info",
            description: "Get information about your reminder",
            permissions: [],
            staff_only: true,
            dev_only: false,
            internal: true,
            options: [
                {
                    name: "reminder_id",
                    description: "The ID of the reminder to view",
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
        var reminder = await db.models.Reminder.findOne({
            where: {
                user_id: interaction.user.id,
                reminder_id: interaction.options.getString("reminder_id")
            }
        });

        if (!reminder) {
            return await interaction.reply({
                content: `The reminder ID could not be resolved (\`${interaction.options.getString(
                    "reminder_id"
                )}\`).`,
                ephemeral: true
            });
        }

        const embed = new MessageEmbed()
            .setColor(config.colors.default_color)
            .setAuthor({
                name: interaction.member.nickname,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setFields([
                { name: "Channel", value: `<#${reminder.channel_id}>`, inline: true },
                { name: "Set On", value: `<t:${reminder.before}:f>`, inline: true },
                { name: "Alert On", value: `<t:${reminder.after}:f>`, inline: true },
                { name: "Reminder", value: reminder.message, inline: false }
            ])
            .setFooter(`Reminder ID: ${reminder.reminder_id}`);

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};
