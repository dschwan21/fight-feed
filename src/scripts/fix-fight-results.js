// Script to fix fight result values in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Update fight records to match win/loss patterns in fighter record
 */
async function fixFightResults() {
  try {
    console.log('Starting to fix fight results...');
    
    // Get all fights
    const fights = await prisma.fight.findMany({
      include: {
        fighter1: true,
        fighter2: true
      }
    });
    
    console.log(`Found ${fights.length} fights to check`);
    let updatedCount = 0;
    
    // Process each fight
    for (const fight of fights) {
      // Parse fighter records
      const fighter1Record = parseRecord(fight.fighter1.record);
      const fighter2Record = parseRecord(fight.fighter2.record);
      
      // Skip if records can't be parsed
      if (!fighter1Record || !fighter2Record) {
        console.log(`Skipping fight ${fight.id} (${fight.fighter1.name} vs ${fight.fighter2.name}) - can't parse records`);
        continue;
      }
      
      // Determine proper result based on records
      let correctResult = null;
      
      if (fight.result === 'PENDING' || !fight.result) {
        // If fighter1 has more wins than fighter2 has losses, likely fighter1 won
        if (fighter1Record.wins > fighter2Record.losses) {
          correctResult = 'FIGHTER1_WIN';
        } 
        // If fighter2 has more wins than fighter1 has losses, likely fighter2 won
        else if (fighter2Record.wins > fighter1Record.losses) {
          correctResult = 'FIGHTER2_WIN';
        }
        // If both have equal draws, might be a draw
        else if (fighter1Record.draws === fighter2Record.draws && fighter1Record.draws > 0) {
          correctResult = 'DRAW';
        }
        // Default to pending if can't determine
        else {
          correctResult = 'PENDING';
        }
        
        // Update fight with corrected result
        if (correctResult !== fight.result) {
          await prisma.fight.update({
            where: { id: fight.id },
            data: { result: correctResult }
          });
          
          console.log(`Updated fight ${fight.id} (${fight.fighter1.name} vs ${fight.fighter2.name}): ${fight.result || 'null'} -> ${correctResult}`);
          updatedCount++;
        }
      }
    }
    
    console.log(`Fixed ${updatedCount} fight results`);
    
  } catch (error) {
    console.error('Error fixing fight results:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Parse record string (e.g. "30-0-1") into wins, losses, draws
 */
function parseRecord(record) {
  if (!record) return null;
  
  const match = record.match(/(\d+)-(\d+)-(\d+)/);
  if (!match) return null;
  
  return {
    wins: parseInt(match[1], 10),
    losses: parseInt(match[2], 10),
    draws: parseInt(match[3], 10)
  };
}

// Run the script
fixFightResults().catch(console.error);