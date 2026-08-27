const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true
    },
    event_id: {
        type:String,
        required:true
    },
    upload_by: {
        type:String,
        
    },
    embedding: String
});

module.exports = mongoose.models.Photo || mongoose.model("Photo", photoSchema);
 