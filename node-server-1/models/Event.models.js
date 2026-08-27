const mongoose = require("mongoose");


const eventSchema = new mongoose.Schema({
    event_name: {
        type: String,
        required: true,
    },
    pin: {
        type: String,
    },
    created_id: {
        type:String
    },
    event_photo:{
        type:String,
    }
}, { timestamps: true });

module.exports = mongoose.models.Event || mongoose.model("Event", eventSchema);
