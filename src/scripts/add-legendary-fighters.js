/**
 * Add Legendary Fighters Script
 * 
 * This script adds legendary/historical fighters to the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Legendary fighters data
const legendaryFighters = [
  {
    name: 'Muhammad Ali',
    nickname: 'The Greatest',
    weightClass: 'Heavyweight',
    nationality: 'United States',
    record: '56-5-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Muhammad_Ali_NYWTS.jpg'
  },
  {
    name: 'Mike Tyson',
    nickname: 'Iron Mike',
    weightClass: 'Heavyweight',
    nationality: 'United States',
    record: '50-6-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Mike_Tyson_2019_by_Glenn_Francis.jpg'
  },
  {
    name: 'Sugar Ray Robinson',
    nickname: 'Sugar',
    weightClass: 'Middleweight',
    nationality: 'United States',
    record: '174-19-6',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Sugar_Ray_Robinson_-_1966.jpg'
  },
  {
    name: 'Floyd Mayweather Jr.',
    nickname: 'Money',
    weightClass: 'Welterweight',
    nationality: 'United States',
    record: '50-0-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Floyd_Mayweather%2C_Jr._at_DeWalt_event.jpg/800px-Floyd_Mayweather%2C_Jr._at_DeWalt_event.jpg'
  },
  {
    name: 'Manny Pacquiao',
    nickname: 'PacMan',
    weightClass: 'Welterweight',
    nationality: 'Philippines',
    record: '62-8-2',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Manny_Pacquiao.jpg'
  },
  {
    name: 'Roy Jones Jr.',
    nickname: 'Captain Hook',
    weightClass: 'Light Heavyweight',
    nationality: 'United States',
    record: '66-9-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Roy_Jones_Jr._July_2015.jpg/800px-Roy_Jones_Jr._July_2015.jpg'
  },
  {
    name: 'Joe Louis',
    nickname: 'The Brown Bomber',
    weightClass: 'Heavyweight',
    nationality: 'United States',
    record: '66-3-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Joe_Louis_-_publicity.JPG'
  },
  {
    name: 'Roberto Duran',
    nickname: 'Manos de Piedra',
    weightClass: 'Lightweight',
    nationality: 'Panama',
    record: '103-16-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Roberto_Dur%C3%A1n.JPG/800px-Roberto_Dur%C3%A1n.JPG'
  },
  {
    name: 'Evander Holyfield',
    nickname: 'The Real Deal',
    weightClass: 'Heavyweight',
    nationality: 'United States',
    record: '44-10-2',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Evander_Holyfield_2010_%28cropped%29.jpg/800px-Evander_Holyfield_2010_%28cropped%29.jpg'
  },
  {
    name: 'Lennox Lewis',
    nickname: 'The Lion',
    weightClass: 'Heavyweight',
    nationality: 'United Kingdom',
    record: '41-2-1',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Lennox_Lewis_2010.jpg/800px-Lennox_Lewis_2010.jpg'
  }
];

/**
 * Check if fighter already exists in database
 * @param {string} name - Fighter name
 * @returns {Promise<Object>} - Fighter if exists, null otherwise
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
 * @returns {Promise<Object>} - Created fighter record
 */
async function saveFighter(fighterData) {
  try {
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
    console.log(`Adding ${legendaryFighters.length} legendary fighters to the database...`);
    
    // Process each fighter
    for (const fighterData of legendaryFighters) {
      // Check if fighter already exists
      const existingFighter = await fighterExists(fighterData.name);
      
      if (existingFighter) {
        console.log(`Fighter "${fighterData.name}" already exists with ID ${existingFighter.id}, skipping`);
        continue;
      }
      
      // Save fighter
      const fighter = await saveFighter(fighterData);
      
      if (fighter) {
        console.log(`Successfully saved fighter: ${fighter.name} with ID ${fighter.id}`);
      }
    }
    
    console.log('Finished adding legendary fighters');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();