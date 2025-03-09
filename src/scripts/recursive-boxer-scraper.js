// Recursive BoxRec scraper - starts with one fighter and follows links to opponents
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// BoxRec scraper configuration
const BOXREC_BASE_URL = 'https://boxrec.com';
const RATE_LIMIT_DELAY = 3000; // 3 seconds between requests
const MAX_FIGHTERS = 100; // Maximum number of fighters to scrape to avoid infinite loops

/**
 * Delay execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Initialize puppeteer browser
 * @returns {Promise<Browser>}
 */
async function initBrowser() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
    ]
  });
  return browser;
}

/**
 * Extract fighter details and opponents from their profile page
 * @param {Page} page - Puppeteer page object
 * @param {string} profileUrl - URL of the fighter's profile
 * @returns {Promise<Object>} - Fighter details and opponent links
 */
async function extractFighterDetails(page, profileUrl) {
  try {
    // If we're not already on the fighter page, navigate to it
    if (page.url() !== profileUrl) {
      console.log(`Navigating to fighter profile: ${profileUrl}`);
      await page.goto(profileUrl, { waitUntil: 'networkidle2' });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'fighter-details-page.png' });
      console.log('Saved fighter details page screenshot to fighter-details-page.png');
    }
    
    // Extract fighter details using more flexible selectors
    let name = null;
    try {
      // Try multiple selectors for the name
      name = await page.evaluate(() => {
        // Look for possible name elements
        const h1 = document.querySelector('h1');
        const boxerTitle = document.querySelector('.boxerTitle h1, .boxerTitle, .personName');
        const titleEl = document.querySelector('title');
        
        if (h1 && h1.textContent.trim()) {
          return h1.textContent.trim();
        } else if (boxerTitle && boxerTitle.textContent.trim()) {
          return boxerTitle.textContent.trim();
        } else if (titleEl) {
          // Extract name from page title (usually "Name - BoxRec")
          const titleText = titleEl.textContent.trim();
          if (titleText.includes(' - BoxRec')) {
            return titleText.split(' - BoxRec')[0].trim();
          }
          return titleText;
        }
        return null;
      });
      
      console.log(`Extracted fighter name: ${name}`);
    } catch (e) {
      console.error('Error extracting fighter name:', e);
    }
    
    // Extract record using more flexible approach
    let record = null;
    try {
      record = await page.evaluate(() => {
        // Look for elements containing the record
        const recordEl = document.querySelector('.profileWLD, .record');
        if (recordEl) return recordEl.textContent.trim();
        
        // Alternative: look for text containing W-L-D pattern
        const bodyText = document.body.textContent;
        const recordMatch = bodyText.match(/(\d+)-(\d+)-(\d+)/);
        if (recordMatch) return recordMatch[0];
        
        return null;
      });
      
      console.log(`Extracted fighter record: ${record}`);
    } catch (e) {
      console.error('Error extracting fighter record:', e);
    }
    
    // Extract weight class
    let weightClass = null;
    try {
      weightClass = await page.evaluate(() => {
        // Look for tables or elements that might contain weight class
        const tableRows = Array.from(document.querySelectorAll('table tr, .profileTable tr, .profileTable .rowTable'));
        
        for (const row of tableRows) {
          const text = row.textContent.toLowerCase();
          if (text.includes('weight') || text.includes('division') || text.includes('class')) {
            const cells = row.querySelectorAll('td, .rowData');
            if (cells.length > 1) {
              return cells[1].textContent.trim();
            } else if (cells.length === 1) {
              return cells[0].textContent.trim();
            }
          }
        }
        
        // Look for common weight class terms in the document
        const weightClasses = [
          'Heavyweight', 'Cruiserweight', 'Light Heavyweight', 
          'Super Middleweight', 'Middleweight', 'Super Welterweight',
          'Welterweight', 'Super Lightweight', 'Lightweight',
          'Super Featherweight', 'Featherweight', 'Super Bantamweight',
          'Bantamweight', 'Super Flyweight', 'Flyweight',
          'Light Flyweight', 'Minimumweight'
        ];
        
        const bodyText = document.body.textContent;
        for (const wc of weightClasses) {
          if (bodyText.includes(wc)) {
            return wc;
          }
        }
        
        return null;
      });
      
      console.log(`Extracted fighter weight class: ${weightClass}`);
    } catch (e) {
      console.error('Error extracting fighter weight class:', e);
    }
    
    // Extract profile image
    let imageUrl = null;
    try {
      imageUrl = await page.evaluate(() => {
        // Look for image elements that might be the fighter's photo
        const images = Array.from(document.querySelectorAll('img'));
        
        // Filter for images that are likely to be profile pictures
        const potentialProfileImages = images.filter(img => {
          const src = img.src || '';
          const alt = img.alt || '';
          const className = img.className || '';
          
          // Check for keywords in attributes
          return (
            (className.includes('profile') || className.includes('photo') || className.includes('image')) ||
            alt.length > 0 || // Images with alt text are more likely to be important
            (src.includes('photo') || src.includes('profile') || src.includes('image')) ||
            (img.width > 100 && img.height > 100) // Larger images are more likely to be profile pictures
          );
        });
        
        if (potentialProfileImages.length > 0) {
          return potentialProfileImages[0].src;
        }
        
        return null;
      });
      
      console.log(`Extracted fighter image URL: ${imageUrl}`);
    } catch (e) {
      console.error('Error extracting fighter image:', e);
    }
    
    // Extract fighter's nationality
    let nationality = null;
    try {
      nationality = await page.evaluate(() => {
        // Look for nationality information in tables
        const tableRows = Array.from(document.querySelectorAll('table tr, .profileTable tr'));
        
        for (const row of tableRows) {
          const text = row.textContent.toLowerCase();
          if (text.includes('national') || text.includes('country') || text.includes('from')) {
            const cells = row.querySelectorAll('td, .rowData');
            if (cells.length > 1) {
              return cells[1].textContent.trim();
            }
          }
        }
        
        // Check for flag images
        const flags = document.querySelectorAll('img[src*="flag"], .flag');
        if (flags.length > 0) {
          const flag = flags[0];
          // Try to get alt text or title that might contain country name
          return flag.alt || flag.title || null;
        }
        
        return null;
      });
      
      console.log(`Extracted fighter nationality: ${nationality}`);
    } catch (e) {
      console.error('Error extracting fighter nationality:', e);
    }
    
    // Extract fighter's nickname
    let nickname = null;
    try {
      nickname = await page.evaluate(() => {
        // Look for nickname (often in quotes or with specific formatting)
        const nicknameEl = document.querySelector('.nickname, .alias');
        if (nicknameEl) return nicknameEl.textContent.trim();
        
        // Check for text in quotes that might be a nickname
        const bodyText = document.body.textContent;
        const nicknameMatch = bodyText.match(/"([^"]+)"/);
        if (nicknameMatch) return nicknameMatch[1];
        
        return null;
      });
      
      console.log(`Extracted fighter nickname: ${nickname}`);
    } catch (e) {
      console.error('Error extracting fighter nickname:', e);
    }
    
    // Extract fight history and opponent links
    let fightHistory = [];
    let opponentLinks = [];
    try {
      console.log('Extracting fight history and opponent links...');
      
      const result = await page.evaluate(() => {
        // Look for the fight table
        const fightTables = document.querySelectorAll('table');
        let fightTable = null;
        
        // Find the table that likely contains the fight history
        for (const table of fightTables) {
          const headerText = table.textContent.toLowerCase();
          if (headerText.includes('date') && 
              (headerText.includes('opponent') || headerText.includes('result') || 
               headerText.includes('win') || headerText.includes('loss'))) {
            fightTable = table;
            break;
          }
        }
        
        if (!fightTable) return { fightHistory: [], opponentLinks: [] };
        
        // Extract fight rows
        const rows = fightTable.querySelectorAll('tr');
        const fights = [];
        const opponents = [];
        
        // Skip header row if present
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cells = row.querySelectorAll('td');
          
          // Skip if not enough cells
          if (cells.length < 4) continue;
          
          // Extract fight data
          try {
            // Extract date
            let date = null;
            const dateCell = cells[0];
            if (dateCell) {
              const dateText = dateCell.textContent.trim();
              // Convert date format to ISO (assuming it's in a format like DD-MM-YYYY or MM/DD/YYYY)
              if (dateText) {
                const dateParts = dateText.match(/(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})/);
                if (dateParts) {
                  // Determine date format
                  let year, month, day;
                  if (dateParts[1].length === 4) {
                    // YYYY-MM-DD
                    [, year, month, day] = dateParts;
                  } else if (dateParts[3].length === 4) {
                    // DD-MM-YYYY or MM-DD-YYYY
                    if (parseInt(dateParts[2]) > 12) {
                      // DD-MM-YYYY (month can't be > 12)
                      [, day, month, year] = dateParts;
                    } else {
                      // Assuming MM-DD-YYYY for US format
                      [, month, day, year] = dateParts;
                    }
                  } else {
                    // Can't determine format, use as is
                    date = dateText;
                  }
                  
                  if (year && month && day) {
                    date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  }
                } else {
                  date = dateText; // Use as is if not in expected format
                }
              }
            }
            
            // Extract opponent name and link
            let opponentName = null;
            let opponentUrl = null;
            const opponentCell = Array.from(cells).find(cell => cell.querySelector('a'));
            if (opponentCell) {
              const opponentLink = opponentCell.querySelector('a');
              if (opponentLink) {
                opponentName = opponentLink.textContent.trim();
                opponentUrl = opponentLink.href;
                
                // Add to opponent links if not already included
                if (opponentUrl && !opponents.some(o => o.url === opponentUrl)) {
                  opponents.push({
                    name: opponentName,
                    url: opponentUrl
                  });
                }
              }
            }
            
            // Extract result (W, L, D, NC)
            let result = null;
            for (const cell of cells) {
              const text = cell.textContent.trim().toUpperCase();
              if (text === 'W' || text === 'L' || text === 'D' || text === 'NC') {
                result = text;
                break;
              }
            }
            
            // Extract method (KO, TKO, UD, SD, MD)
            let method = null;
            const methodCell = Array.from(cells).find(cell => {
              const text = cell.textContent.trim().toUpperCase();
              return text.includes('KO') || text.includes('TKO') || 
                     text.includes('UD') || text.includes('SD') || 
                     text.includes('MD') || text.includes('DECISION');
            });
            
            if (methodCell) {
              method = methodCell.textContent.trim();
            }
            
            // Extract rounds
            let rounds = null;
            for (const cell of cells) {
              const roundMatch = cell.textContent.trim().match(/(\d+)\/(\d+)/);
              if (roundMatch) {
                rounds = parseInt(roundMatch[1]);
                break;
              }
            }
            
            // Extract venue/location
            let venue = null;
            let location = null;
            
            // Venue is often in the last few cells
            for (let j = cells.length - 1; j >= 0; j--) {
              const cellText = cells[j].textContent.trim();
              if (cellText && !venue && !method && !result && !opponentName) {
                venue = cellText;
                break;
              }
            }
            
            // Only add fights with enough data
            if (date && opponentName && result) {
              fights.push({
                date,
                opponentName,
                opponentUrl,
                result,
                method,
                rounds,
                venue,
                location
              });
            }
          } catch (e) {
            console.error('Error parsing fight row:', e);
            continue;
          }
        }
        
        return { 
          fightHistory: fights, 
          opponentLinks: opponents 
        };
      });
      
      fightHistory = result.fightHistory;
      opponentLinks = result.opponentLinks;
      
      console.log(`Extracted ${fightHistory.length} fights and ${opponentLinks.length} opponent links`);
    } catch (e) {
      console.error('Error extracting fight history and opponents:', e);
    }
    
    return {
      name,
      record,
      weightClass,
      imageUrl,
      nationality,
      nickname,
      fightHistory,
      opponentLinks
    };
  } catch (error) {
    console.error(`Error extracting fighter details from ${profileUrl}:`, error);
    return null;
  }
}

