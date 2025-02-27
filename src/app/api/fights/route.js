import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { options } from '../auth/[...nextauth]/options';

// GET all fights
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Build search filters
    const where = query ? {
      OR: [
        { eventName: { contains: query, mode: 'insensitive' } },
        { fighter1: { name: { contains: query, mode: 'insensitive' } } },
        { fighter2: { name: { contains: query, mode: 'insensitive' } } },
      ]
    } : {};

    // Fetch fights with pagination
    const fights = await prisma.fight.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        fighter1: true,
        fighter2: true,
        _count: {
          select: { scorecards: true }
        }
      }
    });

    // Get total count for pagination
    const totalFights = await prisma.fight.count({ where });

    return NextResponse.json({
      fights, 
      pagination: {
        total: totalFights,
        pages: Math.ceil(totalFights / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching fights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fights' },
      { status: 500 }
    );
  }
}

// Create a new fight
export async function POST(request) {
  try {
    const session = await getServerSession(options);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Make sure session.user is defined and has an id
    if (!session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    const body = await request.json();
    console.log("Request body:", JSON.stringify(body));
    
    const { 
      fighter1, 
      fighter2, 
      eventName,
      date,
      venue,
      location,
      weightClass,
      numberOfRounds
    } = body;

    // Validation
    if (!fighter1 || !fighter2 || !eventName || !date || !numberOfRounds) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create fighter 1
    let fighter1Relation;
    if (fighter1.id) {
      fighter1Relation = { connect: { id: fighter1.id } };
    } else {
      const existingFighter1 = await prisma.fighter.findFirst({
        where: { name: { equals: fighter1.name, mode: 'insensitive' } }
      });

      if (existingFighter1) {
        fighter1Relation = { connect: { id: existingFighter1.id } };
      } else {
        fighter1Relation = { 
          create: {
            name: fighter1.name,
            nickname: fighter1.nickname || null,
            nationality: fighter1.nationality || null,
            record: fighter1.record || null,
            weightClass: fighter1.weightClass || null,
            imageUrl: fighter1.imageUrl || null
          } 
        };
      }
    }

    // Create fighter 2
    let fighter2Relation;
    if (fighter2.id) {
      fighter2Relation = { connect: { id: fighter2.id } };
    } else {
      const existingFighter2 = await prisma.fighter.findFirst({
        where: { name: { equals: fighter2.name, mode: 'insensitive' } }
      });

      if (existingFighter2) {
        fighter2Relation = { connect: { id: existingFighter2.id } };
      } else {
        fighter2Relation = { 
          create: {
            name: fighter2.name,
            nickname: fighter2.nickname || null,
            nationality: fighter2.nationality || null,
            record: fighter2.record || null,
            weightClass: fighter2.weightClass || null,
            imageUrl: fighter2.imageUrl || null
          } 
        };
      }
    }

    // Create the fight
    const newFight = await prisma.fight.create({
      data: {
        eventName,
        date: new Date(date),
        venue: venue || null,
        location: location || null,
        weightClass: weightClass || null,
        numberOfRounds: parseInt(numberOfRounds),
        result: 'PENDING',
        createdBy: { connect: { id: userId } },
        fighter1: fighter1Relation,
        fighter2: fighter2Relation
      },
      include: {
        fighter1: true,
        fighter2: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(newFight, { status: 201 });
  } catch (error) {
    console.error('Error creating fight:', error);
    return NextResponse.json(
      { error: 'Failed to create fight', details: error.message },
      { status: 500 }
    );
  }
}