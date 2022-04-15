const EventListener = require("../modules/listeners/listener");

const { NDA_NO_MIC, NDA_CHAT_VC, NDA_TESTING_VC, VERIFIED_STAGE, NDA_CHAT_VC_2 } = process.env;

module.exports = class VoiceStateUpdateEventListener extends EventListener {
	constructor(client) {
		super(client, { event: "voiceStateUpdate" });
	}

	async execute(newMember, oldMember) {
		let oldState;

		if (oldMember.channelId) {
			oldState = oldMember.channelId;
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
		if (oldState === publicVC || oldState === publicTestingVC) {
			await publicNoMic.permissionOverwrites.create(user, {
				SendMessages: true
			});
		} else hideChannel(publicNoMic);

		// No-mic for NDA VC
		if (
			oldState === NDA_CHAT_VC ||
			oldState === NDA_TESTING_VC ||
			oldState === VERIFIED_STAGE ||
			oldState === NDA_CHAT_VC_2
		) {
			await NDANoMic.permissionOverwrites.create(user, {
				SendMessages: true
			});
		} else hideChannel(NDANoMic);
	}
};
