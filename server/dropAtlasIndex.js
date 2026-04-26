const mongoose = require('mongoose');
const uri = 'mongodb://sreenathreddy0404_db_user:kissankonnect@ac-tgiuvm4-shard-00-00.izp1qvv.mongodb.net:27017,ac-tgiuvm4-shard-00-01.izp1qvv.mongodb.net:27017,ac-tgiuvm4-shard-00-02.izp1qvv.mongodb.net:27017/?ssl=true&replicaSet=atlas-14eopn-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(uri).then(async () => {
  console.log('Connected to Atlas');
  const db = mongoose.connection.db;
  
  // Try dropping the bargain index
  try {
    const indexes = await db.collection('bargains').indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    // We can just drop all indexes and let Mongoose recreate them
    await db.collection('bargains').dropIndexes();
    console.log('All indexes dropped successfully. Mongoose will rebuild them on next startup/model compilation.');
  } catch (err) {
    console.error('Error dropping indexes:', err.message);
  }
  
  process.exit(0);
}).catch(e => {
  console.error('Connection error:', e);
  process.exit(1);
});
