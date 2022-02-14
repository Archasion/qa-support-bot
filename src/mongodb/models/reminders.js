const mongoose = require("mongoose");
const { Schema } = mongoose;

const reminderSchema = new Schema({
	id: {
		type: String,
		required: true
	},
	author: {
		type: String,
		required: true
	},
	channel: {
		type: String,
		required: true
	},
	start_time: {
		type: Number,
		required: true
	},
	end_time: {
		type: Number,
		required: true
	},
	text: {
		type: String,
		required: true
	}
});

const Reminders = mongoose.model("Reminders", reminderSchema);
module.exports = Reminders;
