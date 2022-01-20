/* eslint-disable new-cap */
const { DataTypes } = require("sequelize");

module.exports = (_client, sequelize) => {
	const { DB_TABLE_PREFIX } = process.env;

	sequelize.define(
		"Reminder",
		{
			user_id: DataTypes.CHAR(19),
			channel_id: DataTypes.CHAR(19),
			reminder_id: DataTypes.STRING,
			message: DataTypes.STRING,
			before: DataTypes.NUMBER,
			after: DataTypes.NUMBER
		},
		{
			tableName: DB_TABLE_PREFIX + "list_reminders"
		}
	);
};
