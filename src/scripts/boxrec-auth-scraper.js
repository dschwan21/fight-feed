// BoxRec scraper with authentication
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// BoxRec scraper configuration
const BOXREC_BASE_URL = 'https://boxrec.com';
const LOGIN_URL = `${BOXREC_BASE_URL}/en/login`;
const RATE_LIMIT_DELAY = 3000; // 3 seconds between requests
const MAX_FIGHTERS = 50; // Maximum number of fighters to scrape to avoid infinite loops

// BoxRec credentials (these would need to be provided)
const BOXREC_USERNAME = process.env.BOXREC_USERNAME;
const BOXREC_PASSWORD = process.env.BOXREC_PASSWORD;

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
  // Create a directory for cookies if it doesn't exist
  const cookiesDir = path.join(__dirname, 'cookies');
  if (!fs.existsSync(cookiesDir)) {
    fs.mkdirSync(cookiesDir);
  }

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
 * Login to BoxRec
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<boolean>} - True if login successful, false otherwise
 */
async function loginToBoxRec(page) {
  try {
    console.log('Logging in to BoxRec...');
    
    // Navigate to login page
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
    
    // Check if already logged in
    const content = await page.content();
    if (content.includes('Logout') || content.includes('logout')) {
      console.log('Already logged in to BoxRec');
      return true;
    }
    
    // Take a screenshot of login page
    await page.screenshot({ path: 'boxrec-login.png' });
    
    // Check if credentials are available
    if (!BOXREC_USERNAME || !BOXREC_PASSWORD) {
      console.error('BoxRec credentials not provided. Set BOXREC_USERNAME and BOXREC_PASSWORD environment variables.');
      return false;
    }
    
    // Fill login form
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.type('#username', BOXREC_USERNAME);
    await page.type('#password', BOXREC_PASSWORD);
    
    // Submit login form
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
    
    // Verify login success
    const postLoginContent = await page.content();
    const loginSuccess = postLoginContent.includes('Logout') || 
                        postLoginContent.includes('logout') || 
                        !postLoginContent.includes('Login');
    
    if (loginSuccess) {
      console.log('Successfully logged in to BoxRec');
      
      // Save cookies for future sessions
      const cookies = await page.cookies();
      const cookiesPath = path.join(__dirname, 'cookies', 'boxrec-cookies.json');
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
      
      return true;
    } else {
      console.error('Failed to login to BoxRec. Please check credentials.');
      return false;
    }
  } catch (error) {
    console.error('Error during BoxRec login:', error);
    return false;
  }
}

/**
 * Load cookies from disk if available
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<boolean>} - True if cookies loaded successfully
 */
async function loadCookies(page) {
  const cookiesPath = path.join(__dirname, 'cookies', 'boxrec-cookies.json');
  
  if (fs.existsSync(cookiesPath)) {
    try {
      const cookiesString = fs.readFileSync(cookiesPath);
      const cookies = JSON.parse(cookiesString);
      
      if (cookies && cookies.length > 0) {
        console.log('Loading saved cookies...');
        await page.setCookie(...cookies);
        return true;
      }
    } catch (error) {
      console.error('Error loading cookies:', error);
    }
  }
  
  return false;
}

/**
 * Check if page requires login and log in if necessary
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<boolean>} - True if logged in or no login required
 */
async function ensureLoggedIn(page) {
  const content = await page.content();
  
  // Check if login is required
  if (content.includes('Please login to continue') || 
      content.includes('login required') ||
      content.includes('Login') && !content.includes('Logout')) {
    
    console.log('Login required. Attempting to log in...');
    
    // Try to load cookies first
    const cookiesLoaded = await loadCookies(page);
    
    // If cookies loaded, check if they're still valid
    if (cookiesLoaded) {
      // Refresh the page
      await page.reload({ waitUntil: 'networkidle2' });
      
      // Check if still needs login
      const newContent = await page.content();
      if (!newContent.includes('Please login to continue') && 
          !newContent.includes('login required')) {
        console.log('Successfully authenticated with saved cookies');
        return true;
      }
    }
    
    // If cookies didn't work, try full login
    return await loginToBoxRec(page);
  }
  
  // No login required
  return true;
}

/**
 * Extract fighter details from their profile page
 * @param {Page} page - Puppeteer page object
 * @param {string} profileUrl - URL of the fighter's profile
 * @returns {Promise<Object>} - Fighter details and opponent links
 */
