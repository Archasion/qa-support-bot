const { Interaction, MessageEmbed } = require("discord.js");
const Command = require("../modules/commands/command");

module.exports = class TagCommand extends Command {
    constructor(client) {
        super(client, {
            name: "tag",
            description: "Use a tag response",
            permissions: [],
            staff_only: true,
            dev_only: false,
            internal: true,
            options: async guild => {
                const settings = await utils.getSettings(guild.id);

                return Object.keys(settings.tags).map(tag => ({
                    name: tag,
                    description: settings.tags[tag].substring(0, 100),
                    type: Command.option_types.SUB_COMMAND,
                    options: [
                        ...settings.tags[tag].matchAll(
                            /(?<!\\){{1,2}\s?([A-Za-z0-9._:]+)\s?(?<!\\)}{1,2}/gi
                        )
                    ].map(match => ({
                        name: match[1],
                        description: match[1],
                        required: true,
                        type: Command.option_types.STRING
                    }))
                }));
            }
        });
    }

    /**
     * @param {Interaction} interaction
     * @returns {Promise<void|any>}
     */
    async execute(interaction) {
        const settings = await utils.getSettings(interaction.guild.id);

        try {
            const tag_name = interaction.options.getSubcommand();
            const args = interaction.options.data[0]?.options;
            const tag = settings.tags[tag_name];

            const text = tag.replace(/(?<!\\){{1,2}\s?([A-Za-z0-9._:]+)\s?(?<!\\)}{1,2}/gi, ($, $1) => {
                const arg = args.find(arg => arg.name === $1);
                return arg ? arg.value : $;
            });

            return await interaction.reply({
                embeds: [new MessageEmbed().setColor(config.colors.default_color).setDescription(text)],
                ephemeral: false
            });
        } catch {
            const list = Object.keys(settings.tags).map(t => `❯ **\`${t}\`**`);

            return await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor(config.colors.default_color)
                        .setTitle("Tag List")
                        .setDescription(list.join("\n"))
                        .setFooter(config.text.footer, interaction.guild.iconURL())
                ],
                ephemeral: true
            });
        }
    }
};
