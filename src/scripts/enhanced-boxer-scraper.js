// Enhanced BoxRec scraper with improved accuracy and fighter data extraction
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// BoxRec scraper configuration
const BOXREC_BASE_URL = 'https://boxrec.com';
const LOGIN_URL = `${BOXREC_BASE_URL}/en/login`;
const RATE_LIMIT_DELAY = 3000; // 3 seconds between requests
const MAX_FIGHTERS = 100; // Maximum number of fighters to scrape

// BoxRec credentials
const BOXREC_USERNAME = process.env.BOXREC_USERNAME || 'dschwan21@yahoo.com';
const BOXREC_PASSWORD = process.env.BOXREC_PASSWORD || 'melanie13';

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
async function initBrowser(headless = 'new') {
  // Create a directory for cookies if it doesn't exist
  const cookiesDir = path.join(__dirname, 'cookies');
  if (!fs.existsSync(cookiesDir)) {
    fs.mkdirSync(cookiesDir);
  }

  const browser = await puppeteer.launch({
    headless: headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--window-size=1920x1080',
    ],
    defaultViewport: { width: 1920, height: 1080 }
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
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
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
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
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
      await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
      
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
    // Only accept URLs that look like boxer profiles
    // This will filter out date pages and other non-fighter URLs
    if (!profileUrl.includes('/box-pro/') && !profileUrl.includes('/boxer/')) {
      console.log(`Skipping non-fighter URL: ${profileUrl}`);
      return null;
    }

    // Navigate to fighter page
    console.log(`Navigating to fighter profile: ${profileUrl}`);
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Check if we need to log in
    const loggedIn = await ensureLoggedIn(page);
    if (!loggedIn) {
      console.error('Unable to log in to BoxRec. Cannot extract fighter details.');
      return null;
    }

    // Save content for debugging
    await page.screenshot({ path: 'fighter-page.png', fullPage: true });
    const html = await page.content();
    fs.writeFileSync('fighter-page.html', html);
    
    // Check if we're actually on a fighter page (look for specific elements)
    const isFighterPage = await page.evaluate(() => {
      // Look for common elements on fighter pages
      const hasBoutsTable = !!document.querySelector('table.dataTable');
      const hasPersonName = !!document.querySelector('.personName, h1');
      const pageText = document.body.textContent;
      const hasFighterIndicators = pageText.includes('record') || 
                                  pageText.includes('boxer') || 
                                  pageText.includes('division') ||
                                  pageText.includes('bout') ||
                                  pageText.includes('KO');
      
      return hasPersonName && (hasBoutsTable || hasFighterIndicators);
    });
    
    if (!isFighterPage) {
      console.log(`URL does not appear to be a fighter profile: ${profileUrl}`);
      return null;
    }
    
    // Extract fighter details
    console.log('Extracting fighter details...');
    
    // Extract fighter name
    let name = null;
    try {
      name = await page.evaluate(() => {
        // Try multiple selectors for the name
        const h1 = document.querySelector('h1');
        const personName = document.querySelector('.personName');
        const titleEl = document.querySelector('title');
        
        if (h1 && h1.textContent.trim()) {
          return h1.textContent.trim();
        } else if (personName && personName.textContent.trim()) {
          return personName.textContent.trim();
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
    
    // Extract record
    let record = null;
    try {
      record = await page.evaluate(() => {
        // Look for elements containing the record
        const recordEl = document.querySelector('.profileWLD, .record');
        if (recordEl) return recordEl.textContent.trim();
        
        // Alternative: look for text containing W-L-D pattern
        const records = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent.trim();
          return text.match(/^\d+-\d+-\d+$/) && 
                 text.length < 20 && // Avoid long text containing numbers
                 !el.querySelector('*'); // Only direct text nodes
        });
        
        if (records.length > 0) {
          return records[0].textContent.trim();
        }
        
        // Try regex on body text as last resort
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
        // Common weight classes
        const weightClasses = [
          'Heavyweight', 'Cruiserweight', 'Light Heavyweight', 
          'Super Middleweight', 'Middleweight', 'Super Welterweight',
          'Welterweight', 'Super Lightweight', 'Lightweight',
          'Super Featherweight', 'Featherweight', 'Super Bantamweight',
          'Bantamweight', 'Super Flyweight', 'Flyweight',
          'Light Flyweight', 'Minimumweight'
        ];
        
        // Look for tables or elements with weight class info
        const tableRows = Array.from(document.querySelectorAll('table tr'));
        
        for (const row of tableRows) {
          const text = row.textContent.toLowerCase();
          // Look for rows containing weight class information
          if (text.includes('weight') || text.includes('division') || text.includes('class')) {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) {
              return cells[1].textContent.trim();
            } else if (cells.length === 1) {
              return cells[0].textContent.trim();
            }
          }
        }
        
        // Check page content for weight class names
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
        
        // First try images in profile sections
        const profileImages = images.filter(img => {
          const src = img.src || '';
          const alt = img.alt || '';
          const className = img.className || '';
          
          return (className.includes('profile') || className.includes('photo')) ||
                 (alt.includes('photo') || alt === name) ||
                 (src.includes('photo') || src.includes('profile')) ||
                 (img.width > 100 && img.height > 100); // Larger images
        });
        
        if (profileImages.length > 0) {
          return profileImages[0].src;
        }
        
        // Fall back to any reasonably sized image
        const sizableImages = images.filter(img => 
          img.width >= 100 && img.height >= 100 && 
          !img.src.includes('flag') && // Skip flag images
          !img.src.includes('logo') && // Skip logos
          !img.src.includes('icon')    // Skip icons
        );
        
        if (sizableImages.length > 0) {
          return sizableImages[0].src;
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
        // Look for nationality in specific elements
        const tableRows = Array.from(document.querySelectorAll('table tr'));
        
        for (const row of tableRows) {
          const text = row.textContent.toLowerCase();
          if (text.includes('national') || text.includes('country') || text.includes('from')) {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) {
              return cells[1].textContent.trim();
            }
          }
        }
        
        // Check for flag images
        const flags = document.querySelectorAll('img[src*="flag"]');
        if (flags.length > 0) {
          const flag = flags[0];
          // Try to get alt text or title with country name
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
        // Look for nickname elements
        const nicknameEl = document.querySelector('.nickname, .alias');
        if (nicknameEl) return nicknameEl.textContent.trim();
        
        // Look for text in quotes which is often a nickname
        const quotedTexts = [];
        const walkTree = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            const matches = text.match(/"([^"]+)"/g);
            if (matches) quotedTexts.push(...matches);
          } else {
            node.childNodes.forEach(walkTree);
          }
        };
        
        walkTree(document.body);
        
        if (quotedTexts.length > 0) {
          // Remove quotes and return first match
          return quotedTexts[0].replace(/"/g, '');
        }
        
        return null;
      });
      
      console.log(`Extracted fighter nickname: ${nickname}`);
    } catch (e) {
      console.error('Error extracting fighter nickname:', e);
    }
    
    // Extract fight history
    console.log('Extracting fight history...');
    
    // Debugging: take a screenshot of the page
    await page.screenshot({ path: 'fighter-page-full.png', fullPage: true });
    
    // Find the fight history table
    const { fightHistory, opponentLinks } = await page.evaluate(() => {
      // Various selectors to find the bout table
      let boutsTable = null;
      
      // Log tables on the page for debugging
      console.log(`Found ${document.querySelectorAll('table').length} tables on the page`);
      document.querySelectorAll('table').forEach((table, i) => {
        console.log(`Table ${i}: classes=${table.className}, rows=${table.querySelectorAll('tr').length}`);
      });
      
      // First, try the most common table class for fights
      boutsTable = document.querySelector('table.dataTable');
      
      // If that fails, look for tables with boutResult elements
      if (!boutsTable) {
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          if (table.querySelector('.boutResult') || 
              table.querySelector('a.personLink')) {
            boutsTable = table;
            console.log('Found table with boutResult or personLink');
            break;
          }
        }
      }
      
      // If still not found, look for tables with appropriate headers or content
      if (!boutsTable) {
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          const tableText = table.textContent.toLowerCase();
          // Check for common boxing terms
          if ((tableText.includes('date') || tableText.includes('year')) && 
              (tableText.includes('opponent') || tableText.includes('fighter') || 
               tableText.includes('result') || tableText.includes('record') ||
               tableText.includes('win') || tableText.includes('loss') ||
               tableText.includes('draw'))) {
            boutsTable = table;
            console.log('Found table with fight-related text content');
            break;
          }
        }
      }
      
      // Last resort: use the largest table with multiple rows
      if (!boutsTable) {
        const tables = Array.from(document.querySelectorAll('table')).filter(t => 
          t.querySelectorAll('tr').length > 2
        ).sort((a, b) => 
          b.querySelectorAll('tr').length - a.querySelectorAll('tr').length
        );
        
        if (tables.length > 0) {
          boutsTable = tables[0];
          console.log('Using largest table as fallback');
        }
      }
      
      if (!boutsTable) {
        return { fightHistory: [], opponentLinks: [] };
      }
      
      console.log('Found bouts table!');
      
      // Extract fight rows
      const rows = boutsTable.querySelectorAll('tr');
      const fightHistory = [];
      const opponentLinks = [];
      
      // Skip header row if it exists
      const startIndex = rows[0] && rows[0].querySelector('th') ? 1 : 0;
      
      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        
        // Skip non-fight rows
        if (row.classList.contains('headerRow') || 
            row.classList.contains('textSubHead') ||
            row.style.display === 'none') {
          continue;
        }
        
        try {
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) continue; // Skip rows with too few cells
          
          // Extract date - typically in the first few cells
          let date = null;
          let dateCell = null;
          
          // Look for date links or date-formatted text
          for (let j = 0; j < Math.min(3, cells.length); j++) {
            const cell = cells[j];
            const dateLink = cell.querySelector('a[href*="/date"]');
            
            // Look for date link first
            if (dateLink) {
              date = dateLink.textContent.trim();
              dateCell = cell;
              break;
            }
            
            // Otherwise look for date-formatted text
            const cellText = cell.textContent.trim();
            if (cellText.match(/\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/) || 
                cellText.match(/\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4}/)) {
              date = cellText;
              dateCell = cell;
              break;
            }
          }
          
          // Format date consistently if found
          if (date) {
            // Try to parse and format the date
            let formattedDate = date;
            
            // Match different date formats
            const dmyMatch = date.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
            const mdyMatch = date.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
            const ymdMatch = date.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
            
            if (ymdMatch) {
              // Already YYYY-MM-DD
              const [_, year, month, day] = ymdMatch;
              formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else if (dmyMatch) {
              // DD-MM-YYYY
              const [_, day, month, year] = dmyMatch;
              formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else if (mdyMatch) {
              // MM-DD-YYYY (US format)
              const [_, month, day, year] = mdyMatch;
              formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            
            date = formattedDate;
          }
          
          // Extract opponent
          let opponentName = null;
          let opponentUrl = null;
          
          // Look for opponent link in any cell
          const personLink = row.querySelector('a.personLink');
          if (personLink) {
            opponentName = personLink.textContent.trim();
            opponentUrl = personLink.href;
            
            // Only add URLs that look like fighter profiles
            if (opponentUrl && (opponentUrl.includes('/box-pro/') || 
                              opponentUrl.includes('/boxer/'))) {
              opponentLinks.push({
                name: opponentName,
                url: opponentUrl
              });
            }
          }
          
          // Extract result
          let result = null;
          let method = null;
          
          // First look for boutResult divs (common in BoxRec)
          const boutResult = row.querySelector('.boutResult');
          if (boutResult) {
            const resultText = boutResult.textContent.trim();
            const resultMatch = resultText.match(/^([WLD])-?(.*)$/i);
            
            if (resultMatch) {
              const [_, resultCode, methodCode] = resultMatch;
              result = resultCode.toUpperCase();
              method = methodCode ? methodCode.trim() : null;
            } else {
              result = resultText;
            }
          } else {
            // Alternative: look for cells with W, L, D text
            for (const cell of cells) {
              const cellText = cell.textContent.trim().toUpperCase();
              if (cellText === 'W' || cellText === 'L' || cellText === 'D' || cellText === 'NC') {
                result = cellText;
                
                // Check next cells for method
                let nextCell = cell.nextElementSibling;
                while (nextCell && !method) {
                  const nextText = nextCell.textContent.trim();
                  if (nextText.match(/KO|TKO|UD|SD|MD|RTD|DQ|PTS/i)) {
                    method = nextText;
                    break;
                  }
                  nextCell = nextCell.nextElementSibling;
                }
                break;
              }
            }
          }
          
          // If still no method, search for common terms
          if (!method) {
            for (const cell of cells) {
              const cellText = cell.textContent.trim();
              if (cellText.match(/KO|TKO|UD|SD|MD|RTD|DQ|PTS/i) && 
                  cellText.length < 15) { // Avoid text that just happens to contain these letters
                method = cellText;
                break;
              }
            }
          }
          
          // Extract rounds
          let rounds = null;
          for (const cell of cells) {
            const roundsMatch = cell.textContent.trim().match(/^(\d+)\/(\d+)$/);
            if (roundsMatch) {
              rounds = parseInt(roundsMatch[1], 10);
              break;
            }
          }
          
          // Only add fights with sufficient data
          if (date && opponentName && result) {
            fightHistory.push({
              date,
              opponentName,
              opponentUrl,
              result,
              method,
              rounds
            });
          }
        } catch (error) {
          console.error('Error parsing fight row:', error);
        }
      }
      
      return {
        fightHistory,
        opponentLinks: opponentLinks.filter((link, index, self) => 
          // De-duplicate opponent links
          index === self.findIndex(l => l.url === link.url)
        )
      };
    });
    
    console.log(`Extracted ${fightHistory.length} fights and ${opponentLinks.length} unique opponent links`);
    
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
  if (!name) return null;
  
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
      // Try standard W-L-D format first
      const recordMatch = fighterData.record.match(/(\d+)-(\d+)-(\d+)/);
      if (recordMatch) {
        [, wins, losses, draws] = recordMatch.map(Number);
      } 
      // Try other formats like "W: X L: Y D: Z"
      else {
        const winsMatch = fighterData.record.match(/[Ww](?:ins)?[:.\s]*(\d+)/);
        const lossesMatch = fighterData.record.match(/[Ll](?:osses)?[:.\s]*(\d+)/);
        const drawsMatch = fighterData.record.match(/[Dd](?:raws)?[:.\s]*(\d+)/);
        
        if (winsMatch) wins = parseInt(winsMatch[1]);
        if (lossesMatch) losses = parseInt(lossesMatch[1]);
        if (drawsMatch) draws = parseInt(drawsMatch[1]);
      }
    }
    
    // Format record properly as W-L-D
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
  
  // Find or create system user for created fights (admin user)
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
            venue: fight.venue || null,
            location: fight.location || null,
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
 * @param {boolean} showBrowser - Whether to show browser window
 */
