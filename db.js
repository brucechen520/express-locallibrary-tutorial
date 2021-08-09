var mongoose = require('mongoose');
var mongoDB = 'mongodb://localhost:27017/library?retryWrites=true';
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));