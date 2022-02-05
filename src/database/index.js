const { Sequelize } = require("sequelize");
const fs = require("fs");
const { path } = require("../utils/fs");

module.exports = async client => {
	require("sqlite3");
	log.info("Using SQLite storage");

	const sequelize = new Sequelize({
		dialect: "sqlite",
		logging: text => log.debug(text),
		storage: path("./database.sqlite")
	});

	try {
		await sequelize.authenticate();
		log.success("Connected to database successfully");
	} catch (error) {
		log.warn("Failed to connect to database");
		log.error(error);
		return process.exit();
	}

	const models = fs
		.readdirSync(path("./src/database/models"))
		.filter(filename => filename.endsWith(".model.js"));

	for (const model of models) require(`./models/${model}`)(client, sequelize);

	await sequelize.sync({ alter: false });
	return sequelize;
};
