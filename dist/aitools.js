const { OpenAI } = require('openai');
const openai = new OpenAI();
const db = require("./dbtools");
const main = require('./server');
let beispielAnfrage1 = {
    selected_collection: null,
    selected_document: null,
    cesium_coordinates: [91.2323, 42.2323],
    user_request: "Wie spät ist es?",
    log: []
};
let beispielAntwort1 = {
    aktion: "Info",
    beschreibung: "Uhrzeit zurück geben"
};
let beispielAnfrage2 = {
    selected_collection: null,
    selected_document: null,
    cesium_coordinates: [91.2323, 42.2323],
    user_request: "Bitte zeige mir die letzte Buchung",
    log: []
};
let beispielAntwort2 = {
    aktion: "Select",
    beschreibung: "Letzte Buchung auswählen"
};
let beispielAnfrage3 = {
    selected_collection: null,
    selected_document: null,
    cesium_coordinates: [91.2323, 42.2323],
    user_request: "Wie viel Geld hab ich auf der Sparkasse?",
    log: []
};
let beispielAntwort3 = {
    aktion: "Info",
    beschreibung: "Kontostand Sparkasse zurückgeben"
};
let enoughInfoExample1 = {
    anfrage: {
        anfrage: "Wie viel Geld hab ich auf dem Konto?",
        verlauf: []
    },
    antwort: {
        genug: false
    }
};
let enoughInfoExample2 = {
    anfrage: {
        anfrage: "Wie viel Geld hab ich auf dem Konto?",
        verlauf: [{ aktion: "GetKontostand", aktion_data: { konto: 1, konto_name: "Sparkasse", betrag: 1004 } }]
    },
    antwort: {
        genug: true
    }
};
let enoughInfoExample3 = {
    anfrage: {
        anfrage: "Wie geht es dir?",
        verlauf: []
    },
    antwort: {
        genug: true
    }
};
export async function getAIAnswer(prompt, json) {
    try {
        console.log(`GET AI ANSWER!\nprompt: ${prompt}`);
        let responseObject;
        if (json) {
            responseObject = await openai.chat.completions.create({
                messages: [{ role: "system", content: prompt }], model: "gpt-4o", response_format: { type: "json_object" }
            });
        }
        else {
            responseObject = await openai.chat.completions.create({ messages: [{ role: "system", content: prompt }], model: "gpt-4o" });
        }
        let content = responseObject.choices[0].message.content.trim();
        if (json) {
            return JSON.parse(content);
        }
        else {
            return content;
        }
    }
    catch (error) {
        return `There was an unexpected error:  ${error.message}`;
    }
}
export async function decideOnAnfragenAktion(anfrageParameter) {
    try {
        const prompt = `Du bist eine clevere AI, die Teil einer ausgeklügelten Website ist. 
        An diese ist eine MongoDB Datenbank mit Collections und Daten folgender AJV-Formata angeschlossen. 
        Auf der Website wird diese MongoDB visualisiert und zudem eine Weltkarte mittels CesiumJS angezeigt. 
        Der User hat eine Kommandozeile über welche er dir Anfragen schicken kann, deine Aufgabe ist es nun, basierend auf den aktuellen
        Website Parametern und der Nutzeranfrage zu entscheiden, welche Aktion ausgeführt werden sollen.

        **Mögliche Aktionen**
        ${JSON.stringify(main.serverAktionen)}
        
        Gebe dafür bitte ein JSON Objekt mit einer Property "aktion" zurück, mit dem Namen der entsprechend auszuführenden Aktion, sowie eine
        Property beschreibung, die eine kurze Beschreibung enthält, was genauer getan werden soll.

        Anfrage-Parameter:
        ${JSON.stringify(anfrageParameter)} 

        **Beispiel 1**
        Anfrage-Parameter: ${JSON.stringify(beispielAnfrage1)}
        Antwort: ${JSON.stringify(beispielAntwort1)}

        **Beispiel 2**
        Anfrage-Parameter: ${JSON.stringify(beispielAnfrage2)}
        Antwort: ${JSON.stringify(beispielAntwort2)}

        **Beispiel 3**
        Anfrage-Parameter: ${JSON.stringify(beispielAnfrage3)}
        Antwort: ${JSON.stringify(beispielAntwort3)}
        `;
        let response = await getAIAnswer(prompt, true);
        console.log(`AI ANSWER ANFRAGEN TYP: ${JSON.stringify(response)}`);
        if (response.aktion && response.beschreibung) {
            return response;
        }
        else {
            return null;
        }
    }
    catch (error) {
        return null;
    }
}
export async function decideOnAnfragenBereich(anfrage, serverLog) {
    try {
        const prompt = `Du bist eine clevere AI, die Teil eines größeren ausgeklügelten Programms ist. Deine Aufgabe ist es den Programmablauf
        zu steuern und zurückzugeben, welchem Bereich eine User Anfrage zuzuordnen ist.

        Gebe dafür bitte ein JSON Objekt mit einer Property "bereich" zurück, die einen der Bereiche aus folgender Liste enthält:

        **Mögliche Bereiche**
        "Finanzen": Gebe "Finanzen" zurück, wenn die Anfrage sich auf Buchungen, Kontostände oder Ähnliches bezieht
        "Personen": Gebe "Personen" zurück, wenn sich die Anfrage auf Personen bezieht
        "Default": Gebe "Default" zurück, wenn sich die Anfrage nicht wirklich zu irgendeiner der oben genannten Bereiche zuordnen lässt
        
        Anfrage des Benutzer: ${anfrage}
        Bisher durchgeführte Aktionen und Anfragen (vielleicht wichtig für Kontext): ${JSON.stringify(serverLog)}

        **Beispiel 1**
        Anfrage: "Wie viel Geld hab ich auf meinem Sparkassen konto?"
        Antwort: {bereich: "Finanzen"}
        
        **Beispiel 2**
        Anfrage: "Welche Konten hab ich alle bei Sportwetten Anbietern?"
        Antwort: {bereich: "Finanzen"}

        **Beispiel 3**
        Anfrage: "Mit wem ist der und der alles verwandt?"
        Antwort: {bereich: "Personen"}

        **Beispiel 4**
        Anfrage: "Was kommt alles in eine Holondaise"
        Antwort: {bereich: "Default"}

        `;
        let response = await getAIAnswer(prompt, true);
        console.log(`AI ANSWER ANFRAGEN TYP: ${JSON.stringify(response)}`);
        if (response.bereich) {
            return response.bereich;
        }
        else {
            return "Default";
        }
    }
    catch (error) {
        return "Default";
    }
}
export async function tryToRetrieveFinanzInformationFromDB(anfrage, verlauf) {
    try {
        const prompt = `Du bist eine clevere AI, die Teil eines größeren ausgeklügelten Finanz Programms ist
        Du hilfst dem User Informationen zusammenzutragen, Buchungen zu suchen und Summen zu berechnen. Alle notwendigen Daten sind in den beiden
        Collections "Konto" und "Buchung" zu finden. Die Daten sind nach dem Prinzip der doppelten Buchführung erfasst, das heißt es wird nach
        dem Prinzip Soll an Haben gebucht. Wenn beispielsweise bar im Lidl eingekauft wurde,
        so ist in dem Buchunsdatensatz als Sollkonto beispielsweise Konsumausgaben erfasst und als haben Konto beispielsweise das Sparkassen-Konto.
        Berücksichtige diese Logik korrekt beim Bilden von Summen, beim Berechnen von Salden und Kontoständen. Haben bedeutet ein Abgang von Geld,
        Soll ein Zufluss!
        
        Der User hat jetzt folgende Anfrage gestellt: ${JSON.stringify(anfrage)}
        Bislang ist vom Programm bereits folgendes gemacht worden: ${JSON.stringify(verlauf)}

        Beachte bereits ausgeführte Querys und deren Ergebnise auf jeden Fall bei deiner Beurteilung und schlage nicht die selben vor!

        Achte darauf, dass in der Buchung Tabelle die "soll" und "haben" Properties Referenzen zu den IDs der Konten in der "Konto"
        Collection sind! Alle Konten der Konto Collection sind folgende: ${JSON.stringify(db.konten)}.
        
        Die Datenstruktur der Buchungen lässt sich in AJV Form wie folgt beschreiben: ${JSON.stringify(db.systemSchemas['buchung'])}
         
        Deine Aufgabe ist es nun zu entscheiden, ob in einem nächsten Schritt über eine Datenabfrage zur Beantwortung benötigte Information
        gewonnen werden können, damit eine weitere AI diese zusammentragen kann. Du kennst die Datenbankstruktur sehr genau und kannst
        präzise einschätzen, ob bereits über einen entsprechenden Query einer Collection der MongoDB alle benötigten Informationen gewonnen werden
        können. 
        
        Bitte gebe ein JSON Objekt mit einer Property "queryStatement" zurück, die den Query als später vom Programm ausführbaren Javascript 
        Code enthält. Verwende dabei die bereits zuvor initialisierte Konstante dbClient, wie im Beispiel gezeigt! Führe gerne sehr unspezifische 
        Querys aus und lasse dir ganze Collections anzeigen, wenn darin dann die benötigten Informationen zu finden sein könnten. 
        Falls die Informationen vermutlich nicht in der Datenbank zu finden ist, gebe als "queryStatement" einen leeren String zurück. Gebe in
        diesem Fall eine weitere Property "problem" zurück, die ein String ist und eine kurze Erklärung enthält, warum die Informationen über
        eine Datenbankabfrage nicht zu finden ist. Hast du erfolgreich ein queryStatement ausfindig machen können, mit dem Informationen
        zur Beantwortung der Anfrage gewonnen werden können, gebe zudem eine Property Beschreibung mit, mit einer kurzen Erklärung dazu,
        was mit dem Query gefunden werden soll.

        **Beispiel 1**
        Frage: "Wie teuer ist die durchschnittliche Miete wo ich wohne?"
        Antwort: {
            queryStatement: "",
            problem: "Keine der verfügbaren Tabellen scheint Informationen zu ortsüblichen Mieten zu enthalten"
        }

        **Beispiel 2**
        Frage: "Kannst du mir die letzte Buchung meines Vaters zeigen"
        Antwort: {
            queryStatement: "return await dbClient.collection('konto').find().toArray()",
            beschreibung: "Konto-Id des Konto des Vaters ermitteln"
        }

        **Beispiel 3**
        Frage: "Wann war meine letzte Buchung?"
        Verlauf: []
        Antwort: {queryStatement: "return await dbClient.collection('buchung').find().toArray()", beschreibung: "Alle Buchungen anzeigen um dann die letzte zu ermitteln"}


        Sei gerne sehr kreativ bei deinen MongoDB Queries und verwende sort, projections, aggregate und alle möglichen Komplexen Funktionen die 
        du dir ausdenken kannst, um eine möglichst gute Datengrundlage zur Beantwortung der Anfrage zu schaffen.
        Berücksichtige auch Informationen aus dem bisherigen Verlauf der Konversation: ${JSON.stringify(main.serverLog)}
        `;
        let response = await getAIAnswer(prompt, true);
        console.log(`AI ANSWER DB RETRIEVE: ${JSON.stringify(response)}`);
        if (response) {
            return response;
        }
        else {
            return { queryStatement: "", problem: "Keine gültige AI Antwort" };
        }
    }
    catch (error) {
        return { queryStatement: "", problem: "Error: " + error.message };
    }
}
export async function tryToRetrieveInformationFromDB(anfrage, information, verlauf) {
    try {
        const prompt = `Du bist eine clevere AI, die Teil eines größeren ausgeklügelten Programms ist, um Informationen zur Verfügung zu stellen.
        Du bist an eine MongoDB angeschlossen und verfügst über umfangreiches Wissen über deren Collections und Datenstrukturen.
        Das sind alle Collections: ${JSON.stringify(db.tabellen)}
        Das sind die AJV Formata der in diesen Collections jeweils gespeicherten Dokumente: ${JSON.stringify(db.systemSchemas)}

        Der User Hat nun folgende Anfrage gestellt: ${anfrage}
        Diese Schritte wurden in diesem Kontext bereits durchgeführt: ${JSON.stringify(verlauf)}
         ${JSON.stringify(anfrage)}
        Bislang ist vom Programm bereits folgendes gemacht worden: ${JSON.stringify(verlauf)}
        
        Deine Aufgabe ist es nun, einen Query vorzuschlagen um die erforderlichen Informationen zu sammeln, um dem Benutzer seine
        Anfrage bestmöglichst zu beantworten. Der von dir als String zur Verfügung gestellte Javascript Code mit dem Datenbank Query
        wird dann vom Programm in einem weiteren Schritt ausgeführt und die erhaltenen Informationen werden in einem nächsten Schritt
        dann wieder verwendet um dem Benutzer eine bestmögliche Antwort zu geben. 
        Bitte gebe ein JSON Objekt mit einer Property "queryStatement" mit, die den Query als später vom Programm ausführbaren Javascript Code
        enthält. Verwende dabei die bereits zuvor initialisierte Konstante dbClient, wie im Beispiel gezeigt! Führe gerne sehr unspezifische
        Querys aus und lasse dir ganze Collections anzeigen, wenn darin dann die benötigten Informationen zu finden sein könnten. 
        
        Ist es nicht möglich die geforderte Information über die Datenbank zu gewinnen, gebe lediglich einen leeren String zurück und eine weitere
        Property "problem" mit einer Erklärung warum kein queryStatement die gewünschten Informationen bereitstellen kann.
        Falls jedoch ein queryStatement Informationen gewinnen kann, die zur weiteren Beantwortung der Anfrage dienen kann, dann gebe auch eine
        Property "beschreibung" mit, die erklärt, was über die Datenbankabfrage gewonnen werden soll.

        **Beispiel 1**
        Frage: "Wie teuer ist die durchschnittliche Miete wo ich wohne?"
        Antwort: {
            queryStatment: "",
            problem: "Keine der verfügbaren Tabellen scheint Informationen zu ortsüblichen Mieten zu enthalten"
        }

        **Beispiel 2**
        Frage: "Kannst du mir die letzte Buchung meines Vaters zeigen"
        Antwort: {
            queryStatement: "return await dbClient.collection("konto").find().toArray()",
            beschreibung: "Konto-Id des Vaters ermitteln"
        }
        

        **Beispiel 3**
        Frage: "Welche Id hat mein Sparkassen Konto?"
        Antwort: {queryStatement: "return await dbClient.collection('konto').find().toArray()", beschreibung: "Sparkassen Konto Daten abrufen"}
        `;
        let response = await getAIAnswer(prompt, true);
        console.log(`AI ANSWER DB RETRIEVE: ${JSON.stringify(response)}`);
        if (response) {
            return response;
        }
        else {
            return { queryStatement: "", problem: "Ungültige AI Antwort" };
        }
    }
    catch (error) {
        return { queryStatement: "", problem: "Unerwarteter Error: " + error.message };
    }
}
export async function tryToReturnFinanzInformation(anfrage, verlauf) {
    try {
        const prompt = `
        Du bist eine clevere AI, die Teil eines größeren ausgeklügelten Finanz Programms ist
        Du hilfst dem User Informationen zusammenzutragen, Buchungen zu suchen und Summen zu berechnen. Alle notwendigen Daten sind in den beiden
        Collections "Konto" und "Buchung" zu finden. Die Daten sind nach dem Prinzip der doppelten Buchführung erfasst, das heißt es wird nach
        dem Prinzip Soll an Haben gebucht. Wenn beispielsweise bar im Lidl eingekauft wurde,
        so ist in dem Buchunsdatensatz als Sollkonto beispielsweise Konsumausgaben erfasst und als haben Konto beispielsweise das Sparkassen-Konto.
        Berücksichtige diese Logik korrekt beim Bilden von Summen, beim Berechnen von Salden und Kontoständen. Haben bedeutet ein Abgang von Geld,
        Soll ein Zufluss!

        Der User hat folgende Anfrage gestellt: ${anfrage}
        Bislang ist folgendes geschehen: ${JSON.stringify(verlauf)}

        Deine Aufgabe ist es nun zu entscheiden, ob die bereits gesammelten Informationen ausreichen, um dem User eine zufriedenstellende
        Antwort zu geben. Gebe dazu ein JSON Objekt mit einer Property "alleInformationen" zurück, die ein Boolean ist.
        Wenn alle Informationen bereits von dir zusammengetragen und zur Verfügung gestellt werden können, gebe die Property als true 
        zurück und gebe zudem eine Property "antwort" zurück, welche die Anfrage des Users zu Genüge beantwortet. Falls das aufgrund mangelnder
        Informationslage noch nicht möglich sein sollte, gebe nur ein JSON Objekt mit "alleInformationen": false zurück.

        **Beispiel 1**
        Frage: "Was ist 3*3?"
        Verlauf: [] 
        Antwort: {alleInformationen: true, antwort: "Das Ergebnis von 3*3 ist 9."}

        **Beispiel 2**
        Frage: "Wie teuer ist die durchschnittliche Miete wo ich wohne?"
        Verlauf: [] 
        Antwort: {
            alleInformationen: false
        }


        **Beispiel 4**
        Frage: "Kannst du mir die letzte Buchung meines Vaters zeigen"
        Verlauf: []
        Antwort: {
            alleInformationen: false
        }

        Berücksichtige auch Informationen aus dem bisherigen Verlauf der Konversation: ${JSON.stringify(main.serverLog)}
        `;
        let response = await getAIAnswer(prompt, true);
        console.log(`AI ANSWER ANFRAGE INFO: ${JSON.stringify(response)}`);
        if (response) {
            return response;
        }
        else {
            return { alleInformationen: false };
        }
    }
    catch (error) {
        return { alleInformationen: false };
    }
}
export async function tryToReturnInformation(anfrage, verlauf) {
    try {
        const prompt = `
        
        Der User hat folgende Anfrage gestellt: ${anfrage}
        Bislang ist folgendes geschehen: ${JSON.stringify(verlauf)}

        Deine Aufgabe ist es nun zu entscheiden, ob die bereits gesammelten Informationen ausreichen, um dem User eine zufriedenstellende
        Antwort zu geben. Gebe dazu ein JSON Objekt mit einer Property "alleInformationen" zurück, die ein Boolean ist.
        Wenn alle Informationen bereits von dir zusammengetragen und zur Verfügung gestellt werden können, gebe die Property als true 
        zurück und gebe zudem eine Property "antwort" zurück, welche die Anfrage des Users zu Genüge beantwortet. Falls das aufgrund mangelnder
        Informationslage noch nicht möglich sein sollte, gebe nur ein JSON Objekt mit "alleInformationen": false zurück.

        **Beispiel 1**
        Frage: "Was ist 3*3?"
        Verlauf: [] 
        Antwort: {alleInformationen: true, antwort: "Das Ergebnis von 3*3 ist 9."}

        **Beispiel 2**
        Frage: "Wie teuer ist die durchschnittliche Miete wo ich wohne?"
        Verlauf: [] 
        Antwort: {
            alleInformationen: false
        }

        **Beispiel 3**
        Frage: "Wie teuer ist die durchschnittliche Miete wo ich wohne?"
        Verlauf: [{aktion: UserInput, details: {input: "Ich wohne in Sigmaringen und die Miete beträgt durchschnittlich wohl rund 10€ pro QM"}}] 
        Antwort: {
            alleInformationen: true,
            antwort: "Die Miete in Sigmaringen beträgt wohl rund 10€ pro qm, was ungefähr 1000€ für eine kleine Wohnung bedeutet." 
        }

        **Beispiel 4**
        Benötigte Information: {
            buchung_id: "number"
            beschreibung: "string",
            betrag: "number",
            datum: "string"
        }
        Frage: "Kannst du mir die letzte Buchung meines Vaters zeigen"
        Verlauf: []
        Antwort: {
            alleInformationen: false
        }

        Berücksichtige auch Informationen aus dem bisherigen Verlauf der Konversation: ${JSON.stringify(main.serverLog)}
        `;
        let response = await getAIAnswer(prompt, true);
        console.log(`AI ANSWER ANFRAGE INFO: ${JSON.stringify(response)}`);
        if (response) {
            return response;
        }
        else {
            return { alleInformationen: false };
        }
    }
    catch (error) {
        return { alleInformationen: false };
    }
}
export async function tryToRetrieveIdFromDB(anfrage, verlauf, konten) {
    try {
        const prompt = `Du bist eine clevere AI, die Teil eines größeren ausgeklügelten Programms ist.
        Deine Aufgabe ist es, in einer MongoDB basierend auf einer User Anfrage einen Query zusammenzustellen, der genug Information liefert
        um die ID (nicht _id!) eines gesuchten Dokuments ausfindig zu machen. 
        Insgesamt gibt es folgende Collections : ${JSON.stringify(db.tabellen)}
        In diesen sind Objekte von folgenden AJV Formata angelegt: ${JSON.stringify(db.systemSchemas)}
        
        Der User hat folgende Anfrage gestellt: ${JSON.stringify(anfrage)}
        Bislang ist vom Programm bereits folgendes gemacht worden: ${JSON.stringify(verlauf)}

        Beachte bereits ausgeführte Querys und deren Ergebnise auf jeden Fall bei deiner Beurteilung und schlage nicht die selben vor!
         
        Deine Aufgabe ist es nun zu entscheiden, ob in einem nächsten Schritt bereits über eine Datenabfrage alle benötigten Information
        gewonnen werden können, damit die ID des gesuchten Dokuments ermittelt werden kann. Du kennst die Datenbankstruktur sehr genau und kannst
        präzise einschätzen, ob bereits über einen entsprechenden Query einer Collection der MongoDB alle benötigten Informationen gewonnen werden
        können, oder aber ob noch Informationen fehlen, um einen effektiven Query absetzen zu können. 
        
        Bitte gebe ein JSON Objekt mit einer Property "queryStatus" zurück. Diese Property hat entweder den Wert "possible", "incomplete" oder "impossible".
        Der queryStatus ist possible, wenn bereits alle Informationen vorhanden sind und ein effektiver Query ausgeführt werden kann, der vermutlich
        alle benötigten Informationen zur Verfügung stellt. In diesem Fall gebe außerdem eine Property "queryStatement" mit, 
        die den Query als später vom Programm ausführbaren Javascript Code enthält. Verwende dabei die bereits zuvor initialisierte 
        Konstante dbClient, wie im Beispiel gezeigt! Führe gerne sehr unspezifische Querys aus und lasse dir ganze Collections anzeigen, wenn
        darin dann die benötigten Informationen zu finden sein könnten. 
        Werden erst weitere Informationen benötigt, um einen effektiven Query ausführen zu können, gebe "queryStatus": "incomplete" zurück
        und spezifiziere in einer weiteren Property "weitereInformationen", mit einem String, welcher beschreibt welche Informationen noch benötigt 
        werden um einen effektiven Query ausführen zu können. (Wenn zum Beispiel zwar die Person bekannt ist, aber man erst noch die Id, 
        welche in einer anderen Tabelle als Referenz verwendet wird, ausfindig machen muss). Bei Fragen bezüglich Buchungen kann aber
        default mäßig davon ausgegangen werden, dass mit dem Benutzer mit der ID 1 kommuniziert wird. 
        Falls die Informationen vermutlich nicht in der Datenbank zu finden ist, gebe "queryStatus": "impossible" zurück. Und gebe eine weitere
        Property "problem" zurück, die ein String ist und eine kurze Erklärung enthält, warum die Informationen über eine Datenbankabfrage
        nicht zu finden ist.

        **Beispiel 1**
        Anfrage: "Bitte wähle die letzte Buchung aus der Tabelle aus"
        Verlauf: []
        Antwort: {
            queryStatus: "possible",
            queryStatement: "return await dbClient.collection(Buchung').find().toArray()"
        }

        **Beispiel 2**
        Frage: "Bitte wähle das Sparkassenkonto aus"
        Verlauf: []
        Antwort: {
            queryStatus: "possible",
            queryStatement: "return await dbClient.collection('konto').find().toArray()"
        }

        **Beispiel 3**
        Frage: "Bitte wähle das Smartphone meiner Schwester aus"
        Verlauf: []
        Antwort: {queryStatus: "impossible", problem: "Information kann aus keiner Tabelle gewonnen werden"}


        Sei gerne sehr kreativ bei deinen MongoDB Queries und verwende sort, projections, aggregate und alle möglichen Komplexen Funktionen die 
        du dir ausdenken kannst, um eine möglichst gute Datengrundlage zu schaffen um die ID des auszuwählenden Dokuments ausfindig zu machen.
        Falls speziellere Queries zu keinem ausreichenden Ergebnis geführt haben, frage gerne auch einfach ganze Collections ab.
        Berücksichtige auch Informationen aus dem bisherigen Verlauf der Konversation: ${JSON.stringify(main.serverLog)}
        `;
        let response = await getAIAnswer(prompt, true);
        console.log(`AI ANSWER DB RETRIEVE: ${JSON.stringify(response)}`);
        if (response) {
            return response;
        }
        else {
            return { queryStatus: "impossible" };
        }
    }
    catch (error) {
        return { queryStatus: "impossible" };
    }
}
export async function decideOnWhatToAskUser(anfrage, verlauf) {
    try {
        const prompt = `Du bist eine clevere AI, die Teil eines ausgeklügelten Systems ist, um einem User sämtliche Fragen zu 
        beantworten. Der User hat folgende Anfrage gestellt: ${anfrage}
        Bisher ist folgendes geschehen: ${JSON.stringify(verlauf)}
        Andere Teile des Programms haben bereits analysiert, dass weder eine Google Suche noch eine Datenbankabfrage hilft, die Frage besser 
        beantworten zu können. Schreibe dem User daher bitte eine Antwort, in welcher du klarstellst warum die Anfrage nicht beantwortet werden
        kann und welche zusätzlichen Informationen vom User benötigt werden, um die Anfrage eventuell doch noch zu beantworten.
        `;
        let response = await getAIAnswer(prompt, false);
        console.log("AI ANSWER What To Ask: ");
        console.log(response);
        return response;
    }
    catch (error) {
        return error.message;
    }
}
export async function returnQueryAnswer(command, data) {
    try {
        const prompt = `You are a smart AI that has access to a MongoDB database. The user asks: "${command}".
        You already have this data: ${JSON.stringify(data)}. Give back a satisfactory 
        answer for the user.`;
        let response = await getAIAnswer(prompt, false);
        return response;
    }
    catch (error) {
        return error.message;
    }
}
export async function decideOnSchema(anfrage) {
    try {
        const prompt = `You are a smart AI that has access to a MongoDB database. The user wants you to create a new record in a table asking you 
        this: "${anfrage}".
        You know that these tables already exist: ${Object.keys(db.systemSchemas).join(',')}. 
        Please return a JSON Object with one property schema which is either the name of the 
        selected schema or an empty string if there is nothing that fits perfectly!`;
        let response = await getAIAnswer(prompt, true);
        if (response.schema) {
            return response.schema;
        }
        else {
            return "";
        }
    }
    catch (error) {
        return "";
    }
}
export async function decideOnEnoughInfoToContinue(serverStatus) {
    try {
        let prompt = `Du bist eine clevere AI, die den Programmablaufs einer Website steuert. Basierend auf einer Nutzeranfrage entscheidest du
        ob bereits genug Informationen vorhanden sind um eine Nutzeranfrage zufriedenstellend bearbeiten oder beantworten zu können oder nicht. `;
        if (serverStatus.aktion === "Create") {
            if (serverStatus.aktion_data) {
                prompt += ``;
            }
        }
        prompt += `Bitte gebe ein JSON Object mit einer Property "genug" zurück, die entweder true ist, wenn alle Informationen vorhanden sind um eine
        zufriedenstellende Antwort zu geben und gebe false zurück, falls noch etwas fehlt.

        Anfrage: ${JSON.stringify(serverStatus)}
        `;
        if (serverStatus.aktion === "Info") {
            prompt += `
            **Beispiel 1**
            ${JSON.stringify(enoughInfoExample1)}
            
            **Beispiel 2**
            ${JSON.stringify(enoughInfoExample2)}
            
            **Beispiel 3**
            ${JSON.stringify(enoughInfoExample3)}
            `;
        }
        if (serverStatus.aktion === "Create") {
            //prompt += `**Beispiel 1**/n${JSON.stringify(enoughCreateExample1)}`
            //prompt += `**Beispiel 2**/n${JSON.stringify(enoughCreateExample2)}`
            //prompt += `**Beispiel 3**/n${JSON.stringify(enoughCreateExample3)}`
        }
        console.log(prompt);
        const initialResponse = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }], model: "gpt-4o", response_format: { type: "json_object" }
        });
        const response = JSON.parse(initialResponse.choices[0].message.content.trim());
        console.log("AI Answer");
        console.log(response);
        return response;
    }
    catch (error) {
        return false;
    }
}
export async function decideOnEnoughInfoToCreate(command, object, schema) {
    try {
        const schemaDetails = JSON.stringify(db.systemSchemas[schema]);
        const prompt = `You are a smart AI that can check if a object satisfies a given schema. 
                        Please check if this object: ${JSON.stringify(object)} satisfies all strictly needed properties from this schema: ${schemaDetails}.
                        It satisfies the schema completly as long as all strictly required properties are fulfilled! Optional properties can be missing or 
                        have default vaules like -1 or empty string. Required fields need to have correct values (No -1 and no empty string allowed)!
                        Answer in a JSON Object with one property enough which is either true or false and an optional property missingFields which 
                        lists any missing fields that are strictly required in the schema and not provided yet. If the date is provided like 
                        today its sufficient, it doesnt have to be in the needed format already.
                        The current Date right now is ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toTimeString()}`;
        console.log(prompt);
        const initialResponse = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }], model: "gpt-4o", response_format: { type: "json_object" }
        });
        const response = JSON.parse(initialResponse.choices[0].message.content.trim());
        console.log("AI Answer");
        console.log(response);
        return response;
    }
    catch (error) {
        return { enough: false, missingFields: [] };
    }
}
export async function decideOnUpdatedObject(anfrage, currentDocument, verlauf) {
    try {
        let prompt = `Du bist eine clevere AI, die Teil eines ausgeklügelten Programms ist. Der Benutzer möchte folgendes Objekt in der Datenbank
        abändern: ${JSON.stringify(currentDocument.data)}
        Seine Anfrage zur Abänderung lautet wie folgt: ${anfrage}
        Bitte gebe das Dokument, mit den vom Benutzer gewünschten Änderungen als JSON Object zurück! 
        
        *Weitere Informationen*
        Das Datum heute ist ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toLocaleTimeString()}.
        Das ist alles was das Programm bisher getan hat: ${JSON.stringify(verlauf)}
        `;
        const initialResponse = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }], model: "gpt-4o", response_format: { type: "json_object" }
        });
        const initialResult = JSON.parse(initialResponse.choices[0].message.content.trim());
        console.log("AI UPDATE OBJECT ANSWER");
        console.log(initialResult);
        return initialResult;
    }
    catch (error) {
    }
}
export async function decideOnObjectToCreate(command, verlauf, schema) {
    try {
        let prompt;
        if (schema !== "object") {
            prompt = `You are a smart AI that has access to a MongoDB database. The user wants you to create a new record in a table asking you this: ${command}.
            Please provide the JSON Object that should be created in the database that fulfills this schema strictly! Schema: 
            ${JSON.stringify(db.systemSchemas[schema])}
            If some info is still missing add an empty string if its a string property and a -1 if its a number! If there date info is provided indirectly 
            (today, tomorrow etc) please transform it already in the correct format.!
            
            Das Datum heute ist ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toLocaleTimeString()}.

            This is what the programm has already gathered on data: ${JSON.stringify(verlauf)}
            `;
        }
        else {
            prompt = `You are a smart AI that has access to a MongoDB database. The user wants you to create a new record in a table asking 
            you this: ${command}.
            Please provide the JSON Object that should be created in the database. In a earlier step you decided that the document will be added
            to the object collection, a collection for all data that has no specific schema.

            Das Datum heute ist ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toLocaleTimeString()}.

            This is what the programm has already gathered on data: ${JSON.stringify(verlauf)}
            `;
        }
        const initialResponse = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }], model: "gpt-4o", response_format: { type: "json_object" }
        });
        const initialResult = JSON.parse(initialResponse.choices[0].message.content.trim());
        console.log("AI Answer");
        console.log(initialResult);
        return initialResult;
    }
    catch (error) {
    }
}
export async function tryToCreateSchemaObject(command, verlauf, schema) {
    let accounts = await db.dbClient.collection('konto').find({}).toArray();
    const prompt = `Du bist eine clevere AI, die Teil eines größeren ausgeklügelten Programms ist. Deine Aufgabe ist es
    anhand einer User Anfrage und eines Datenbank AJV Schemas, ein JSON Object vorzuschlagen, was dann in einem nächsten Schritt in 
    einer MongoDB angelegt werden kann. Der User hat folgende Anfrage gestellt: ${command}.
    Du sollst nun ein JSON Objekt erstellen, dass folgendes AJV Format erfüllt: ${JSON.stringify(db.systemSchemas[schema])} 
    Das JSON Object muss den Anforderungen des Schemas genügen, das ist sehr wichtig! Das aktuelle Datum ist 
    ${new Date(Date.now()).toLocaleDateString() + new Date(Date.now()).toLocaleTimeString()}. 

    Du hast außerdem Informationen zu allen zuvor ausgeführten Aktionen des Programms im Rahmen dieser Anfrage: ${JSON.stringify(verlauf)}
    `;
    const response = await getAIAnswer(prompt, true);
    const schemaDoc = db.systemSchemas[schema];
    const validate = db.ajv.compile(schemaDoc);
    const valid = validate(response);
    if (!valid) {
        return { valid: true, object: response };
    }
    else {
        return { valid: false, object: response };
    }
}
export async function tryToCreateBuchung(anfrage, verlauf) {
    const prompt = `You are an amazing AI that helps adding Buchungen to a Mongo Database. The user asked you to add a buchung in the following way:
    ${anfrage}. The Database logic follows the doppelte Buchführung... Please return a JSON Object with this AJV Schema: ${JSON.stringify(db.systemSchemas['buchung'])} 
    The JSON Object has to strictly follow this schema, this is very important! The current date is 
    ${new Date(Date.now()).toLocaleDateString() + new Date(Date.now()).toLocaleTimeString()}. 
    All available accounts with their ids needed for the soll and haben property are available in this json array: ${JSON.stringify(db.konten)}.
    You also have information about what the programm already did: ${JSON.stringify(verlauf)}
    `;
    const response = await getAIAnswer(prompt, true);
    console.log("AI CREATE BUCHUNG RESPONSE");
    console.log(JSON.stringify(response));
    const schemaDoc = db.systemSchemas['buchung'];
    const validate = db.ajv.compile(schemaDoc);
    const valid = validate(response);
    if (valid) {
        return { valid: true, object: response };
    }
    else {
        return { valid: false, object: response };
    }
}
