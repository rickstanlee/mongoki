require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const mongoClient = new MongoClient(process.env.MONGO_URL);

async function runTest() {    
    try {
        await mongoClient.connect();
        dbClient = await mongoClient.db('enrico');
        const startDate = new Date('2024-04-01T00:00:00.000Z');
        const endDate = new Date('2024-04-30T23:59:59.999Z'); 
        const query = { datum: { $gte: startDate, $lte: endDate }};
        let loResult =  await dbClient.collection('buchung').find(query).toArray();
        console.log(loResult)
    } catch (err) {
        process.exit(1);
    }
}

runTest()