/**
 * Check if fighter already exists in database
 * @param {string} name - Fighter name
 * @returns {Promise<Object|null>} - Fighter object if exists, null otherwise
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
 * Search for opponent by name or BoxRec URL
 * @param {string} name - Opponent name
 * @param {string} boxrecUrl - BoxRec URL for opponent
 * @returns {Promise<Object|null>} - Fighter object if found, null otherwise
 */
async function findOpponent(name, boxrecUrl) {
  if (!name) return null;
  
  // First try to find by exact name match
  let opponent = await prisma.fighter.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive'
      }
    }
  });
  
  if (opponent) return opponent;
  
  // If not found, try partial name match
  opponent = await prisma.fighter.findFirst({
    where: {
      name: {
        contains: name,
        mode: 'insensitive'
      }
    }
  });
  
  return opponent;
}

/**
 * Save fighter to database
 * @param {Object} fighterData - Fighter details
 * @returns {Promise<Object>} - Created or updated fighter record
 */
async function saveFighter(fighterData) {
  try {
    // Parse record string to extract wins, losses, draws
    let wins = 0, losses = 0, draws = 0;
    if (fighterData.record) {
      const recordMatch = fighterData.record.match(/(\d+)-(\d+)-(\d+)/);
      if (recordMatch) {
        [, wins, losses, draws] = recordMatch.map(Number);
      }
    }
    
    // Format record
    const formattedRecord = `${wins}-${losses}-${draws}`;
    
    const fighter = await prisma.fighter.upsert({
      where: {
        // Use a unique constraint or create a composite one
        // Since there's no unique constraint on name, we'll use findFirst + create/update
        id: -1 // This will always fail, forcing an insert if not found
      },
      update: {
        weightClass: fighterData.weightClass,
        record: formattedRecord,
        imageUrl: fighterData.imageUrl,
        nickname: fighterData.nickname,
        nationality: fighterData.nationality,
        updatedAt: new Date()
      },
      create: {
        name: fighterData.name,
        weightClass: fighterData.weightClass,
        record: formattedRecord,
        imageUrl: fighterData.imageUrl,
        nickname: fighterData.nickname,
        nationality: fighterData.nationality
      }
    }).catch(async () => {
      // If upsert fails, try findFirst + create/update approach
      const existingFighter = await prisma.fighter.findFirst({
        where: {
          name: {
            equals: fighterData.name,
            mode: 'insensitive'
          }
        }
      });
      
      if (existingFighter) {
        return prisma.fighter.update({
          where: { id: existingFighter.id },
          data: {
            weightClass: fighterData.weightClass,
            record: formattedRecord,
            imageUrl: fighterData.imageUrl,
            nickname: fighterData.nickname,
            nationality: fighterData.nationality,
            updatedAt: new Date()
          }
        });
      } else {
        return prisma.fighter.create({
          data: {
            name: fighterData.name,
            weightClass: fighterData.weightClass,
            record: formattedRecord,
            imageUrl: fighterData.imageUrl,
            nickname: fighterData.nickname,
            nationality: fighterData.nationality
          }
        });
      }
    });
    
    return fighter;
  } catch (error) {
    console.error(`Error saving fighter ${fighterData.name}:`, error);
    return null;
  }
}