async function recursiveScrapeBoxers(startUrl, maxFighters = MAX_FIGHTERS, showBrowser = false) {
  const headless = showBrowser ? false : 'new';
  const browser = await initBrowser(headless);
  const page = await browser.newPage();
  
  // Set user agent to avoid detection
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  // Initial login
  await loadCookies(page);
  await page.goto(BOXREC_BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  const initialLogin = await ensureLoggedIn(page);
  
  if (!initialLogin) {
    console.error('Failed to log in to BoxRec. Cannot continue scraping.');
    await browser.close();
    await prisma.$disconnect();
    return;
  }
  
  // Make sure we're actually processing a fighter profile
  if (!startUrl.includes('/box-pro/') && !startUrl.includes('/boxer/')) {
    console.error(`Starting URL must be a fighter profile (e.g., /box-pro/123 or /boxer/123). Given: ${startUrl}`);
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
      
      // Skip if not a fighter profile URL
      if (!currentUrl.includes('/box-pro/') && !currentUrl.includes('/boxer/')) {
        console.log(`Skipping non-fighter URL: ${currentUrl}`);
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
            if (opponent.url && 
                (opponent.url.includes('/box-pro/') || opponent.url.includes('/boxer/')) &&
                !visitedUrls.has(opponent.url) && 
                !urlQueue.includes(opponent.url)) {
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
 * @param {boolean} showBrowser - Whether to show browser window
 */
async function scrapeSingleFighter(fighterUrl, showBrowser = false) {
  const headless = showBrowser ? false : 'new';
  const browser = await initBrowser(headless);
  const page = await browser.newPage();
  
  // Set user agent to avoid detection
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  // Initial login
  await loadCookies(page);
  await page.goto(BOXREC_BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
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
 * Scrape a list of top boxers from BoxRec
 * @param {number} limit - Number of fighters to scrape
 * @param {boolean} showBrowser - Whether to show browser window
 */
async function scrapeTopBoxers(limit = 50, showBrowser = false) {
  const headless = showBrowser ? false : 'new';
  const browser = await initBrowser(headless);
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  // Initial login
  await loadCookies(page);
  await page.goto(BOXREC_BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  const initialLogin = await ensureLoggedIn(page);
  
  if (!initialLogin) {
    console.error('Failed to log in to BoxRec. Cannot continue scraping.');
    await browser.close();
    await prisma.$disconnect();
    return;
  }
  
  try {
    console.log(`Scraping top ${limit} boxers...`);
    
    // Navigate to the ratings page
    const ratingsUrl = `${BOXREC_BASE_URL}/en/ratings`;
    await page.goto(ratingsUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Check if we need to log in again
    await ensureLoggedIn(page);
    
    // Extract fighter links
    const topBoxerLinks = await page.evaluate((limit) => {
      const links = Array.from(document.querySelectorAll('a.personLink'));
      const uniqueLinks = [];
      const uniqueUrls = new Set();
      
      for (const link of links) {
        const url = link.href;
        if (!uniqueUrls.has(url) && 
            (url.includes('/box-pro/') || url.includes('/boxer/'))) {
          uniqueUrls.add(url);
          uniqueLinks.push({
            name: link.textContent.trim(),
            url: url
          });
          
          if (uniqueLinks.length >= limit) break;
        }
      }
      
      return uniqueLinks;
    }, limit);
    
    console.log(`Found ${topBoxerLinks.length} boxer links`);
    
    // Process each fighter
    for (let i = 0; i < topBoxerLinks.length; i++) {
      const boxer = topBoxerLinks[i];
      console.log(`\n--- Processing top boxer #${i+1}: ${boxer.name} ---`);
      
      // Extract fighter details
      const fighterDetails = await extractFighterDetails(page, boxer.url);
      
      if (!fighterDetails || !fighterDetails.name) {
        console.log(`Failed to extract details for ${boxer.name}, skipping...`);
        await delay(RATE_LIMIT_DELAY);
        continue;
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
      
      // Delay to avoid rate limiting
      console.log(`Waiting ${RATE_LIMIT_DELAY}ms before next fighter...`);
      await delay(RATE_LIMIT_DELAY);
    }
    
    console.log('\nTop boxers scraping completed!');
    
  } catch (error) {
    console.error('Error scraping top boxers:', error);
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
    console.log('  node enhanced-boxer-scraper.js single <fighter-url> [--show-browser]');
    console.log('  node enhanced-boxer-scraper.js recursive <starting-fighter-url> [max-fighters] [--show-browser]');
    console.log('  node enhanced-boxer-scraper.js top [limit] [--show-browser]');
    console.log('\nExamples:');
    console.log('  node enhanced-boxer-scraper.js single https://boxrec.com/en/box-pro/659461 --show-browser');
    console.log('  node enhanced-boxer-scraper.js recursive https://boxrec.com/en/box-pro/659461 50');
    console.log('  node enhanced-boxer-scraper.js top 30');
    return;
  }
  
  const mode = args[0];
  const showBrowser = args.includes('--show-browser');
  
  if (mode === 'single' && args.length >= 2) {
    const fighterUrl = args[1];
    await scrapeSingleFighter(fighterUrl, showBrowser);
  } else if (mode === 'recursive' && args.length >= 2) {
    const startUrl = args[1];
    const maxFighters = args.length > 2 && !args[2].startsWith('--') ? 
                         parseInt(args[2], 10) : MAX_FIGHTERS;
    await recursiveScrapeBoxers(startUrl, maxFighters, showBrowser);
  } else if (mode === 'top') {
    const limit = args.length > 1 && !args[1].startsWith('--') ? 
                  parseInt(args[1], 10) : 50;
    await scrapeTopBoxers(limit, showBrowser);
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
  recursiveScrapeBoxers,
  scrapeTopBoxers
};