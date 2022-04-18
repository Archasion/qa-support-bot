let current_presence = -1;

module.exports = class DiscordUtils {
	constructor(client) {
		this.client = client;
	}

	/**
	 * Check if a guild member is a moderator
	 * @param {GuildMember} member - the guild member
	 * @returns {boolean}
	 */
	async isStaff(member) {
		return member.roles.cache.some(
			role =>
				role.id === config.roles.moderator ||
				role.id === config.roles.manager ||
				role.id === config.roles.serverModerator ||
				role.id === config.roles.serverAdministrator
		);
	}

	/**
	 * Check if a guild member is an NDA Verified tester
	 * @param {GuildMember} member - the guild member
	 * @returns {boolean}
	 */
	async isNDA(member) {
		return member.roles.cache.some(role => role.id === config.roles.ndaVerified);
	}

	/**
	 * Check if a guild member is an active tester
	 * @param {GuildMember} member - the guild member
	 * @returns {boolean}
	 */
	async isActive(member) {
		return member.roles.cache.some(role => role.id === config.roles.activeTester);
	}

	/**
	 * Check if a guild member is a moderator
	 * @param {GuildMember} member - the guild member
	 * @returns {boolean}
	 */
	async isModerator(member) {
		return member.roles.cache.some(role => role.id === config.roles.moderator);
	}

	/**
	 * Check if a guild member is a manager
	 * @param {GuildMember} member - the guild member
	 * @returns {boolean}
	 */
	async isManager(member) {
		return member.roles.cache.some(role => role.id === config.roles.manager);
	}

	/**
	 * Check if a guild member is a developer
	 * @param {GuildMember} member - the guild member
	 * @returns {boolean}
	 */
	async isDeveloper(member) {
		return config.users.developers.includes(member.id);
	}

	/**
	 * Check if a guild member is verified
	 * @param {GuildMember} member - the guild member
	 * @returns {boolean}
	 */
	async isVerified(member) {
		return member.roles.cache.some(role => role.id === config.roles.public);
	}

	/**
	 * Select a presence from the config
	 * @returns {PresenceData}
	 */
	static selectPresence() {
		const { length } = config.presence.options;
		let num;

		if (length === 0) return {};
		if (length === 1) num = 0;
		else if (config.presence.randomize) num = Math.floor(Math.random() * length);
		else {
			current_presence += 1;
			if (current_presence === length) current_presence = 0;
			num = current_presence;
		}

		const { activity: name, status, type, url } = config.presence.options[num];
		return {
			activities: [{ name, type, url }],
			status
		};
	}
};
