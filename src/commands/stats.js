const { Interaction, MessageEmbed } = require("discord.js");
const Command = require("../modules/commands/command");
const Keyv = require("keyv");

module.exports = class StatsCommand extends Command {
    constructor(client) {
        super(client, {
            name: "stats",
            description: "View the server's statistics.",
            permissions: [],
            staff_only: true,
            dev_only: false,
            internal: true,
            options: []
        });

        this.cache = new Keyv({ namespace: "cache.commands.stats" });
    }

    /**
     * @param {Interaction} interaction
     * @returns {Promise<void|any>}
     */
    async execute(interaction) {
        var stats = await this.cache.get(interaction.guild.id);

        if (!stats) {
            const tickets = await db.models.Ticket.findAndCountAll({
                where: { guild: interaction.guild.id }
            });
            stats = {
                messages: null,
                response_time: Math.floor(
                    tickets.rows.reduce(
                        (acc, row) =>
                            row.first_response
                                ? acc +
                                  Math.abs(new Date(row.createdAt) - new Date(row.first_response)) /
                                      1000 /
                                      60
                                : acc,
                        0
                    ) / tickets.count
                ),
                tickets: tickets.count
            };

            await this.cache.set(interaction.guild.id, stats, 60 * 60 * 1000); // cache for an hour
        }

        const guild_embed = new MessageEmbed()
            .setColor(config.colors.default_color)
            .setTitle("This server's stats")
            .setDescription(
                "Statistics about tickets within this guild. This data is cached for an hour."
            )
            .addField("Tickets", String(stats.tickets), true)
            .addField("Avg. response time", `${stats.response_time} minutes`, true)
            .setFooter({ text: config.text.footer, iconURL: interaction.guild.iconURL() });

        if (stats.messages) guild_embed.addField("Messages", String(stats.messages), true);

        const embeds = [guild_embed];

        if (this.client.guilds.cache.size > 1) {
            let global = await this.cache.get("global");

            if (!global) {
                const tickets = await db.models.Ticket.findAndCountAll();
                global = {
                    messages: null,
                    response_time: Math.floor(
                        tickets.rows.reduce(
                            (acc, row) =>
                                row.first_response
                                    ? acc +
                                      Math.abs(new Date(row.createdAt) - new Date(row.first_response)) /
                                          1000 /
                                          60
                                    : acc,
                            0
                        ) / tickets.count
                    ),
                    tickets: tickets.count
                };

                await this.cache.set("global", global, 60 * 60 * 1000); // cache for an hour
            }

            const global_embed = new MessageEmbed()
                .setColor(config.colors.default_color)
                .setTitle("Global stats")
                .setDescription(
                    "Statistics about tickets across all guilds where this QA Support instance is used."
                )
                .addField("Tickets", String(global.tickets), true)
                .addField("Avg. response time", `${global.response_time} minutes`, true)
                .setFooter({ text: config.text.footer, iconURL: interaction.guild.iconURL() });

            if (stats.messages) global_embed.addField("Messages", String(global.messages), true);

            embeds.push(global_embed);
        }

        await interaction.reply({ embeds });
    }
};
