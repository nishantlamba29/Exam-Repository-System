const Agenda = require("agenda");

const mongoConnectionString = "mongodb://127.0.0.1:27017/cseproject";

const agenda = new Agenda({
    db: { address: mongoConnectionString, collection: "agendaJobs" },
    processEvery: "5 seconds",
});

agenda.on("ready", async () => {
    console.log("Agenda is connected to MongoDB and ready.");
});

agenda.on("error", (err) => {
    console.error("Agenda connection error:", err);
});

module.exports = agenda;