import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { options } from '../../../auth/[...nextauth]/options';

// GET user's scorecards (both public and private if owner)
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(options);
    const userId = parseInt(params.id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Define filter - if user is viewing their own profile, show all scorecards
    // Otherwise only show public scorecards
    const isOwner = session?.user?.id === userId;
    const where = {
      userId: userId,
      ...(isOwner ? {} : { public: true })
    };
    
    // Fetch scorecards
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
        rounds: {
          orderBy: { roundNumber: 'asc' }
        },
        _count: {
          select: { comments: true }
        }
      }
    });
    
    // Ensure swing round flag is properly set for each round
    const processedScorecards = scorecards.map(scorecard => ({
      ...scorecard,
      rounds: scorecard.rounds.map(round => ({
        ...round,
        swingRound: round.swingRound === true || round.swingRound === 'true'
      }))
    }));
    
    // Get total count for pagination
    const total = await prisma.scorecard.count({ where });
    
    return NextResponse.json({
      scorecards: processedScorecards,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching user scorecards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scorecards', details: error.message },
      { status: 500 }
    );
  }
}