import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET endpoint to retrieve a specific fighter by ID
export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid fighter ID' },
        { status: 400 }
      );
    }
    
    const fighter = await prisma.fighter.findUnique({
      where: { id },
      include: {
        // Include all of fighter's fights
        fightsFighter1: {
          orderBy: { date: 'desc' },
          include: {
            fighter2: true
          }
        },
        fightsFighter2: {
          orderBy: { date: 'desc' },
          include: {
            fighter1: true
          }
        }
      }
    });
    
    if (!fighter) {
      return NextResponse.json(
        { error: 'Fighter not found' },
        { status: 404 }
      );
    }
    
    // Combine and sort fights by date
    const allFights = [
      ...fighter.fightsFighter1.map(fight => ({
        ...fight,
        isFighter1: true
      })),
      ...fighter.fightsFighter2.map(fight => ({
        ...fight,
        isFighter1: false
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Calculate fighter's record from fight history
    let wins = 0, losses = 0, draws = 0;
    
    allFights.forEach(fight => {
      const isFighter1 = fight.fighter1Id === id;
      
      if (fight.result === 'FIGHTER1_WIN') {
        isFighter1 ? wins++ : losses++;
      } else if (fight.result === 'FIGHTER2_WIN') {
        isFighter1 ? losses++ : wins++;
      } else if (fight.result === 'DRAW') {
        draws++;
      }
      // Ignore NO_CONTEST and PENDING
    });
    
    // Create calculated record string
    const calculatedRecord = `${wins}-${losses}-${draws}`;
    
    // Format the response
    const response = {
      ...fighter,
      fightsFighter1: undefined,
      fightsFighter2: undefined,
      recentFights: allFights.slice(0, 5), // Still return 5 most recent for summary display
      allFights: allFights, // Return all fights for the complete history
      calculatedRecord // Add the calculated record
    };
    
    return NextResponse.json(response);
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

// PUT endpoint to update a fighter
export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid fighter ID' },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    
    // Check if fighter exists
    const existingFighter = await prisma.fighter.findUnique({
      where: { id }
    });
    
    if (!existingFighter) {
      return NextResponse.json(
        { error: 'Fighter not found' },
        { status: 404 }
      );
    }
    
    // Update the fighter
    const updatedFighter = await prisma.fighter.update({
      where: { id },
      data: {
        name: data.name,
        nickname: data.nickname,
        weightClass: data.weightClass,
        nationality: data.nationality,
        record: data.record,
        imageUrl: data.imageUrl,
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json(updatedFighter);
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

// DELETE endpoint to delete a fighter
export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid fighter ID' },
        { status: 400 }
      );
    }
    
    // Check if fighter exists
    const existingFighter = await prisma.fighter.findUnique({
      where: { id }
    });
    
    if (!existingFighter) {
      return NextResponse.json(
        { error: 'Fighter not found' },
        { status: 404 }
      );
    }
    
    // Check if fighter is used in any fights
    const fightCount = await prisma.fight.count({
      where: {
        OR: [
          { fighter1Id: id },
          { fighter2Id: id }
        ]
      }
    });
    
    if (fightCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete fighter that is used in fights',
          fightCount 
        },
        { status: 409 }
      );
    }
    
    // Delete the fighter
    await prisma.fighter.delete({
      where: { id }
    });
    
    return NextResponse.json(
      { message: 'Fighter deleted successfully' },
      { status: 200 }
    );
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