import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Import the scraper in a way compatible with Next.js API routes
let scrapeFightersPromise;

// Only import in server context to avoid client-side errors
if (typeof window === 'undefined') {
  const importScraperModule = async () => {
    const module = await import('../../../../scripts/boxrec-scraper');
    return module.scrapeFighters;
  };
  scrapeFightersPromise = importScraperModule();
}

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    // Check if the user is authorized (admin/moderator role)
    // Note: You should implement proper authorization here
    
    const requestData = await request.json();
    const { fighters } = requestData;
    
    if (!fighters || !Array.isArray(fighters) || fighters.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: fighters array is required' },
        { status: 400 }
      );
    }
    
    // Start the scraping process
    // This is an async operation and might take time
    // In a production environment, you might want to use a queue or a background job
    
    // Load the scraper function dynamically
    const scrapeFighters = await scrapeFightersPromise;
    
    // Start scraping in background
    (async () => {
      try {
        await scrapeFighters(fighters);
        console.log('Scraping completed successfully');
      } catch (error) {
        console.error('Error during scraping:', error);
      }
    })();
    
    // Immediately return response that scraping has started
    return NextResponse.json({
      message: 'Scraping process initiated',
      fighters: fighters.length
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve all fighters from the database
export async function GET() {
  try {
    const fighters = await prisma.fighter.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(fighters);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}