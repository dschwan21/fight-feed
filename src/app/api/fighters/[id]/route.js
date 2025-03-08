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
        // Include fighter's recent fights
        fightsFighter1: {
          take: 5,
          orderBy: { date: 'desc' },
          include: {
            fighter2: true
          }
        },
        fightsFighter2: {
          take: 5,
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
    ].sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5); // Take the 5 most recent fights
    
    // Format the response
    const response = {
      ...fighter,
      fightsFighter1: undefined,
      fightsFighter2: undefined,
      recentFights: allFights
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