const { Interaction, MessageActionRow, MessageEmbed, MessageSelectMenu } = require("discord.js");
const Command = require("../modules/commands/command");

module.exports = class NewCommand extends Command {
    constructor(client) {
        super(client, {
            name: "new-ticket",
            description: "Create a new ticket",
            permissions: [],
            staff_only: false,
            dev_only: false,
            internal: true,
            options: [
                {
                    description: "The topic of the ticket",
                    name: "topic",
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
        const topic = interaction.options.getString("topic");

        const create = async (ticket_channel, new_interaction) => {
            const ticket_channels = await db.models.Ticket.findAndCountAll({
                where: {
                    category: ticket_channel.id,
                    creator: interaction.user.id,
                    open: true
                }
            });

            if (ticket_channels.count >= ticket_channel.max_per_member) {
                if (ticket_channel.max_per_member === 1) {
                    const response = {
                        components: [],
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.error_color)
                                .setAuthor({
                                    name: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL()
                                })
                                .setTitle("You already have an open ticket")
                                .setDescription(
                                    `Please use your existing ticket (<#${ticket_channels.rows[0].id}>) or close it before creating another.`
                                )
                                .setFooter(config.text.footer, interaction.guild.iconURL())
                        ],
                        ephemeral: true
                    };

                    (await new_interaction)
                        ? new_interaction.editReply(response)
                        : interaction.reply(response);
                } else {
                    const list = ticket_channels.rows.map(ticket => {
                        if (ticket.topic) {
                            const description = ticket.topic.substring(0, 30);
                            const ellipses = ticket.topic.length > 30 ? "..." : "";
                            return `<#${ticket.id}>: \`${description}${ellipses}\``;
                        } else {
                            return `<#${ticket.id}>`;
                        }
                    });

                    const response = {
                        components: [],
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
                                .setFooter(config.text.footer, interaction.guild.iconURL())
                        ],
                        ephemeral: true
                    };

                    (await new_interaction)
                        ? new_interaction.editReply(response)
                        : interaction.reply(response);
                }
            } else {
                try {
                    const ticket = await tickets.create(
                        interaction.guild.id,
                        interaction.user.id,
                        ticket_channel.id,
                        topic
                    );

                    const response = {
                        components: [],
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.success_color)
                                .setAuthor({
                                    name: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL()
                                })
                                .setTitle("Ticket created")
                                .setDescription(`Your ticket has been created: <#${ticket.id}>.`)
                                .setFooter(config.text.footer, interaction.guild.iconURL())
                        ],
                        ephemeral: true
                    };

                    (await new_interaction)
                        ? new_interaction.editReply(response)
                        : interaction.reply(response);
                    await action.createTicket(interaction.guild, interaction.user, ticket, topic);
                } catch (error) {
                    const response = {
                        components: [],
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.colors.error_color)
                                .setAuthor({
                                    name: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL()
                                })
                                .setTitle("Error")
                                .setDescription(error.message)
                                .setFooter(config.text.footer, interaction.guild.iconURL())
                        ],
                        ephemeral: true
                    };

                    (await new_interaction)
                        ? new_interaction.editReply(response)
                        : interaction.reply(response);
                }
            }
        };

        const categories = await db.models.Category.findAndCountAll({
            where: { guild: interaction.guild.id }
        });

        if (categories.count === 0) {
            return await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor(config.colors.error_color)
                        .setAuthor({
                            name: interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTitle("Can't create ticket")
                        .setDescription(
                            "A server administrator must create at least one ticket category before a new ticket can be opened."
                        )
                        .setFooter(config.text.footer, interaction.guild.iconURL())
                ],
                ephemeral: true
            });
        } else if (categories.count === 1) {
            create(categories.rows[0]);
        } else {
            await interaction.reply({
                components: [
                    new MessageActionRow().addComponents(
                        new MessageSelectMenu()
                            .setCustomId(`select_category:${interaction.id}`)
                            .setPlaceholder("Select a category")
                            .addOptions(
                                categories.rows.map(row => ({
                                    label: row.name,
                                    value: row.id
                                }))
                            )
                    )
                ],
                embeds: [
                    new MessageEmbed()
                        .setColor(config.colors.default_color)
                        .setAuthor({
                            name: interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTitle("Please select the ticket category")
                        .setDescription("Select the category most relevant to your ticket's topic.")
                        .setFooter(
                            utils.footer(
                                config.text.footer,
                                "Expires in 30 seconds",
                                interaction.guild.iconURL()
                            )
                        )
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
                create(
                    categories.rows.find(row => row.id === new_interaction.values[0]),
                    new_interaction
                );
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
                                .setTitle("Interaction time expired")
                                .setDescription("You took too long to select the ticket category.")
                                .setFooter(config.text.footer, interaction.guild.iconURL())
                        ],
                        ephemeral: true
                    });
                }
            });
        }
    }
};
