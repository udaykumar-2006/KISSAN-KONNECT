const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/kissan_konnect').then(async () => {
  const db = mongoose.connection.db;
  await db.collection('bargains').dropIndexes();
  console.log('Indexes dropped');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
