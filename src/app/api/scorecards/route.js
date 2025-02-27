import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { options } from '../auth/[...nextauth]/options';

// GET all public scorecards
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fightId = searchParams.get('fightId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Build filters
    const where = {
      public: true,
      ...(fightId ? { fightId: parseInt(fightId) } : {}),
      ...(userId ? { userId: parseInt(userId) } : {})
    };

    // Fetch scorecards with pagination
    const scorecards = await prisma.scorecard.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        fight: {
          include: {
            fighter1: true,
            fighter2: true
          }
        },
        rounds: true,
        _count: {
          select: { comments: true }
        }
      }
    });

    // Get total count for pagination
    const totalScorecards = await prisma.scorecard.count({ where });

    return NextResponse.json({
      scorecards,
      pagination: {
        total: totalScorecards,
        pages: Math.ceil(totalScorecards / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching scorecards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scorecards' },
      { status: 500 }
    );
  }
}

// Create a new scorecard
export async function POST(request) {
  try {
    const session = await getServerSession(options);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      fightId,
      rounds,
      notes,
      public: isPublic
    } = body;

    // Validation
    if (!fightId || !rounds || !Array.isArray(rounds) || rounds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the fight exists
    const fight = await prisma.fight.findUnique({
      where: { id: parseInt(fightId) }
    });

    if (!fight) {
      return NextResponse.json(
        { error: 'Fight not found' },
        { status: 404 }
      );
    }

    // Check if user already has a scorecard for this fight
    const existingScorecard = await prisma.scorecard.findFirst({
      where: {
        userId: session.user.id,
        fightId: parseInt(fightId)
      }
    });

    if (existingScorecard) {
      return NextResponse.json(
        { error: 'You already have a scorecard for this fight' },
        { status: 400 }
      );
    }

    // Create the scorecard and rounds in a transaction
    const newScorecard = await prisma.$transaction(async (tx) => {
      // Create the scorecard first
      const scorecard = await tx.scorecard.create({
        data: {
          user: { connect: { id: session.user.id } },
          fight: { connect: { id: parseInt(fightId) } },
          notes,
          public: isPublic !== undefined ? isPublic : true
        }
      });

      // Validate rounds
      for (const round of rounds) {
        if (!round.roundNumber || round.fighter1Score === undefined || round.fighter2Score === undefined) {
          throw new Error('Invalid round data');
        }

        // Validate scores are between 1-10
        if (round.fighter1Score < 1 || round.fighter1Score > 10 || 
            round.fighter2Score < 1 || round.fighter2Score > 10) {
          throw new Error('Round scores must be between 1 and 10');
        }
      }

      // Create all rounds for this scorecard
      await tx.round.createMany({
        data: rounds.map(round => ({
          scorecardId: scorecard.id,
          roundNumber: round.roundNumber,
          fighter1Score: round.fighter1Score,
          fighter2Score: round.fighter2Score,
          swingRound: round.swingRound === true,
          notes: round.notes
        }))
      });

      // Return the complete scorecard with rounds
      return tx.scorecard.findUnique({
        where: { id: scorecard.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          },
          fight: {
            include: {
              fighter1: true,
              fighter2: true
            }
          },
          rounds: {
            orderBy: { roundNumber: 'asc' }
          }
        }
      });
    });

    return NextResponse.json(newScorecard, { status: 201 });
  } catch (error) {
    console.error('Error creating scorecard:', error);
    return NextResponse.json(
      { error: 'Failed to create scorecard', details: error.message },
      { status: 500 }
    );
  }
}