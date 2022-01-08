const Command = require("../modules/commands/command");
const { Interaction } = require("discord.js");

module.exports = class MessageCommand extends Command {
    constructor(client) {
        super(client, {
            name: "message",
            description: "Send a message as the bot",
            permissions: [],
            staff_only: true,
            dev_only: false,
            internal: true,
            options: [
                {
                    name: "content",
                    description: "The content of the message",
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
        const content = interaction.options.getString("content").format();

        await interaction.reply({
            content: `The message has been sent`,
            ephemeral: true
        });

        await interaction.channel.send({ content: content });
    }
};