/**
 * Save fight history to database
 * @param {Object} fighter - Fighter object
 * @param {Array<Object>} fightHistory - Array of fight history objects
 * @returns {Promise<number>} - Number of fights saved
 */
async function saveFightHistory(fighter, fightHistory) {
  if (!fighter || !fightHistory || !fightHistory.length) {
    console.log('No fight history to save');
    return 0;
  }
  
  console.log(`Saving ${fightHistory.length} fights for ${fighter.name}...`);
  let savedCount = 0;
  
  // System user for created fights (admin user)
  let systemUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  
  if (!systemUser) {
    // Create system user if not exists
    systemUser = await prisma.user.create({
      data: {
        email: 'system@fightfeed.io',
        username: 'system',
        role: 'ADMIN'
      }
    });
    console.log('Created system user for fight creation');
  }
  
  try {
    for (const fight of fightHistory) {
      if (!fight.opponentName) continue;
      
      // Try to find opponent in database
      let opponent = await findOpponent(fight.opponentName, fight.opponentUrl);
      
      // If opponent not found, create a placeholder fighter
      if (!opponent) {
        console.log(`Opponent ${fight.opponentName} not found, creating placeholder...`);
        opponent = await prisma.fighter.create({
          data: {
            name: fight.opponentName,
            // Set placeholder values that can be updated later
            weightClass: fighter.weightClass, // Assuming same weight class
            record: '0-0-0' // Unknown record
          }
        });
      }
      
      // Format date
      let fightDate;
      try {
        fightDate = new Date(fight.date);
        if (isNaN(fightDate.getTime())) {
          // If date is invalid, use current date as fallback
          console.log(`Invalid date format: ${fight.date}, using current date`);
          fightDate = new Date();
        }
      } catch (e) {
        console.error(`Error parsing date: ${fight.date}`, e);
        fightDate = new Date(); // Fallback to current date
      }
      
      // Determine event name
      const eventName = fight.venue || 
                       `${fighter.name} vs ${opponent.name}`;
      
      // Determine fight result
      let fightResult = 'PENDING';
      if (fight.result) {
        const resultUpper = fight.result.toUpperCase();
        if (resultUpper === 'W') {
          fightResult = 'FIGHTER1_WIN';
        } else if (resultUpper === 'L') {
          fightResult = 'FIGHTER2_WIN';
        } else if (resultUpper === 'D') {
          fightResult = 'DRAW';
        } else if (resultUpper === 'NC') {
          fightResult = 'NO_CONTEST';
        }
      }
      
      // Determine rounds
      const numberOfRounds = fight.rounds || 12; // Default to 12 if not specified
      
      // Determine win method
      const winMethod = fight.method || 'Decision';
      
      // Check if fight already exists
      const existingFight = await prisma.fight.findFirst({
        where: {
          OR: [
            {
              fighter1Id: fighter.id,
              fighter2Id: opponent.id,
              date: {
                // Search for fights within a month
                gte: new Date(fightDate.getTime() - 30 * 24 * 60 * 60 * 1000),
                lte: new Date(fightDate.getTime() + 30 * 24 * 60 * 60 * 1000)
              }
            },
            {
              fighter1Id: opponent.id,
              fighter2Id: fighter.id,
              date: {
                gte: new Date(fightDate.getTime() - 30 * 24 * 60 * 60 * 1000),
                lte: new Date(fightDate.getTime() + 30 * 24 * 60 * 60 * 1000)
              }
            }
          ]
        }
      });
      
      if (existingFight) {
        console.log(`Fight between ${fighter.name} and ${opponent.name} already exists, skipping...`);
        continue;
      }
      
      // Save fight
      try {
        const savedFight = await prisma.fight.create({
          data: {
            fighter1Id: fighter.id,
            fighter2Id: opponent.id,
            eventName,
            date: fightDate,
            venue: fight.venue,
            location: fight.location,
            weightClass: fighter.weightClass,
            numberOfRounds,
            result: fightResult,
            winMethod,
            createdById: systemUser.id
          }
        });
        
        console.log(`Saved fight: ${fighter.name} vs ${opponent.name} (${fightDate.toISOString()})`);
        savedCount++;
      } catch (e) {
        console.error(`Error saving fight: ${fighter.name} vs ${opponent.name}`, e);
      }
    }
    
    return savedCount;
  } catch (error) {
    console.error(`Error saving fight history for ${fighter.name}:`, error);
    return savedCount;
  }
}

