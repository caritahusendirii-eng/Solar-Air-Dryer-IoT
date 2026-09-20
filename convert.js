const xlsx = require('xlsx');
const fs = require('fs');

const workbook = xlsx.readFile('sample/ridwan 2.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

let csvData = xlsx.utils.sheet_to_csv(sheet);

// Replace quotes if they surround the entire line
csvData = csvData.replace(/^"|"$/gm, '');

fs.writeFileSync('react-dashboard/public/dummy_data.csv', csvData);
console.log('Conversion successful. New sample data written to dummy_data.csv without extra quotes.');
