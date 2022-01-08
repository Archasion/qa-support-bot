const { Interaction, MessageEmbed } = require("discord.js");
const Command = require("../modules/commands/command");

module.exports = class AddCommand extends Command {
    constructor(client) {
        super(client, {
            name: "add-member",
            description: "Add a member to a ticket",
            permissions: [],
            staff_only: true,
            dev_only: false,
            internal: true,
            options: [
                {
                    name: "member",
                    description: "The member to add to the ticket",
                    required: true,
                    type: Command.option_types.USER
                },
                {
                    name: "ticket",
                    description: "The ticket to add the member to",
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
        const member = interaction.options.getMember("member");

        const ticket = await tickets.resolve(channel.id, interaction.guild.id);

        if (!ticket) {
            return await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor(config.colors.error_color)
                        .setTitle("This isn't a ticket channel")
                        .setDescription(
                            "Please use this command in the ticket channel, or mention the channel."
                        )
                        .setFooter(config.text.footer, interaction.guild.iconURL())
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
                        .setFooter(config.text.footer, interaction.guild.iconURL())
                ],
                ephemeral: true
            });
        }

        // Respond to the interaction author (success)
        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setColor(config.colors.success_color)
                    .setAuthor({
                        name: member.user.username,
                        iconURL: member.user.displayAvatarURL()
                    })
                    .setTitle("Member added")
                    .setDescription(`${member.toString()} has been added to ${channel.toString()}`)
                    .setFooter(config.text.footer, interaction.guild.iconURL())
            ],
            ephemeral: true
        });

        // Respond to the ticket (success)
        await channel.send({
            embeds: [
                new MessageEmbed()
                    .setColor(config.color)
                    .setAuthor({
                        name: member.user.username,
                        iconURL: member.user.displayAvatarURL()
                    })
                    .setTitle("Member added")
                    .setDescription(
                        `${member.toString()} has been added by ${interaction.user.toString()}`
                    )
                    .setFooter(config.text.footer, interaction.guild.iconURL())
            ]
        });

        await channel.permissionOverwrites.edit(
            member,
            {
                ATTACH_FILES: true,
                READ_MESSAGE_HISTORY: true,
                SEND_MESSAGES: true,
                VIEW_CHANNEL: true,
                EMBED_LINKS: true
            },
            `${interaction.user.tag} added ${member.user.tag} to the ticket`
        );

        await action.addMember(interaction.guild, interaction.user, member.user, ticket);
        await tickets.archives.updateMember(channel.id, member);

        log.info(`${interaction.user.tag} added ${member.user.tag} to ${channel.id}`);
    }
};
