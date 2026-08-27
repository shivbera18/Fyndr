const mongoose = require("mongoose");

const studioSchema = new mongoose.Schema({
    studio_name: {
        type:String,
        required:true
    },
    phone_no: {
        type:String,
        required:true
    },
    address: {
        type:String,
        
    },

    offer:{
        type:String,
    },
    description:{
        type:String
    },
    create_by:{
        type:String,
        required:true,
        unique: true,
    }
}, { timestamps: true });

module.exports = mongoose.models.Studio || mongoose.model("Studio", studioSchema);
 