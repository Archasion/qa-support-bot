const EventListener = require("../modules/listeners/listener");
const { NDA_NO_MIC, NDA_CHAT_VC, NDA_TESTING_VC } = process.env;

module.exports = class VoiceStateUpdateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "voiceStateUpdate" });
	}

	async execute(new_member, old_member) {
		let old_state;
		let new_state;

		if (old_member.channelId) {
			old_state = old_member.channelId;
		}

		if (new_member.channelId) {
			new_state = new_member.channelId;
		}

		const public_no_mic = await this.client.channels.cache.get(config.channels.no_mic);
		const nda_no_mic = await this.client.channels.cache.get(NDA_NO_MIC);

		const public_vc = config.vcs.chat;
		const public_testing_vc = config.vcs.testing;

		const user = await this.client.users.fetch(new_member.id);

		async function hideChannel(channel_to_hide) {
			await channel_to_hide.permissionOverwrites.delete(
				user,
				"User left VC, no-mic is no longer needed"
			);
		}

		// No-mic for public VC
		if (
			(old_state === public_vc && new_state !== public_vc) ||
			(old_state === public_testing_vc && new_state !== public_testing_vc)
		) {
			await public_no_mic.permissionOverwrites.create(user, {
				VIEW_CHANNEL: true,
				SEND_MESSAGES: true
			});
		} else hideChannel(public_no_mic);

		// No-mic for NDA VC
		if (
			(old_state === NDA_CHAT_VC && new_state !== NDA_CHAT_VC) ||
			(old_state === NDA_TESTING_VC && new_state !== NDA_TESTING_VC)
		) {
			await nda_no_mic.permissionOverwrites.create(user, {
				VIEW_CHANNEL: true,
				SEND_MESSAGES: true
			});
		} else hideChannel(nda_no_mic);
	}
};
