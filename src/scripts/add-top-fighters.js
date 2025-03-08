/**
 * Add Top Fighters Script
 * 
 * This script adds a predefined list of top fighters to the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Top fighters data
const topFighters = [
  {
    name: 'Canelo Alvarez',
    nickname: 'Canelo',
    weightClass: 'Super Middleweight',
    nationality: 'Mexico',
    record: '61-2-2',
    imageUrl: 'https://www.ringtv.com/wp-content/uploads/2023/08/GettyImages-1482551333.jpg'
  },
  {
    name: 'Tyson Fury',
    nickname: 'The Gypsy King',
    weightClass: 'Heavyweight',
    nationality: 'United Kingdom',
    record: '34-0-1',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Tyson_Fury_2023.jpg/220px-Tyson_Fury_2023.jpg'
  },
  {
    name: 'Oleksandr Usyk',
    nickname: 'The Cat',
    weightClass: 'Heavyweight',
    nationality: 'Ukraine',
    record: '21-0-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Usyk_in_the_US.jpg'
  },
  {
    name: 'Terence Crawford',
    nickname: 'Bud',
    weightClass: 'Welterweight',
    nationality: 'United States',
    record: '40-0-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Terence_Crawford_2019.jpg'
  },
  {
    name: 'Naoya Inoue',
    nickname: 'The Monster',
    weightClass: 'Bantamweight',
    nationality: 'Japan',
    record: '26-0-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Naoya_Inoue%2C_Dec_2018_B.jpg'
  },
  {
    name: 'Errol Spence Jr.',
    nickname: 'The Truth',
    weightClass: 'Welterweight',
    nationality: 'United States',
    record: '28-1-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Errol_Spence_Jr.jpg/220px-Errol_Spence_Jr.jpg'
  },
  {
    name: 'Gervonta Davis',
    nickname: 'Tank',
    weightClass: 'Lightweight',
    nationality: 'United States',
    record: '29-0-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Gervonta_Davis_victory_at_the_Barclays_Center_%28cropped%29.jpg'
  },
  {
    name: 'Dmitry Bivol',
    nickname: null,
    weightClass: 'Light Heavyweight',
    nationality: 'Russia',
    record: '22-0-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Dmitry_Bivol_during_Clemente_Russo_farewell_night_in_July_2019.jpg'
  },
  {
    name: 'Vasyl Lomachenko',
    nickname: 'Hi-Tech',
    weightClass: 'Lightweight',
    nationality: 'Ukraine',
    record: '17-3-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Vasyl_Lomachenko_%28cropped%29.jpg'
  },
  {
    name: 'Devin Haney',
    nickname: 'The Dream',
    weightClass: 'Lightweight',
    nationality: 'United States',
    record: '31-0-0',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Devin_Haney_2022.jpg'
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
    console.log(`Adding ${topFighters.length} top fighters to the database...`);
    
    // Process each fighter
    for (const fighterData of topFighters) {
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
    
    console.log('Finished adding fighters');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();