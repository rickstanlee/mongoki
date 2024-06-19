require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
async function initProgramm() {
    try {
        const mongoClient = new MongoClient(process.env.MONGO_URL);
        await mongoClient.connect();
        let dbClientEnrico = await mongoClient.db('enrico');
        let dbClientFinance = await mongoClient.db('finance');
        let loBuchungen = await dbClientFinance.collection('buchung').find({ benutzer: 1 }).toArray();
        for (let i = 0; i < loBuchungen.length; i++) {
            let loNewBuchung = loBuchungen[i];
            loNewBuchung.datum = new Date(loBuchungen[i].datum).toISOString();
            await dbClientEnrico.collection('buchung').insertOne(loBuchungen[i]);
            console.log(`Buchung ${i + 1} kopiert`);
        }
        return {};
    }
    catch (err) {
        console.log(err.message);
        process.exit(1);
    }
}
(async () => {
    try {
        await initProgramm();
    }
    catch (error) {
        console.log(error.message);
    }
})();
