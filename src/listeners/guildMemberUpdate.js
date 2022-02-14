const EventListener = require("../modules/listeners/listener");
const roblox = require("noblox.js");

const { MessageEmbed } = require("discord.js");
const { MODERATION_CHAT } = process.env;

module.exports = class GuildMemberUpdateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "guildMemberUpdate" });
	}

	async execute(oldMember, newMember) {
		// Check if the member was given the active tester role
		if (
			!oldMember.roles.cache.has(config.roles.active_tester) &&
			newMember.roles.cache.has(config.roles.active_tester)
		) {
			const moderationChat = await newMember.guild.channels.fetch(MODERATION_CHAT);

			const embed = new MessageEmbed()

				.setColor(config.colors.default_color)
				.setAuthor({
					name: newMember.displayName,
					iconURL: newMember.displayAvatarURL({ dynamic: true })
				})
				.setTitle("New Active Tester")
				.setDescription(`Discord Tag: \`${newMember.user.tag}\``)
				.setFooter({ text: `ID: ${newMember.id}` });

			try {
				// Get their Roblox profile (if applicable)
				const ID = await roblox.getIdFromUsername(newMember.displayName);
				embed.description += `\nRoblox Account: [${newMember.displayName}](https://roblox.com/users/${ID}/profile)`;
			} catch {
				log.error("Couldn't find user");
			}

			// Send the notification
			moderationChat.send({ embeds: [embed] });
		}
	}
};
