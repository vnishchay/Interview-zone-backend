const mongoose = require("mongoose");
const dotEnv = require("dotenv");

dotEnv.config();

const connection = async () => {
  const mongoUser = process.env.MONGODB_USER;
  const mongoPassword = process.env.MONGODB_PASSWORD;
  const mongoCluster = process.env.MONGODB_CLUSTER;
  const mongoDatabase = process.env.MONGODB_DATABASE;

  const mongoURI = `mongodb+srv://${mongoUser}:${mongoPassword}@${mongoCluster}/${mongoDatabase}`;

  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

module.exports = connection;
