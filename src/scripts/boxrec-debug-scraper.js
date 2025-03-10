// Simplified BoxRec debug scraper
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// BoxRec configuration
const BOXREC_USERNAME = process.env.BOXREC_USERNAME;
const BOXREC_PASSWORD = process.env.BOXREC_PASSWORD;
const LOGIN_URL = 'https://boxrec.com/en/login';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadCookies(page) {
  const cookiesDir = path.join(__dirname, 'cookies');
  if (!fs.existsSync(cookiesDir)) {
    fs.mkdirSync(cookiesDir);
  }

  const cookiesPath = path.join(cookiesDir, 'boxrec-cookies.json');
  
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

async function analyzeFighterPage(url) {
  console.log(`Analyzing fighter page: ${url}`);
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Use visible browser for debugging
    args: ['--no-sandbox', '--window-size=1920,1080'],
    defaultViewport: null
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Enable console logging from the page
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    // Enable detailed network logging
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('boxrec.com')) {
        console.log(`Response: ${response.status()} ${url}`);
      }
    });
    
    // Initial login
    await loadCookies(page);
    await page.goto('https://boxrec.com', { waitUntil: 'networkidle2' });
    const initialLogin = await ensureLoggedIn(page);
    
    if (!initialLogin) {
      console.error('Failed to log in to BoxRec. Cannot continue.');
      return;
    }
    
    // Navigate to fighter page
    console.log(`Loading fighter page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Check if login needed again
    const loggedIn = await ensureLoggedIn(page);
    if (!loggedIn) {
      console.error('Unable to stay logged in. Cannot continue analysis.');
      return;
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'fighter-page.png', fullPage: true });
    console.log('Saved screenshot to fighter-page.png');
    
    // Save HTML for analysis
    const html = await page.content();
    fs.writeFileSync('fighter-page.html', html);
    console.log('Saved HTML to fighter-page.html');
    
    // Find all tables
    const tableData = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const result = [];
      
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const rows = table.querySelectorAll('tr');
        
        // Get table info
        const tableClass = table.className;
        const tableId = table.id;
        const rowCount = rows.length;
        
        // Try to determine table purpose from content
        const tableContent = table.textContent.substring(0, 200);
        
        // Look for specific markers for fight history
        const personLinks = table.querySelectorAll('a.personLink').length;
        const boutResults = table.querySelectorAll('div.boutResult').length;
        
        result.push({
          index: i,
          class: tableClass,
          id: tableId,
          rowCount,
          personLinks,
          boutResults,
          content: tableContent.replace(/\s+/g, ' ').trim()
        });
      }
      
      return result;
    });
    
    console.log('\nTABLE ANALYSIS:');
    tableData.forEach(table => {
      console.log(`Table ${table.index}: ${table.class} (id: ${table.id})`);
      console.log(`  Rows: ${table.rowCount}, PersonLinks: ${table.personLinks}, BoutResults: ${table.boutResults}`);
      console.log(`  Content: ${table.content.substring(0, 100)}...`);
    });
    
    // Extract fight history table
    let fightTableIndex = -1;
    for (let i = 0; i < tableData.length; i++) {
      const table = tableData[i];
      if (table.personLinks > 0 && table.boutResults > 0) {
        fightTableIndex = i;
        console.log(`\nFound likely fight table at index ${i} with ${table.personLinks} opponents and ${table.boutResults} results`);
        break;
      }
    }
    
    if (fightTableIndex === -1) {
      console.log('\nNo fight history table found by personLinks/boutResults, trying content analysis');
      
      for (let i = 0; i < tableData.length; i++) {
        const table = tableData[i];
        const tableContent = table.content.toLowerCase();
        if (tableContent.includes('date') && 
            (tableContent.includes('opponent') || tableContent.includes('result'))) {
          fightTableIndex = i;
          console.log(`Found likely fight table at index ${i} by content analysis`);
          break;
        }
      }
    }
    
    if (fightTableIndex === -1) {
      console.log('\nCould not find fight history table');
      return;
    }
    
    // Extract the first few fights for demonstration
    console.log('\nEXTRACTING SAMPLE FIGHTS:');
    
    // Use JavaScript to extract fight data
    const fights = await page.evaluate((tableIndex) => {
      const table = document.querySelectorAll('table')[tableIndex];
      const rows = table.querySelectorAll('tr');
      const fights = [];
      let count = 0;
      
      // Skip header row if present (first row with th)
      let startIndex = 0;
      if (rows[0] && rows[0].querySelector('th')) {
        startIndex = 1;
      }
      
      for (let i = startIndex; i < Math.min(rows.length, startIndex + 5); i++) {
        const row = rows[i];
        
        // Skip rows that seem to be metadata
        if (row.classList.contains('headerRow') || 
            row.classList.contains('textSubHead') ||
            row.style.display === 'none') {
          continue;
        }
        
        try {
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) continue;
          
          // Get cell texts for understanding data structure
          const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
          
          // Extract date
          let date = null;
          const dateLink = row.querySelector('a[href*="/date?date="]');
          if (dateLink) {
            date = dateLink.textContent.trim();
          }
          
          // Extract opponent
          let opponent = null;
          let opponentUrl = null;
          const personLink = row.querySelector('a.personLink');
          if (personLink) {
            opponent = personLink.textContent.trim();
            opponentUrl = personLink.href;
          }
          
          // Extract result
          let result = null;
          const boutResult = row.querySelector('div.boutResult');
          if (boutResult) {
            result = boutResult.textContent.trim();
          }
          
          // Extract rounds
          let rounds = null;
          for (const cell of cells) {
            if (cell.textContent.trim().match(/^\d+\/\d+$/)) {
              rounds = cell.textContent.trim();
              break;
            }
          }
          
          fights.push({
            index: count++,
            rowId: row.id || 'none',
            date,
            opponent,
            opponentUrl,
            result,
            rounds,
            allCells: cellTexts.join(' | ')
          });
        } catch (e) {
          fights.push({
            index: count++,
            error: e.toString()
          });
        }
      }
      
      return fights;
    }, fightTableIndex);
    
    console.log('\nSAMPLE FIGHTS FOUND:');
    fights.forEach(fight => {
      console.log(`\nFight ${fight.index} (Row ID: ${fight.rowId}):`);
      if (fight.error) {
        console.log(`  Error: ${fight.error}`);
      } else {
        console.log(`  Date: ${fight.date}`);
        console.log(`  Opponent: ${fight.opponent} (${fight.opponentUrl})`);
        console.log(`  Result: ${fight.result}`);
        console.log(`  Rounds: ${fight.rounds}`);
        console.log(`  All Cells: ${fight.allCells}`);
      }
    });
    
  } catch (error) {
    console.error('Error during page analysis:', error);
  } finally {
    // Wait to examine the page for 30 seconds before closing
    console.log('\nLeaving browser open for 30 seconds for manual inspection...');
    await delay(30000);
    await browser.close();
  }
}

// Run the script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node boxrec-debug-scraper.js <boxrec-fighter-url>');
    console.log('Example: node boxrec-debug-scraper.js https://boxrec.com/en/box-pro/659461');
    return;
  }
  
  const fighterUrl = args[0];
  await analyzeFighterPage(fighterUrl);
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error).finally(() => {
    console.log('Script execution complete');
  });
}