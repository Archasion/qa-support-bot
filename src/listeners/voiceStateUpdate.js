const EventListener = require("../modules/listeners/listener");

const { NDA_NO_MIC, NDA_CHAT_VC, NDA_TESTING_VC } = process.env;

module.exports = class VoiceStateUpdateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "voiceStateUpdate" });
	}

	async execute(newMember, oldMember) {
		let oldState;
		let newState;

		if (oldMember.channelId) {
			oldState = oldMember.channelId;
		}

		if (newMember.channelId) {
			newState = newMember.channelId;
		}

		const publicNoMic = this.client.channels.cache.get(config.channels.no_mic);
		const NDANoMic = this.client.channels.cache.get(NDA_NO_MIC);

		const publicVC = config.vcs.chat;
		const publicTestingVC = config.vcs.testing;

		const user = await this.client.users.fetch(newMember.id);

		// Hide the no-mic channel
		async function hideChannel(channelTohide) {
			await channelTohide.permissionOverwrites.delete(
				user,
				"User left VC, no-mic is no longer needed"
			);
		}

		// No-mic for public VC
		if (
			(oldState === publicVC && newState !== publicVC) ||
			(oldState === publicTestingVC && newState !== publicTestingVC)
		) {
			await publicNoMic.permissionOverwrites.create(user, {
				VIEW_CHANNEL: true,
				SEND_MESSAGES: true
			});
		} else hideChannel(publicNoMic);

		// No-mic for NDA VC
		if (
			(oldState === NDA_CHAT_VC && newState !== NDA_CHAT_VC) ||
			(oldState === NDA_TESTING_VC && newState !== NDA_TESTING_VC)
		) {
			await NDANoMic.permissionOverwrites.create(user, {
				VIEW_CHANNEL: true,
				SEND_MESSAGES: true
			});
		} else hideChannel(NDANoMic);
	}
};