/**
 * Recursively scrape fighters starting from a root URL
 * @param {string} startUrl - URL of the first fighter to scrape
 * @param {number} maxFighters - Maximum number of fighters to scrape
 */
async function recursiveScrapeBoxers(startUrl, maxFighters = MAX_FIGHTERS) {
  const browser = await initBrowser();
  const page = await browser.newPage();
  
  // Set user agent to avoid detection
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  // Queue to manage URLs to visit
  const urlQueue = [startUrl];
  // Set to track already visited URLs
  const visitedUrls = new Set();
  // Count of processed fighters
  let fighterCount = 0;
  
  console.log(`Starting recursive BoxRec scraper from ${startUrl}`);
  console.log(`Maximum fighters to scrape: ${maxFighters}`);
  
  try {
    while (urlQueue.length > 0 && fighterCount < maxFighters) {
      // Get next URL from queue
      const currentUrl = urlQueue.shift();
      
      // Skip if already visited
      if (visitedUrls.has(currentUrl)) {
        console.log(`Already visited ${currentUrl}, skipping...`);
        continue;
      }
      
      // Mark as visited
      visitedUrls.add(currentUrl);
      
      console.log(`\n--- Processing fighter #${fighterCount + 1}: ${currentUrl} ---`);
      console.log(`Queue length: ${urlQueue.length}, Visited URLs: ${visitedUrls.size}`);
      
      // Extract fighter details
      const fighterDetails = await extractFighterDetails(page, currentUrl);
      
      if (!fighterDetails || !fighterDetails.name) {
        console.log(`Failed to extract fighter details from ${currentUrl}, skipping...`);
        await delay(RATE_LIMIT_DELAY);
        continue;
      }
      
      // Save fighter to database
      const savedFighter = await saveFighter(fighterDetails);
      
      if (savedFighter) {
        console.log(`Successfully saved fighter: ${savedFighter.name}`);
        fighterCount++;
        
        // Save fight history
        if (fighterDetails.fightHistory && fighterDetails.fightHistory.length > 0) {
          const savedFights = await saveFightHistory(savedFighter, fighterDetails.fightHistory);
          console.log(`Saved ${savedFights} fights for ${savedFighter.name}`);
        } else {
          console.log(`No fight history found for ${savedFighter.name}`);
        }
        
        // Add opponent links to queue
        if (fighterDetails.opponentLinks && fighterDetails.opponentLinks.length > 0) {
          console.log(`Adding ${fighterDetails.opponentLinks.length} opponent links to queue...`);
          
          for (const opponent of fighterDetails.opponentLinks) {
            if (opponent.url && !visitedUrls.has(opponent.url) && !urlQueue.includes(opponent.url)) {
              urlQueue.push(opponent.url);
              console.log(`Added ${opponent.name} (${opponent.url}) to queue`);
            }
          }
        }
      }
      
      // Delay to avoid rate limiting
      console.log(`Waiting ${RATE_LIMIT_DELAY}ms before next request...`);
      await delay(RATE_LIMIT_DELAY);
    }
    
    console.log(`\nRecursive scraping completed!`);
    console.log(`Processed ${fighterCount} fighters`);
    console.log(`Visited ${visitedUrls.size} URLs`);
    console.log(`Remaining in queue: ${urlQueue.length}`);
    
  } catch (error) {
    console.error('Error during recursive scraping:', error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
    console.log('Browser and database connections closed');
  }
}

/**
 * CLI command to run scraper
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node recursive-boxer-scraper.js <starting-boxer-url> [max-fighters]');
    console.log('Example: node recursive-boxer-scraper.js https://boxrec.com/en/box-pro/659461 50');
    return;
  }
  
  const startUrl = args[0];
  const maxFighters = args.length > 1 ? parseInt(args[1], 10) : MAX_FIGHTERS;
  
  await recursiveScrapeBoxers(startUrl, maxFighters);
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  recursiveScrapeBoxers
};