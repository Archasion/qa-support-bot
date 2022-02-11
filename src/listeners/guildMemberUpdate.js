const EventListener = require("../modules/listeners/listener");
const roblox = require("noblox.js");

const { MessageEmbed } = require("discord.js");
const { MODERATION_CHAT } = process.env;

module.exports = class GuildMemberUpdateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "guildMemberUpdate" });
	}

	async execute(old_member, new_member) {
		if (
			!old_member.roles.cache.has(config.roles.active_tester) &&
			new_member.roles.cache.has(config.roles.active_tester)
		) {
			const logging_channel = await new_member.guild.channels.fetch(MODERATION_CHAT);

			const embed = new MessageEmbed()

				.setColor(config.colors.default_color)
				.setAuthor({
					name: new_member.displayName,
					iconURL: new_member.displayAvatarURL({ dynamic: true })
				})
				.setTitle("New Active Tester")
				.setDescription(`Discord Tag: \`${new_member.user.tag}\``)
				.setFooter({ text: `ID: ${new_member.id}` });

			try {
				const ID = await roblox.getIdFromUsername(new_member.displayName);
				embed.description += `\nRoblox Account: [${new_member.displayName}](https://roblox.com/users/${ID}/profile)`;
			} catch {
				log.error("Couldn't find user");
			}

			logging_channel.send({ embeds: [embed] });
		}
	}
};
