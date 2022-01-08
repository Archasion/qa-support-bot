const EventListener = require("../modules/listeners/listener");
var sprintf = require("sprintf-js").sprintf;
const { Interaction, MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

module.exports = class InteractionCreateEventListener extends EventListener {
    constructor(client) {
        super(client, { event: "interactionCreate" });
    }

    /**
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        log.debug(interaction);

        const settings = await utils.getSettings(interaction.guild.id);

        const blacklisted =
            settings.blacklist.members.includes[interaction.user.id] ||
            interaction.member?.roles.cache?.some(role => settings.blacklist.roles.includes(role));
        if (blacklisted) {
            return interaction.reply({
                content: "You are blacklisted",
                ephemeral: true
            });
        }

        const handlePanel = async id => {
            const caticket_row = await db.models.Category.findOne({ where: { id } });

            if (!caticket_row) {
                log.warn("Could not find a category with the ID given by a panel interaction");
                return interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.colors.error_color)
                            .setTitle("⚠️")
                            .setDescription(
                                "An unexpected error occurred during command execution.\nPlease ask an administrator to check the console output / logs for details."
                            )
                    ],
                    ephemeral: true
                });
            }

            const ticket_channels = await db.models.Ticket.findAndCountAll({
                where: {
                    category: caticket_row.id,
                    creator: interaction.user.id,
                    open: true
                }
            });

            if (ticket_channels.count >= caticket_row.max_per_member) {
                if (caticket_row.max_per_member === 1) {
                    return interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.error_color)
                                .setAuthor({
                                    name: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL()
                                })
                                .setTitle("Existing Ticket")
                                .setDescription(
                                    `You already have an existing ticket: ${ticket_channels.rows[0].id}.`
                                )
                                .setFooter({
                                    text: config.text.footer,
                                    iconURL: interaction.guild.iconURL()
                                })
                        ],
                        ephemeral: true
                    });
                } else {
                    const list = ticket_channels.rows.map(row => {
                        if (row.topic) {
                            const description = row.topic.substring(0, 30);
                            const ellipses = row.topic.length > 30 ? "..." : "";
                            return `<#${row.id}>: \`${description}${ellipses}\``;
                        } else {
                            return `<#${row.id}>`;
                        }
                    });
                    return interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.error_color)
                                .setAuthor({
                                    name: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL()
                                })
                                .setTitle(
                                    `You already have ${ticket_channels.count} open ticket${
                                        ticket_channels.count === 1 ? "" : "s"
                                    }`
                                )
                                .setDescription(
                                    `Please use \`/close\` to close any unneeded tickets.\n\n${list.join(
                                        "\n"
                                    )}`
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
                try {
                    const ticket_row = await tickets.create(
                        interaction.guild.id,
                        interaction.user.id,
                        id
                    );
                    return interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.success_color)
                                .setAuthor({
                                    name: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL()
                                })
                                .setTitle("Ticket created")
                                .setDescription(`Your ticket has been created: <#${ticket_row.id}>.`)
                                .setFooter({
                                    text: config.text.footer,
                                    iconURL: interaction.guild.iconURL()
                                })
                        ],
                        ephemeral: true
                    });
                } catch (error) {
                    log.error(error);
                    return interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.error_color)
                                .setAuthor({
                                    name: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL()
                                })
                                .setTitle("Error")
                                .setDescription(error.message)
                                .setFooter({
                                    text: config.text.footer,
                                    iconURL: interaction.guild.iconURL()
                                })
                        ],
                        ephemeral: true
                    });
                }
            }
        };

        if (interaction.isCommand()) {
            // handle slash commands
            this.client.commands.handle(interaction);
        } else if (interaction.isButton()) {
            if (interaction.customId.startsWith("panel.single")) {
                // handle single-category panels
                handlePanel(interaction.customId.split(":")[1]);
            } else if (interaction.customId.startsWith("ticket.claim")) {
                // handle ticket claiming
                if (!(await utils.isStaff(interaction.member))) return;
                const ticket_row = await db.models.Ticket.findOne({
                    where: { id: interaction.channel.id }
                });
                await ticket_row.update({ claimed_by: interaction.user.id });
                await interaction.channel.permissionOverwrites.edit(
                    interaction.user.id,
                    { VIEW_CHANNEL: true },
                    `Ticket claimed by ${interaction.user.tag}`
                );

                const caticket_row = await db.models.Category.findOne({
                    where: { id: ticket_row.category }
                });

                for (const role of caticket_row.roles) {
                    await interaction.channel.permissionOverwrites.edit(
                        role,
                        { VIEW_CHANNEL: false },
                        `Ticket claimed by ${interaction.user.tag}`
                    );
                }

                log.info(
                    `${interaction.user.tag} has claimed "${interaction.channel.name}" in "${interaction.guild.name}"`
                );

                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.colors.default_color)
                            .setAuthor({
                                name: interaction.user.username,
                                iconURL: interaction.user.displayAvatarURL()
                            })
                            .setTitle("Ticket Claimed")
                            .setDescription(`${interaction.member.toString()} has claimed this ticket.`)
                            .setFooter({
                                text: config.text.footer,
                                iconURL: interaction.guild.iconURL()
                            })
                    ]
                });

                const components = new MessageActionRow();

                if (caticket_row.claiming) {
                    components.addComponents(
                        new MessageButton()
                            .setCustomId("ticket.unclaim")
                            .setLabel("Release")
                            .setEmoji("♻️")
                            .setStyle("SECONDARY")
                    );
                }

                if (settings.close_button) {
                    components.addComponents(
                        new MessageButton()
                            .setCustomId("ticket.close")
                            .setLabel("Close")
                            .setEmoji("✖️")
                            .setStyle("DANGER")
                    );
                }

                await interaction.message.edit({ components: [components] });
            } else if (interaction.customId.startsWith("ticket.unclaim")) {
                // handle ticket unclaiming
                if (!(await utils.isStaff(interaction.member))) return;
                const ticket_row = await db.models.Ticket.findOne({
                    where: { id: interaction.channel.id }
                });
                await ticket_row.update({ claimed_by: null });

                await interaction.channel.permissionOverwrites.delete(
                    interaction.user.id,
                    `Ticket released by ${interaction.user.tag}`
                );

                const caticket_row = await db.models.Category.findOne({
                    where: { id: ticket_row.category }
                });

                for (const role of caticket_row.roles) {
                    await interaction.channel.permissionOverwrites.edit(
                        role,
                        { VIEW_CHANNEL: true },
                        `Ticket released by ${interaction.user.tag}`
                    );
                }

                log.info(
                    `${interaction.user.tag} has released "${interaction.channel.name}" in "${interaction.guild.name}"`
                );

                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.colors.default_color)
                            .setAuthor({
                                name: interaction.user.username,
                                iconURL: interaction.user.displayAvatarURL()
                            })
                            .setTitle("Ticket Released")
                            .setDescription(`${interaction.member.toString()} has released this ticket.`)
                            .setFooter({
                                text: config.text.footer,
                                iconURL: interaction.guild.iconURL()
                            })
                    ]
                });

                const components = new MessageActionRow();

                if (caticket_row.claiming) {
                    components.addComponents(
                        new MessageButton()
                            .setCustomId("ticket.claim")
                            .setLabel("Claim")
                            .setEmoji("🙌")
                            .setStyle("SECONDARY")
                    );
                }

                if (settings.close_button) {
                    components.addComponents(
                        new MessageButton()
                            .setCustomId("ticket.close")
                            .setLabel("Close")
                            .setEmoji("✖️")
                            .setStyle("DANGER")
                    );
                }

                await interaction.message.edit({ components: [components] });
            } else if (interaction.customId.startsWith("ticket.close")) {
                // handle ticket close button
                const ticket_row = await db.models.Ticket.findOne({
                    where: { id: interaction.channel.id }
                });
                await interaction.reply({
                    components: [
                        new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setCustomId(`confirm_close:${interaction.id}`)
                                    .setLabel("Close")
                                    .setStyle("SUCCESS")
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
                            .setDescription("Please confirm your decision")
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
                        await tickets.close(ticket_row.id, interaction.user.id, interaction.guild.id);
                        await new_interaction.editReply({
                            components: [],
                            embeds: [
                                new MessageEmbed()
                                    .setColor(config.colors.success_color)
                                    .setTitle("Ticket Closed")
                                    .setDescription(`Ticket ${ticket_row.number} has been closed`)
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
        } else if (interaction.isSelectMenu()) {
            if (interaction.customId.startsWith("panel.multiple")) {
                // handle multi-category panels and new command
                handlePanel(interaction.values[0]);
            }
        }
    }
};
