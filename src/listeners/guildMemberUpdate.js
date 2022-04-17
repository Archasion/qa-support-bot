const EventListener = require("../modules/listeners/listener");
const roblox = require("noblox.js");

const { EmbedBuilder } = require("discord.js");
const { MODERATION_CHAT, ACTIVE_TESTER_LOGS } = process.env;

module.exports = class GuildMemberUpdateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "guildMemberUpdate" });
	}

	async execute(oldMember, newMember) {
		oldMember = oldMember.guild.members.cache.get(oldMember.id);
		newMember = newMember.guild.members.cache.get(newMember.id);

		// Check if the member was given the active tester role
		if (
			!oldMember.roles.cache.has(config.roles.activeTester) &&
			newMember.roles.cache.has(config.roles.activeTester)
		) {
			const moderationThread = await newMember.guild.channels.cache
				.get(MODERATION_CHAT)
				.threads.cache.get(ACTIVE_TESTER_LOGS);

			const embed = new EmbedBuilder()

				.setAuthor({
					name: newMember.displayName,
					iconURL: newMember.displayAvatarURL({ dynamic: true })
				})

				.setColor(config.colors.default)
				.setTitle("New Active Tester")
				.setDescription(`Discord Tag: \`${newMember.user.tag}\``)
				.setFooter({ text: `ID: ${newMember.id}` });

			try {
				// Get their Roblox profile (if applicable)
				const id = await roblox.getIdFromUsername(newMember.displayName);
				embed.data.description += `\nRoblox Account: [${newMember.displayName}](https://roblox.com/users/${id}/profile)`;
			} catch {
				log.error("Couldn't find user");
			}

			// Send the notification
			moderationThread.send({ embeds: [embed] });
		}
	}
};
