const { Interaction, MessageEmbed } = require("discord.js");
const Command = require("../modules/commands/command");

module.exports = class RemoveCommand extends Command {
    constructor(client) {
        super(client, {
            name: "remove-member",
            description: "Remove a member from a ticket",
            permissions: [],
            staff_only: true,
            dev_only: false,
            internal: true,
            options: [
                {
                    description: "The member to remove from a ticket",
                    name: "member",
                    required: true,
                    type: Command.option_types.USER
                },
                {
                    description: "The ticket to remove the member from",
                    name: "ticket",
                    required: false,
                    type: Command.option_types.CHANNEL
                }
            ]
        });
    }

    /**
     * @param {Interaction} interaction
     * @returns {Promise<void|any>}
     */
    async execute(interaction) {
        const channel = interaction.options.getChannel("ticket") ?? interaction.channel;
        const ticket_channel = await tickets.resolve(channel.id, interaction.guild.id);
        const member = interaction.options.getMember("member");

        if (!ticket_channel) {
            return await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor(config.colors.error_color)
                        .setTitle("This isn't a ticket channel")
                        .setDescription(
                            "Please use this command in the ticket channel, or mention the channel."
                        )
                        .setFooter({ name: config.text.footer, iconURL: interaction.guild.iconURL() })
                ],
                ephemeral: true
            });
        }

        if (!member) {
            return await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor(config.colors.error_color)
                        .setTitle("Unknown member")
                        .setDescription("Please mention the member you want to add.")
                        .setFooter({ name: config.text.footer, iconURL: interaction.guild.iconURL() })
                ],
                ephemeral: true
            });
        }

        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setColor(config.colors.success_color)
                    .setAuthor({
                        name: member.user.username,
                        iconURL: member.user.displayAvatarURL()
                    })
                    .setTitle("Member removed")
                    .setDescription(`${member.toString()} has been removed from ${channel.toString()}`)
                    .setFooter({ name: config.text.footer, iconURL: interaction.guild.iconURL() })
            ],
            ephemeral: true
        });

        await channel.send({
            embeds: [
                new MessageEmbed()
                    .setColor(config.colors.default_color)
                    .setAuthor({
                        name: member.user.username,
                        iconURL: member.user.displayAvatarURL()
                    })
                    .setTitle("Member removed")
                    .setDescription(
                        `${member.toString()} has been removed by ${interaction.user.toString()}`
                    )
                    .setFooter({ name: config.text.footer, iconURL: interaction.guild.iconURL() })
            ]
        });

        await action.removeMember(interaction.guild, interaction.user, member.user, ticket_channel);
        await channel.permissionOverwrites.delete(
            member.user.id,
            `${interaction.user.tag} removed ${member.user.tag} from the ticket`
        );

        log.info(`${interaction.user.tag} removed ${member.user.tag} from ${channel.id}`);
    }
};
