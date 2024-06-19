require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');
const http = require('http');
const cors = require('cors');
const db = require('./dbtools');
const ai = require('./aitools');
let serverStatus;
let serverLog = [];
export const serverAktionen = [
    { name: "Info", beschreibung: "Informationen bereitstellen und/oder aus Datenbank abfragen" },
    { name: "Select", beschreibung: "Dokument(e) auswählen" },
    { name: "Create", beschreibung: "Dokument(e) erstellen" },
    { name: "Change", beschreibung: "Dokument(e) bearbeiten" }
];
async function initProgramm() { try {
    await db.initDB();
}
catch (err) {
    process.exit(1);
} }
const app = express();
app.use(cors());
app.use(bodyParser.json());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] } });
const PORT = process.env.PORT || 3023;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
async function handleAnfrage(serverStatus, socket) {
    let enoughInfo = await ai.decideOnEnoughInfoToContinue(serverStatus);
    if (enoughInfo) {
        if (serverStatus.aktion === "Info") {
            let response = await ai.getInfoAnswer(serverStatus);
            socket.emit("info-answer", response);
        }
        else if (serverStatus.aktion === "Select") {
            let response = await ai.proposeDocumentToSelect(serverStatus);
            socket.emit("document-select", response);
        }
        else if (serverStatus.aktion === "Create") {
            let response = await ai.proposeDocumentToSelect(serverStatus);
            socket.emit("document-create", response);
        }
        else if (serverStatus.aktion === "SelectLocation") {
            let response = await ai.proposeDocumentToSelect(serverStatus);
            socket.emit("location-select", response);
        }
    }
    else {
        let nextStep = await ai.decideOnNextStep(serverStatus);
        if (nextStep) {
            socket.emit('propose', nextStep);
            handleAnfrage(serverStatus, socket);
        }
    }
}
async function initAnfrage(anfrageParams) {
    let response = await ai.decideOnAnfragenAktion(anfrageParams);
    if (!response) {
        return null;
    }
    else {
        let loServerStatus = {
            aktion: response.aktion,
            beschreibung: response.beschreibung,
            anfrage: anfrageParams.anfrage,
            websiteParam: {
                cesium_coordinates: anfrageParams.cesium_coordinates,
                selected_collection: anfrageParams.selected_collection,
                selected_document: anfrageParams.selected_document
            },
            verlauf: []
        };
        if (response.aktion === "Info") {
            let bereich = await ai.decideOnAnfragenBereich(serverStatus);
            loServerStatus.bereich = bereich;
        }
        return loServerStatus;
    }
}
async function tryToQueryForInfo(status) {
    let queryProposal;
    if (status.bereich === "Finanzen") {
        queryProposal = await ai.tryToRetrieveInformationFromDB(status.anfrage, {}, status.verlauf);
    }
    else {
        queryProposal = await ai.tryToRetrieveFinanzInformationFromDB(status.anfrage, status.verlauf);
    }
    if (queryProposal.queryStatement === "") {
        return { queryStatement: "", queryResult: [] };
    }
    else {
        let loData = await db.executeQuery(queryProposal.queryStatement);
        return { queryStatement: queryProposal.queryStatement, queryResult: loData };
    }
}
async function tryToReturnInformation(status) {
    if (status.bereich) {
        if (status.bereich === "Finanzen") {
            return await ai.tryToReturnFinanzInformation(status.anfrage, status.verlauf);
        }
    }
    return await ai.tryToReturnInformation(status.anfrage, status.verlauf);
}
io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('process-command', async (data) => {
        console.log(`PROCESS COMMAND: ${JSON.stringify(data)}`);
        try {
            if (!serverStatus) {
                let newServerStatus = await initAnfrage(data);
                if (newServerStatus) {
                    handleAnfrage(newServerStatus, socket);
                }
                else {
                    socket.emit('invalid-command');
                }
            }
            else {
                serverStatus.verlauf.push({ aktion: "UserInput", input: data.anfrage });
                handleAnfrage(serverStatus, socket);
            }
        }
        catch (error) {
            console.log(error.message);
            socket.emit('error', { status: 500, error: error.message });
        }
    });
    socket.on('server-reset', async (data) => {
        serverLog = [];
        socket.emit('server-reseted');
    });
    socket.on("confirm", async (data) => {
        //confirmAction()
        //handleAnfrage(serverLog)
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});
(async () => {
    try {
        await initProgramm();
    }
    catch (error) {
        console.error('An error occurred during initialization: ' + error.message);
    }
})();
