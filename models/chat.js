const mongoose = require("mongoose");
const bcrypt = require('bcryptjs')
const Schema = mongoose.Schema;
const schema = new mongoose.Schema({
    users : {
        type : [Schema.Types.ObjectId]
    },
    messages : {
        type : [Schema.Types.ObjectId]
    }
},
{
    timestamps : true 
}
);


schema.methods.addUsername = async function () {
    return bcrypt.hash(this.password.substr(4), 6);
}

schema.methods.CheckPass = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model("Chat", schema, 'Chat Model');
