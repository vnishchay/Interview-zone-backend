const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    sendBy : {
         type : Schema.Types.ObjectId
    },
    messages : {
        type : String
    },
    sendTo : {
        type : Schema.Types.ObjectId
    }
},
{
    timestamps : true 
}
);

module.exports = mongoose.model("Message", schema, 'Message Model');

