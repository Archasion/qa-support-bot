const EventListener = require("../modules/listeners/listener");
const roblox = require("noblox.js");

const { MessageEmbed } = require("discord.js");
const { MODERATION_CHAT, NDA_CHAT, VERIFIED_RULES, VERIFIED_INFO } = process.env;

module.exports = class GuildMemberUpdateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "guildMemberUpdate" });
	}

	async execute(oldMember, newMember) {
		// Check if the member was given the active tester role
		oldMember = oldMember.guild.members.cache.get(oldMember.id);
		newMember = newMember.guild.members.cache.get(newMember.id);

		if (
			!oldMember.roles.cache.has(config.roles.nda_verified) &&
			newMember.roles.cache.has(config.roles.nda_verified)
		) {
			const NDAChat = newMember.guild.channels.cache.get(NDA_CHAT);
			NDAChat.send(
				`Welcome ${newMember} to the NDA Team! Please make sure you read <#${VERIFIED_RULES}> as well as <#${VERIFIED_INFO}>. All regular rules also apply.`
			);
		}

		if (
			!oldMember.roles.cache.has(config.roles.active_tester) &&
			newMember.roles.cache.has(config.roles.active_tester)
		) {
			const moderationThread = await newMember.guild.channels.cache
				.get(MODERATION_CHAT)
				.threads.cache.get("943409502835867668");

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
			moderationThread.send({ embeds: [embed] });
		}
	}
};
