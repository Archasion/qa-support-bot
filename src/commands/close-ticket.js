const { Interaction, MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const { Op } = require("sequelize");

const Command = require("../modules/commands/command");
const ms = require("ms");

module.exports = class CloseCommand extends Command {
    constructor(client) {
        super(client, {
            name: "close-ticket",
            description: "Close a ticket channel",
            permissions: [],
            internal: true,
            staff_only: true,
            dev_only: false,
            options: [
                {
                    name: "reason",
                    description: "The reason for closing the ticket(s)",
                    required: false,
                    type: Command.option_types.STRING
                },
                {
                    name: "ticket",
                    description: "The ticket to close, either the number or the channel ID",
                    required: false,
                    type: Command.option_types.INTEGER
                },
                {
                    name: "time",
                    description: "Close all tickets that have been inactive for the specified time",
                    required: false,
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
        const ticket = interaction.options.getInteger("ticket");
        const reason = interaction.options.getString("reason");
        const time = interaction.options.getString("time");

        if (time) {
            if (!(await utils.isStaff(interaction.member))) {
                return await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.co / lors.error_color)
                            .setTitle("Insufficient Permissions")
                            .setDescription("You are not a staff member or the ticket creator.")
                            .setFooter({
                                text: config.text.footer,
                                iconURL: interaction.guild.iconURL()
                            })
                    ],
                    ephemeral: true
                });
            }

            const period = ms(time);

            if (!period) {
                return await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.colors.error_color)
                            .setTitle("Invalid time")
                            .setDescription("The time period provided could not be parsed.")
                            .setFooter({
                                text: config.text.footer,
                                iconURL: interaction.guild.iconURL()
                            })
                    ],
                    ephemeral: true
                });
            }

            const tickets = await db.models.Ticket.findAndCountAll({
                where: {
                    guild: interaction.guild.id,
                    last_message: { [Op.lte]: new Date(Date.now() - period) },
                    open: true
                }
            });

            if (tickets.count === 0) {
                return await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.colors.error_color)
                            .setTitle("No tickets found")
                            .setDescription(
                                "No tickets have been found that have been inactive for the specified time."
                            )
                            .setFooter({
                                text: config.text.footer,
                                iconURL: interaction.guild.iconURL()
                            })
                    ],
                    ephemeral: true
                });
            } else {
                const count = tickets.count;

                await interaction.reply({
                    components: [
                        new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setCustomId(`confirm_close_multiple:${interaction.id}`)
                                    .setLabel(`Close ${count} ticket${count === 1 ? "" : "s"}`)
                                    .setStyle("DANGER")
                            )
                            .addComponents(
                                new MessageButton()
                                    .setCustomId(`cancel_close_multiple:${interaction.id}`)
                                    .setLabel("Cancel")
                                    .setStyle("SECONDARY")
                            )
                    ],
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.colors.default_color)
                            .setTitle("Are you sure?")
                            .setDescription(
                                `You are about to close ${count} ticket${count === 1 ? "" : "s"}.`
                            )
                            .setFooter({
                                text: `${config.text.footer} • Expires in 30 seconds`,
                                iconURL: interaction.guild.iconURL()
                            })
                    ],
                    ephemeral: true
                });

                const filter = new_interaction =>
                    new_interaction.user.id === interaction.user.id &&
                    new_interaction.customId.includes(interaction.id);
                const collector = interaction.channel.createMessageComponentCollector({
                    filter,
                    time: 30000
                });

                collector.on("collect", async new_interaction => {
                    await new_interaction.deferUpdate();

                    if (new_interaction.customId === `confirm_close_multiple:${interaction.id}`) {
                        for (const ticket of tickets.rows) {
                            await action.closeTicket(
                                interaction.guild,
                                interaction.user,
                                reason,
                                ticket.id
                            );
                            await tickets.close(
                                ticket.id,
                                interaction.user.id,
                                interaction.guild.id,
                                reason
                            );
                        }

                        await new_interaction.editReply({
                            components: [],
                            embeds: [
                                new MessageEmbed()
                                    .setColor(config.colors.success_color)
                                    .setTitle(`Ticket${count === 1 ? "" : "s"} closed`)
                                    .setDescription(
                                        `${count} ticket${count === 1 ? "" : "s"} ha${
                                            count === 1 ? "s" : "ve"
                                        } been closed.`
                                    )
                                    .setFooter({
                                        text: config.text.footer,
                                        iconURL: interaction.guild.iconURL()
                                    })
                            ],
                            ephemeral: true
                        });
                    } else {
                        await new_interaction.editReply({
                            components: [],
                            embeds: [
                                new MessageEmbed()
                                    .setColor(config.colors.error_color)
                                    .setTitle("Cancelled")
                                    .setDescription("The operation has been cancelled.")
                                    .setFooter({
                                        text: config.text.footer,
                                        iconURL: interaction.guild.iconURL()
                                    })
                            ],
                            ephemeral: true
                        });
                    }

                    collector.stop();
                });

                collector.on("end", async collected => {
                    if (collected.size === 0) {
                        await interaction.editReply({
                            components: [],
                            embeds: [
                                new MessageEmbed()
                                    .setColor(config.colors.error_color)
                                    .setAuthor({
                                        name: interaction.user.username,
                                        iconURL: interaction.user.displayAvatarURL()
                                    })
                                    .setTitle("Timed out")
                                    .setDescription(
                                        "You did not respond in time. The operation has been cancelled."
                                    )
                                    .setFooter({
                                        text: config.text.footer,
                                        iconURL: interaction.guild.iconURL()
                                    })
                            ],
                            ephemeral: true
                        });
                    }
                });
            }
        } else {
            var ticket_channel;

            if (ticket) {
                ticket_channel = await tickets.resolve(ticket, interaction.guild.id);

                if (!ticket_channel) {
                    return await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.error_color)
                                .setTitle("Error")
                                .setDescription(
                                    `${ticket} could not be resolved to a ticket. Please provide the ticket ID/mention or number.`
                                )
                                .setFooter({
                                    text: config.text.footer,
                                    iconURL: interaction.guild.iconURL()
                                })
                        ],
                        ephemeral: true
                    });
                }
            } else {
                ticket_channel = await db.models.Ticket.findOne({
                    where: { id: interaction.channel.id }
                });

                if (!ticket_channel) {
                    return await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.error_color)
                                .setTitle("This isn't a ticket channel")
                                .setDescription(
                                    "Please use this command in a ticket channel or use the ticket flag.\nType `/help close` for more information."
                                )
                                .setFooter({
                                    text: config.text.footer,
                                    iconURL: interaction.guild.iconURL()
                                })
                        ],
                        ephemeral: true
                    });
                }
            }

            if (
                ticket_channel.creator !== interaction.member.id &&
                !(await utils.isStaff(interaction.member))
            ) {
                return await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.colors.error_color)
                            .setTitle("Insufficient Permissions")
                            .setDescription("You are not a staff member or the ticket creator.")
                            .setFooter({
                                name: config.text.footer,
                                iconURL: interaction.guild.iconURL()
                            })
                    ],
                    ephemeral: true
                });
            }

            await interaction.reply({
                components: [
                    new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId(`confirm_close:${interaction.id}`)
                                .setLabel("Close")
                                .setStyle("DANGER")
                        )
                        .addComponents(
                            new MessageButton()
                                .setCustomId(`cancel_close:${interaction.id}`)
                                .setLabel("Cancel")
                                .setStyle("SECONDARY")
                        )
                ],
                embeds: [
                    new MessageEmbed()
                        .setColor(config.colors.default_color)
                        .setTitle("Are you sure?")
                        .setDescription("Please confirm your decision.")
                        .setFooter({
                            text: `${config.text.footer} • Expires in 30 seconds`,
                            iconURL: interaction.guild.iconURL()
                        })
                ],
                ephemeral: true
            });

            const filter = new_interaction =>
                new_interaction.user.id === interaction.user.id &&
                new_interaction.customId.includes(interaction.id);
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 30000
            });

            collector.on("collect", async new_interaction => {
                await new_interaction.deferUpdate();

                if (new_interaction.customId === `confirm_close:${interaction.id}`) {
                    await action.closeTicket(
                        interaction.guild,
                        interaction.user,
                        reason,
                        ticket_channel.id
                    );
                    await tickets.close(
                        ticket_channel.id,
                        interaction.user.id,
                        interaction.guild.id,
                        reason
                    );

                    await new_interaction.editReply({
                        components: [],
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.success_color)
                                .setTitle("Ticket Closed")
                                .setDescription(`Ticket ${ticket_channel.number} has been closed.`)
                                .setFooter({
                                    text: config.text.footer,
                                    iconURL: interaction.guild.iconURL()
                                })
                        ],
                        ephemeral: true
                    });
                } else {
                    await new_interaction.editReply({
                        components: [],
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.error_color)
                                .setTitle("Cancelled")
                                .setDescription("The operation has been cancelled.")
                                .setFooter({
                                    text: config.text.footer,
                                    iconURL: interaction.guild.iconURL()
                                })
                        ],
                        ephemeral: true
                    });
                }

                collector.stop();
            });

            collector.on("end", async collected => {
                if (collected.size === 0) {
                    await interaction.editReply({
                        components: [],
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.error_color)
                                .setAuthor({
                                    name: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL()
                                })
                                .setTitle("Timed Out")
                                .setDescription(
                                    "You did not respond in time. The operation has been cancelled."
                                )
                                .setFooter({
                                    text: config.text.footer,
                                    iconURL: interaction.guild.iconURL()
                                })
                        ],
                        ephemeral: true
                    });
                }
            });
        }
    }
};
