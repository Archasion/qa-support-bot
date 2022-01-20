// ANCHOR Constants
const express = require("express");
const yaml = require("js-yaml");
const fs = require("fs");
const app = express();
const port = 3000;

const { path } = require("./utils/fs");

const fileContents = fs.readFileSync(path("/src/config.yaml"), "utf8");

global.config = yaml.load(fileContents);
global.log = require("./logger");

app.get("/", (req, res) => res.send("Hello World!"));
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

process.title = "QA Support";

// eslint-disable-next-line no-unused-vars
const checkFile = (file, example) => {
	if (fs.existsSync(path(file))) {
		return true;
	}

	if (!fs.existsSync(path(example))) {
		console.log(
			`\x07Error: "${file}" not found, and unable to create it due to "${example}" being missing.`
		);
		return process.exit();
	}

	console.log(`Copying "${example}" to "${file}"...`);
	fs.copyFileSync(path(example), path(file));
	return false;
};

require("dotenv").config({ path: path("./.env") });
require("./utils/functions")();

process.on("unhandledRejection", error => {
	if (error instanceof Error) {
		log.warn(`Uncaught ${error.name} (${error.message})`);
	}

	if (error.message !== "Missing Access") {
		log.error(error);
	}
});

const ListenerLoader = require("./modules/listeners/loader");
const CommandManager = require("./modules/commands/manager");
const TicketManager = require("./modules/tickets/manager");
const LoggingManager = require("./modules/action/manager");
const DiscordUtils = require("./utils/discord");
const Cryptr = require("cryptr");

const { Client, Intents } = require("discord.js");

/**
 * The Discord client
 * @typedef {Bot} Bot
 * @extends {Client}
 */
class Bot extends Client {
	constructor() {
		super({
			intents: [
				Intents.FLAGS.GUILDS,
				Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
				Intents.FLAGS.GUILD_MEMBERS,
				Intents.FLAGS.GUILD_MESSAGES,
				Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
				Intents.FLAGS.GUILD_VOICE_STATES,
				Intents.FLAGS.GUILD_SCHEDULED_EVENTS
			],
			partials: [
				"CHANNEL",
				"MESSAGE",
				"REACTION",
				"VOICE",
				"GUILD_SCHEDULED_EVENT",
				"GUILD_MEMBER"
			],
			presence: DiscordUtils.selectPresence()
		});

		(async () => {
			global.cryptr = new Cryptr(process.env.DB_ENCRYPTION_KEY);
			global.db = await require("./database")(this);
			global.tickets = new TicketManager(this);
			global.action = new LoggingManager(this);
			global.utils = new DiscordUtils(this);

			log.info("Connecting to Discord API...");

			this.commands = new CommandManager(this);

			const listeners = new ListenerLoader(this);
			listeners.load();

			this.setMaxListeners(config.max_listeners);
			this.login();
		})();
	}
}

// eslint-disable-next-line no-new
new Bot();
