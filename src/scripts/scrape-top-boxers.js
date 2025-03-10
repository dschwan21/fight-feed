// Script to scrape top boxers and their fight histories from BoxRec
const { scrapeFighters } = require('./boxrec-scraper');

// List of top current and historical boxers to scrape
const TOP_BOXERS = [
  // Current champions and top fighters
  "Canelo Alvarez",
  "Tyson Fury",
  "Oleksandr Usyk",
  "Terence Crawford",
  "Naoya Inoue",
  "Gervonta Davis",
  "Errol Spence Jr",
  "Jermell Charlo",
  "Dmitry Bivol",
  "Artur Beterbiev",
  
  // All-time greats
  "Muhammad Ali",
  "Mike Tyson",
  "Floyd Mayweather Jr",
  "Sugar Ray Robinson",
  "Joe Louis",
  "Rocky Marciano",
  "Manny Pacquiao",
  "George Foreman",
  "Lennox Lewis",
  "Sugar Ray Leonard",
  "Roberto Duran",
  "Marvin Hagler",
  "Oscar De La Hoya",
  "Julio Cesar Chavez",
  "Roy Jones Jr",
  "Evander Holyfield",
  "Joe Frazier",
  "Bernard Hopkins",
  "Pernell Whitaker",
  "Thomas Hearns"
];

async function main() {
  console.log(`Starting to scrape ${TOP_BOXERS.length} top boxers...`);
  
  try {
    // Scrape all boxers in the list
    await scrapeFighters(TOP_BOXERS);
    
    console.log("All top boxers successfully scraped!");
  } catch (error) {
    console.error("Error during scraping process:", error);
  }
}

// Run the script
main().catch(console.error);