async function extractFighterDetails(page, profileUrl) {
  try {
    // Navigate to fighter page
    console.log(`Navigating to fighter profile: ${profileUrl}`);
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });
    
    // Check if we need to log in
    const loggedIn = await ensureLoggedIn(page);
    if (!loggedIn) {
      console.error('Unable to log in to BoxRec. Cannot extract fighter details.');
      return null;
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'fighter-details-page.png' });
    console.log('Saved fighter details page screenshot to fighter-details-page.png');
    
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
      
      // Take a screenshot to debug the structure
      await page.screenshot({ path: 'boxrec-table-debug.png' });
      
      // Log the HTML structure of the page for debugging
      const pageHtml = await page.content();
      console.log("Page HTML length:", pageHtml.length);
      
      const result = await page.evaluate(() => {
        // More detailed logging
        const allTables = document.querySelectorAll('table');
        console.log(`Found ${allTables.length} tables on the page`);
        
        // Examine all dataTable elements
        const dataTables = document.querySelectorAll('table.dataTable');
        console.log(`Found ${dataTables.length} tables with class dataTable`);
        
        // Find the fight history table - be more flexible
        let fightTable = null;
        
        // First try the standard dataTable class
        for (const table of dataTables) {
          // Check if this table contains fighter data
          const hasPersonLinks = table.querySelector('a.personLink');
          const hasBoutResults = table.querySelector('div.boutResult');
          
          if (hasPersonLinks || hasBoutResults) {
            fightTable = table;
            console.log('Found fight table with personLinks or boutResults');
            break;
          }
        }
        
        // If still not found, try a more general approach
        if (!fightTable) {
          for (const table of allTables) {
            // Look for tables with fight-like content
            const tableText = table.textContent.toLowerCase();
            const hasFightData = tableText.includes('date') && 
                                 (tableText.includes('opponent') || tableText.includes('result'));
            
            // Also check for personLinks or boutResults
            const hasPersonLinks = table.querySelector('a.personLink');
            const hasBoutResults = table.querySelector('div.boutResult');
            
            if (hasFightData || hasPersonLinks || hasBoutResults) {
              fightTable = table;
              console.log('Found fight table using alternative detection');
              break;
            }
          }
        }
        
        if (!fightTable) {
          console.log('No fight history table found on page');
          return { fightHistory: [], opponentLinks: [] };
        }
        
        // Check table structure and log details
        console.log(`Fight table has ${fightTable.querySelectorAll('tr').length} rows`);
        
        // Extract fight rows - BoxRec usually gives each fight row an ID
        let rows = fightTable.querySelectorAll('tr[id]');
        
        // If no rows with IDs found, try all rows except the first one (likely header)
        if (rows.length === 0) {
          const allRows = fightTable.querySelectorAll('tr');
          if (allRows.length > 1) {
            // Skip the first row (header) and take the rest
            rows = Array.from(allRows).slice(1);
            console.log(`Using ${rows.length} rows from table (no IDs found)`);
          }
        }
        
        const fights = [];
        const opponents = [];
        
        console.log(`Processing ${rows.length} fight rows`);
        
        for (const row of rows) {
          // Skip any row that might be a header
          if (row.querySelector('th')) continue;
          
          const cells = row.querySelectorAll('td');
          
          // Skip if not enough cells (should have at least date, opponent, record, result)
          if (cells.length < 4) continue;
          
          try {
            // Extract date - typically in the first cell with an <a> element
            let date = null;
            const dateCell = cells[0];
            const dateLink = dateCell && dateCell.querySelector('a');
            if (dateLink) {
              const dateText = dateLink.textContent.trim();
              if (dateText && dateText.match(/\d{4}-\d{2}-\d{2}/)) {
                // Already in YYYY-MM-DD format (common on BoxRec)
                date = dateText;
              } else if (dateText) {
                // Try to parse other date formats
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
            
            // Debug: log cell contents to understand the table structure
            let cellContents = [];
            cells.forEach((cell, idx) => {
              cellContents.push(`Cell ${idx}: ${cell.textContent.trim().substring(0, 50)}`);
            });
            console.log('Row cells:', cellContents.join(' | '));
            
            // Extract opponent - scan all cells for personLink
            let opponentName = null;
            let opponentUrl = null;
            
            // Try to find opponent link - specifically look for the personLink class
            // which is how BoxRec marks fighter links
            for (const cell of cells) {
              const personLink = cell.querySelector('a.personLink');
              if (personLink) {
                opponentName = personLink.textContent.trim();
                opponentUrl = personLink.href;
                
                // BoxRec sometimes has relative URLs
                if (opponentUrl && !opponentUrl.startsWith('http')) {
                  // Convert relative URL to absolute
                  if (opponentUrl.startsWith('/')) {
                    opponentUrl = 'https://boxrec.com' + opponentUrl;
                  }
                }
                
                // Add to opponent links if it looks like a fighter profile
                if (opponentUrl && 
                    (opponentUrl.includes('/box-pro/') || opponentUrl.includes('/boxer/')) && 
                    !opponents.some(o => o.url === opponentUrl)) {
                  opponents.push({
                    name: opponentName,
                    url: opponentUrl
                  });
                  console.log(`Found opponent: ${opponentName} (${opponentUrl})`);
                  break;
                }
              }
            }
            
            // Extract opponent's record
            let opponentRecord = null;
            
            // Look for record pattern spans (textWon, textLost, textDraw)
            for (const cell of cells) {
              const wonSpan = cell.querySelector('.textWon');
              const lostSpan = cell.querySelector('.textLost');
              const drawSpan = cell.querySelector('.textDraw');
              
              if (wonSpan || lostSpan || drawSpan) {
                const wins = wonSpan ? wonSpan.textContent.trim() : '0';
                const losses = lostSpan ? lostSpan.textContent.trim() : '0';
                const draws = drawSpan ? drawSpan.textContent.trim() : '0';
                opponentRecord = `${wins}-${losses}-${draws}`;
                console.log(`Found opponent record: ${opponentRecord}`);
                break;
              }
            }
            
            // Extract result and method
            let result = null;
            let method = null;
            
            // Look for common result markers
            for (const cell of cells) {
              // Check for boutResult div (common on BoxRec)
              const boutResult = cell.querySelector('div.boutResult');
              if (boutResult) {
                const resultText = boutResult.textContent.trim();
                
                // Results are typically in format "W-KO", "L-TD", "D", etc.
                const resultMatch = resultText.match(/^([WLD])-?(.*)$/i);
                if (resultMatch) {
                  const [, resultCode, methodCode] = resultMatch;
                  
                  result = resultCode.toUpperCase();
                  method = methodCode ? methodCode.trim() : 'POINTS';
                  console.log(`Found result: ${result}, method: ${method}`);
                  break;
                } else {
                  // If we can't parse, use the whole text as the result
                  result = resultText;
                  console.log(`Found unparseable result: ${result}`);
                  break;
                }
              }
              
              // Alternative: Check for explicit W, L, D text in cells
              const cellText = cell.textContent.trim().toUpperCase();
              if (cellText === 'W' || cellText === 'L' || cellText === 'D' || cellText === 'NC') {
                result = cellText;
                console.log(`Found result in cell text: ${result}`);
                
                // Look for method in next cells
                let current = cell.nextElementSibling;
                while (current && !method) {
                  const text = current.textContent.trim();
                  if (text.match(/KO|TKO|UD|SD|MD|RTD|DQ|PTS/i)) {
                    method = text;
                    console.log(`Found method in next cell: ${method}`);
                    break;
                  }
                  current = current.nextElementSibling;
                }
                
                if (result) break;
              }
            }
            
            // Extract rounds (typically in format "12/12")
            let rounds = null;
            const roundsCell = Array.from(cells).find(cell => {
              return cell.textContent.trim().match(/^\d+\/\d+$/);
            });
            
            if (roundsCell) {
              const roundsText = roundsCell.textContent.trim();
              const roundsMatch = roundsText.match(/^(\d+)\/(\d+)$/);
              if (roundsMatch) {
                const [, completedRounds, totalRounds] = roundsMatch;
                rounds = parseInt(completedRounds);
                // We could also store the scheduled rounds if needed
                // const scheduledRounds = parseInt(totalRounds);
              }
            }
            
            // Extract venue/location - try to find it in the expanded row if possible
            let venue = null;
            let location = null;
            
            // Look for venue info in a potentially existing expanded row
            const rowId = row.getAttribute('id');
            if (rowId) {
              const venueRow = document.querySelector(`tr[id="${rowId}result"]`);
              if (venueRow) {
                const venueText = venueRow.textContent.trim();
                // Try to split venue and location if possible
                const venueParts = venueText.split(',');
                if (venueParts.length > 1) {
                  venue = venueParts[0].trim();
                  location = venueParts.slice(1).join(',').trim();
                } else {
                  venue = venueText;
                }
              }
            }
            
            // Only add fights with enough essential data
            if (date && opponentName && result) {
              fights.push({
                date,
                opponentName,
                opponentUrl,
                opponentRecord,
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
    // Skip if no name
    if (!fighterData.name) {
      console.log('No fighter name provided, skipping save');
      return null;
    }
    
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
    
    // Check if fighter exists
    const existingFighter = await fighterExists(fighterData.name);
    
    if (existingFighter) {
      // Update existing fighter
      const updatedFighter = await prisma.fighter.update({
        where: { id: existingFighter.id },
        data: {
          weightClass: fighterData.weightClass || existingFighter.weightClass,
          record: formattedRecord || existingFighter.record,
          imageUrl: fighterData.imageUrl || existingFighter.imageUrl,
          nickname: fighterData.nickname || existingFighter.nickname,
          nationality: fighterData.nationality || existingFighter.nationality,
          updatedAt: new Date()
        }
      });
      
      return updatedFighter;
    } else {
      // Create new fighter
      const newFighter = await prisma.fighter.create({
        data: {
          name: fighterData.name,
          weightClass: fighterData.weightClass,
          record: formattedRecord,
          imageUrl: fighterData.imageUrl,
          nickname: fighterData.nickname,
          nationality: fighterData.nationality
        }
      });
      
      return newFighter;
    }
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
  
  // Initial login
  await loadCookies(page);
  await page.goto(BOXREC_BASE_URL, { waitUntil: 'networkidle2' });
  const initialLogin = await ensureLoggedIn(page);
  
  if (!initialLogin) {
    console.error('Failed to log in to BoxRec. Cannot continue scraping.');
    await browser.close();
    await prisma.$disconnect();
    return;
  }
  
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
 * Scrape a single fighter by URL
 * @param {string} fighterUrl - URL of the fighter to scrape
 */
async function scrapeSingleFighter(fighterUrl) {
  const browser = await initBrowser();
  const page = await browser.newPage();
  
  // Set user agent to avoid detection
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  // Initial login
  await loadCookies(page);
  await page.goto(BOXREC_BASE_URL, { waitUntil: 'networkidle2' });
  const initialLogin = await ensureLoggedIn(page);
  
  if (!initialLogin) {
    console.error('Failed to log in to BoxRec. Cannot continue scraping.');
    await browser.close();
    await prisma.$disconnect();
    return;
  }
  
  try {
    console.log(`Scraping fighter: ${fighterUrl}`);
    
    // Extract fighter details
    const fighterDetails = await extractFighterDetails(page, fighterUrl);
    
    if (!fighterDetails || !fighterDetails.name) {
      console.log(`Failed to extract fighter details from ${fighterUrl}`);
      return;
    }
    
    // Save fighter to database
    const savedFighter = await saveFighter(fighterDetails);
    
    if (savedFighter) {
      console.log(`Successfully saved fighter: ${savedFighter.name}`);
      
      // Save fight history
      if (fighterDetails.fightHistory && fighterDetails.fightHistory.length > 0) {
        const savedFights = await saveFightHistory(savedFighter, fighterDetails.fightHistory);
        console.log(`Saved ${savedFights} fights for ${savedFighter.name}`);
      } else {
        console.log(`No fight history found for ${savedFighter.name}`);
      }
    }
  } catch (error) {
    console.error(`Error scraping fighter ${fighterUrl}:`, error);
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
    console.log('Usage:');
    console.log('  node boxrec-auth-scraper.js single <fighter-url>');
    console.log('  node boxrec-auth-scraper.js recursive <starting-fighter-url> [max-fighters]');
    console.log('\nExamples:');
    console.log('  node boxrec-auth-scraper.js single https://boxrec.com/en/box-pro/659461');
    console.log('  node boxrec-auth-scraper.js recursive https://boxrec.com/en/box-pro/659461 50');
    return;
  }
  
  const mode = args[0];
  
  if (mode === 'single' && args.length >= 2) {
    const fighterUrl = args[1];
    await scrapeSingleFighter(fighterUrl);
  } else if (mode === 'recursive' && args.length >= 2) {
    const startUrl = args[1];
    const maxFighters = args.length > 2 ? parseInt(args[2], 10) : MAX_FIGHTERS;
    await recursiveScrapeBoxers(startUrl, maxFighters);
  } else {
    console.log('Invalid command format. Run without arguments for usage information.');
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  scrapeSingleFighter,
  recursiveScrapeBoxers
};