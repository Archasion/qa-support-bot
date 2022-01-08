const { Client, Collection, Interaction, MessageEmbed } = require("discord.js");

const fs = require("fs");
const { path } = require("../../utils/fs");

/**
 * Manages the loading and execution of commands
 */
module.exports = class CommandManager {
    /**
     * Create a CommandManager instance
     * @param {import('../..').Bot} client
     */
    constructor(client) {
        /** The Discord Client */
        this.client = client;

        /**
         * A discord.js Collection (Map) of loaded commands
         * @type {Collection<string, import('./command')>}
         */
        this.commands = new Collection();
    }

    /** Automatically load all internal commands */
    load() {
        const files = fs.readdirSync(path("./src/commands")).filter(file => file.endsWith(".js"));

        for (let file of files) {
            try {
                file = require(`../../commands/${file}`);
                new file(this.client);
            } catch (e) {
                log.warn("An error occurred whilst loading an internal command");
                log.error(e);
            }
        }
    }

    /** Register a command */
    register(command) {
        const exists = this.commands.has(command.name);
        const is_internal =
            (exists && command.internal) || (exists && this.commands.get(command.name).internal);

        if (is_internal) {
            log.commands(`An unknown plugin has overridden the internal "${command.name}" command`);
            if (command.internal) return;
        } else if (exists) {
            throw new Error(`A non-internal command with the name "${command.name}" already exists`);
        }

        this.commands.set(command.name, command);
        log.commands(`Loaded "${command.name}" command`);
    }

    async publish(guild) {
        if (!guild) {
            return this.client.guilds.cache.forEach(guild => {
                this.publish(guild);
            });
        }

        try {
            const commands = await Promise.all(
                this.client.commands.commands.map(async command => await command.build(guild))
            );
            await this.client.application.commands.set(commands, guild.id);
            await this.updatePermissions(guild);
            log.success(`Published ${this.client.commands.commands.size} commands to "${guild.name}"`);
        } catch (error) {
            log.warn("An error occurred whilst publishing the commands");
            log.error(error);
        }
    }

    async updatePermissions(guild) {
        guild.commands.fetch().then(async commands => {
            const permissions = [];
            const settings = await utils.getSettings(guild.id);
            const blacklist = [];
            settings.blacklist.users?.forEach(userId => {
                blacklist.push({
                    id: userId,
                    permission: false,
                    type: "USER"
                });
            });
            settings.blacklist.roles?.forEach(roleId => {
                blacklist.push({
                    id: roleId,
                    permission: false,
                    type: "ROLE"
                });
            });

            const staff_roles = ["914625617318801428"];
            const developers = config.ids.users.developers;

            commands.forEach(async g_cmd => {
                const cmd_permissions = [...blacklist];
                const command = this.client.commands.commands.get(g_cmd.name);

                if (command.staff_only) {
                    cmd_permissions.push({
                        id: guild.roles.everyone.id,
                        permission: false,
                        type: "ROLE"
                    });
                    staff_roles.forEach(roleId => {
                        cmd_permissions.push({
                            id: roleId,
                            permission: true,
                            type: "ROLE"
                        });
                    });
                }

                if (command.dev_only) {
                    cmd_permissions.push({
                        id: guild.roles.everyone.id,
                        permission: false,
                        type: "ROLE"
                    });
                    developers.forEach(userId => {
                        cmd_permissions.push({
                            id: userId,
                            permission: true,
                            type: "USER"
                        });
                    });
                }

                permissions.push({
                    id: g_cmd.id,
                    permissions: cmd_permissions
                });
            });

            log.debug(
                `Command permissions for "${guild.name}"`,
                require("util").inspect(permissions, {
                    colors: true,
                    depth: 10
                })
            );

            try {
                await guild.commands.permissions.set({ fullPermissions: permissions });
            } catch (error) {
                log.warn("An error occurred whilst updating command permissions");
                log.error(error);
            }
        });
    }

    /**
     * Execute a command
     * @param {Interaction} interaction - Command message
     */
    async handle(interaction) {
        if (!interaction.guild) return log.debug("Ignoring non-guild command interaction");
        const settings = await utils.getSettings(interaction.guild.id);

        const command = this.commands.get(interaction.commandName);
        if (!command) return;

        const bot_permissions = interaction.guild.me.permissionsIn(interaction.channel);
        const required_bot_permissions = [
            "ATTACH_FILES",
            "EMBED_LINKS",
            "MANAGE_CHANNELS",
            "MANAGE_MESSAGES"
        ];

        if (!bot_permissions.has(required_bot_permissions)) {
            const perms = required_bot_permissions.map(p => `\`${p}\``).join(", ");
            if (bot_permissions.has("EMBED_LINKS")) {
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor("ORANGE")
                            .setTitle("⚠️")
                            .setDescription(`QA Support requires the following permissions:\n${perms}`)
                    ],
                    ephermal: true
                });
            } else {
                await interaction.reply({
                    content: `QA Support requires the following permissions:\n${perms}`
                });
            }
            return;
        }

        const missing_permissions =
            command.permissions instanceof Array &&
            !interaction.member.permissions.has(command.permissions);
        if (missing_permissions) {
            const perms = command.permissions.map(p => `\`${p}\``).join(", ");
            return await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor(config.colors.error_color)
                        .setTitle("Error")
                        .setDescription(
                            `You do not have the permissions required to use this command:\n${perms}`
                        )
                ],
                ephemeral: true
            });
        }

        try {
            log.commands(`Executing "${command.name}" command (invoked by ${interaction.user.tag})`);
            await command.execute(interaction); // execute the command
        } catch (e) {
            log.warn(`An error occurred whilst executing the ${command.name} command`);
            log.error(e);
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor("ORANGE")
                        .setTitle("⚠️")
                        .setDescription(
                            "An unexpected error occurred during command execution.\nPlease ask an administrator to check the console output / logs for details."
                        )
                ],
                ephemeral: true
            }); // hopefully no user will ever see this message
        }
    }
};
