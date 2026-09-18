import mongoose from 'mongoose';

const uri = 'mongodb://localhost:27017/localfix';
await mongoose.connect(uri);
console.log('Connected to', mongoose.connection.db.databaseName);

const cols = await mongoose.connection.db.listCollections().toArray();
console.log('Collections:', cols.map(c => c.name));

const complaints = await mongoose.connection.db.collection('complaints').find({}).toArray();
console.log('Complaints count:', complaints.length);
console.log(JSON.stringify(complaints.slice(0, 3), null, 2));

await mongoose.disconnect();
