/**
 * Manual Fighter Entry Script
 * 
 * This script allows for manual creation of fighter records in the database
 * for when automated scraping is not available or not working.
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');
const prisma = new PrismaClient();

// List of common weight classes for reference
const WEIGHT_CLASSES = [
  'Heavyweight',
  'Cruiserweight',
  'Light Heavyweight',
  'Super Middleweight',
  'Middleweight',
  'Super Welterweight',
  'Welterweight',
  'Super Lightweight',
  'Lightweight',
  'Super Featherweight',
  'Featherweight',
  'Super Bantamweight',
  'Bantamweight',
  'Super Flyweight',
  'Flyweight',
  'Light Flyweight',
  'Minimumweight'
];

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for input with a question
 * @param {string} question - Question to ask user
 * @returns {Promise<string>} - User input
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(`${question}: `, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Check if fighter already exists in database
 * @param {string} name - Fighter name
 * @returns {Promise<boolean>}
 */
async function fighterExists(name) {
  const existingFighter = await prisma.fighter.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive' // Case-insensitive search
      }
    }
  });
  
  return existingFighter;
}

/**
 * Save fighter to database
 * @param {Object} fighterData - Fighter details
 * @returns {Promise<Object>} - Created or updated fighter record
 */
async function saveFighter(fighterData) {
  try {
    // Create the fighter
    const fighter = await prisma.fighter.create({
      data: {
        name: fighterData.name,
        nickname: fighterData.nickname,
        weightClass: fighterData.weightClass,
        nationality: fighterData.nationality,
        record: fighterData.record,
        imageUrl: fighterData.imageUrl
      }
    });
    
    return fighter;
  } catch (error) {
    console.error(`Error saving fighter ${fighterData.name}:`, error);
    return null;
  }
}

/**
 * Main function to add fighters
 */
async function main() {
  try {
    console.log('=== Manual Fighter Entry ===');
    console.log('Enter fighter details below (empty name to quit)');
    
    while (true) {
      // Get fighter name (required)
      const name = await prompt('Fighter name (required)');
      if (!name) {
        console.log('No name entered, exiting');
        break;
      }
      
      // Check if fighter already exists
      const existingFighter = await fighterExists(name);
      if (existingFighter) {
        console.log(`Fighter "${name}" already exists with ID ${existingFighter.id}`);
        const update = await prompt('Update this fighter? (y/n)');
        if (update.toLowerCase() !== 'y') {
          continue;
        }
      }
      
      // Get fighter details
      const nickname = await prompt('Nickname (optional)');
      
      console.log('\nAvailable weight classes:');
      WEIGHT_CLASSES.forEach((wc, i) => {
        console.log(`${i+1}. ${wc}`);
      });
      const weightClassInput = await prompt('Weight class (enter name or number from list)');
      let weightClass = weightClassInput;
      
      // Handle numeric input for weight class
      if (/^\d+$/.test(weightClassInput)) {
        const index = parseInt(weightClassInput) - 1;
        if (index >= 0 && index < WEIGHT_CLASSES.length) {
          weightClass = WEIGHT_CLASSES[index];
        }
      }
      
      const nationality = await prompt('Nationality (optional)');
      
      console.log('\nRecord should be in format: wins-losses-draws');
      console.log('Example: 30-0-1 for 30 wins, 0 losses, 1 draw');
      const record = await prompt('Record (optional)');
      
      const imageUrl = await prompt('Image URL (optional)');
      
      // Confirm details
      console.log('\n=== Fighter Details ===');
      console.log(`Name: ${name}`);
      console.log(`Nickname: ${nickname || 'N/A'}`);
      console.log(`Weight Class: ${weightClass || 'N/A'}`);
      console.log(`Nationality: ${nationality || 'N/A'}`);
      console.log(`Record: ${record || 'N/A'}`);
      console.log(`Image URL: ${imageUrl || 'N/A'}`);
      
      const confirm = await prompt('\nSave fighter? (y/n)');
      if (confirm.toLowerCase() === 'y') {
        const fighter = await saveFighter({
          name,
          nickname: nickname || null,
          weightClass: weightClass || null,
          nationality: nationality || null,
          record: record || null,
          imageUrl: imageUrl || null
        });
        
        if (fighter) {
          console.log(`\nSuccessfully saved fighter: ${fighter.name} with ID ${fighter.id}`);
        }
      } else {
        console.log('Fighter not saved');
      }
      
      const addAnother = await prompt('\nAdd another fighter? (y/n)');
      if (addAnother.toLowerCase() !== 'y') {
        break;
      }
      
      console.log('\n---\n');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run the script
main();