import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { options } from '../../auth/[...nextauth]/options';

// GET a single scorecard
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const session = await getServerSession(options);
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Invalid scorecard ID' },
        { status: 400 }
      );
    }

    const scorecard = await prisma.scorecard.findUnique({
      where: { id: parseInt(id) },
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
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!scorecard) {
      return NextResponse.json(
        { error: 'Scorecard not found' },
        { status: 404 }
      );
    }

    // Check if the scorecard is private and if the user is authorized to view it
    if (!scorecard.public) {
      // If no session or user is not the creator
      if (!session || scorecard.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Not authorized to view this scorecard' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(scorecard);
  } catch (error) {
    console.error('Error fetching scorecard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scorecard' },
      { status: 500 }
    );
  }
}

// Update a scorecard
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(options);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Invalid scorecard ID' },
        { status: 400 }
      );
    }

    const existingScorecard = await prisma.scorecard.findUnique({
      where: { id: parseInt(id) },
      include: { rounds: true }
    });

    if (!existingScorecard) {
      return NextResponse.json(
        { error: 'Scorecard not found' },
        { status: 404 }
      );
    }

    // Check if user is the creator
    if (existingScorecard.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this scorecard' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      notes,
      public: isPublic,
      rounds
    } = body;

    // Update the scorecard in a transaction
    const updatedScorecard = await prisma.$transaction(async (tx) => {
      // Update the scorecard first
      const scorecard = await tx.scorecard.update({
        where: { id: parseInt(id) },
        data: {
          notes,
          public: isPublic !== undefined ? isPublic : existingScorecard.public
        }
      });

      // Only update rounds if provided
      if (rounds && Array.isArray(rounds)) {
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

        // Update existing rounds or create new ones
        for (const round of rounds) {
          await tx.round.upsert({
            where: {
              scorecardId_roundNumber: {
                scorecardId: scorecard.id,
                roundNumber: round.roundNumber
              }
            },
            update: {
              fighter1Score: round.fighter1Score,
              fighter2Score: round.fighter2Score,
              notes: round.notes
            },
            create: {
              scorecardId: scorecard.id,
              roundNumber: round.roundNumber,
              fighter1Score: round.fighter1Score,
              fighter2Score: round.fighter2Score,
              notes: round.notes
            }
          });
        }

        // Delete rounds that are not in the updated array
        const updatedRoundNumbers = rounds.map(r => r.roundNumber);
        const existingRoundNumbers = existingScorecard.rounds.map(r => r.roundNumber);
        
        const roundsToDelete = existingRoundNumbers.filter(
          num => !updatedRoundNumbers.includes(num)
        );

        if (roundsToDelete.length > 0) {
          await tx.round.deleteMany({
            where: {
              scorecardId: scorecard.id,
              roundNumber: { in: roundsToDelete }
            }
          });
        }
      }

      // Return the complete updated scorecard
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

    return NextResponse.json(updatedScorecard);
  } catch (error) {
    console.error('Error updating scorecard:', error);
    return NextResponse.json(
      { error: 'Failed to update scorecard', details: error.message },
      { status: 500 }
    );
  }
}

// Delete a scorecard
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(options);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Invalid scorecard ID' },
        { status: 400 }
      );
    }

    const existingScorecard = await prisma.scorecard.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingScorecard) {
      return NextResponse.json(
        { error: 'Scorecard not found' },
        { status: 404 }
      );
    }

    // Check if user is the creator or an admin
    const isCreator = existingScorecard.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    
    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to delete this scorecard' },
        { status: 403 }
      );
    }

    // Delete related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all rounds
      await tx.round.deleteMany({
        where: { scorecardId: parseInt(id) }
      });
      
      // Delete all comments
      await tx.comment.deleteMany({
        where: { scorecardId: parseInt(id) }
      });

      // Delete the scorecard
      await tx.scorecard.delete({
        where: { id: parseInt(id) }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scorecard:', error);
    return NextResponse.json(
      { error: 'Failed to delete scorecard' },
      { status: 500 }
    );
  }
}