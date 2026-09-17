const fs = require('fs');
const PDFParser = require("pdf2json");

let pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    fs.writeFileSync("data/incoming/test-pdf-data.json", JSON.stringify(pdfData, null, 2));
    console.log("Done");
});

pdfParser.loadPDF("data/incoming/mcc-seat-matrix-pg-2025-Round-1.pdf");
