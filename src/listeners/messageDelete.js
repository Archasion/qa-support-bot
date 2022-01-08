const EventListener = require("../modules/listeners/listener");

module.exports = class MessageDeleteEventListener extends EventListener {
    constructor(client) {
        super(client, { event: "messageDelete" });
    }

    async execute(message) {
        if (!message.guild) return;
    }
};
