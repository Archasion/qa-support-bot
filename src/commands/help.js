const { Interaction, MessageEmbed } = require("discord.js");
const Command = require("../modules/commands/command");

module.exports = class HelpCommand extends Command {
    constructor(client) {
        super(client, {
            name: "help",
            description: "List the commands you have access to",
            permissions: [],
            staff_only: false,
            dev_only: false,
            internal: true,
            options: []
        });
    }

    /**
     * @param {Interaction} interaction
     * @returns {Promise<void|any>}
     */
    async execute(interaction) {
        const isStaffMember = await utils.isStaff(interaction.member);
        const isDeveloper = await utils.isDeveloper(interaction.member);

        const commands = this.manager.commands.filter(command => {
            if (command.permissions.length >= 1)
                return interaction.member.permissions.has(command.permissions);
            else if (command.staff_only) return isStaffMember;
            else if (command.dev_only) return isDeveloper;
            else return true;
        });

        const listOfCommands = commands.map(command => {
            const description =
                command.description.length > 50
                    ? command.description.substring(0, 50) + "..."
                    : command.description;
            return `**\`/${command.name}\` ·** ${description}`;
        });

        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setColor(config.colors.default_color)
                    .setTitle("Help")
                    .setDescription(
                        "The commands you have access to are listed below. To create a ticket, type `/new-ticket`."
                    )
                    .addField("Commands", listOfCommands.join("\n"))
            ],
            ephemeral: true
        });
    }
};
