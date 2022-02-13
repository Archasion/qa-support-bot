const mongoose = require("mongoose");
const { Schema } = mongoose;

const ticketSchema = new Schema({
	count: {
		type: String,
		required: true
	},
	thread: {
		type: String,
		required: true
	},
	author: {
		type: String,
		required: true
	},
	topic: {
		type: String,
		required: true
	},
	first_message: {
		type: String,
		required: true
	},
	active: {
		type: Boolean,
		default: true,
		required: false
	}
});

const Tickets = mongoose.model("Tickets", ticketSchema);
module.exports = Tickets;
