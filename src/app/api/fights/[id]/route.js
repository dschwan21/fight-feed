import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { options } from '../../auth/[...nextauth]/options';

// GET a single fight with its scorecards
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Invalid fight ID' },
        { status: 400 }
      );
    }

    const fight = await prisma.fight.findUnique({
      where: { id: parseInt(id) },
      include: {
        fighter1: true,
        fighter2: true,
        scorecards: {
          where: { public: true },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true
              }
            },
            rounds: true,
            _count: {
              select: { comments: true }
            }
          }
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
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        createdBy: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    if (!fight) {
      return NextResponse.json(
        { error: 'Fight not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(fight);
  } catch (error) {
    console.error('Error fetching fight:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fight' },
      { status: 500 }
    );
  }
}

// Update a fight
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
        { error: 'Invalid fight ID' },
        { status: 400 }
      );
    }

    const existingFight = await prisma.fight.findUnique({
      where: { id: parseInt(id) },
      include: { createdBy: true }
    });

    if (!existingFight) {
      return NextResponse.json(
        { error: 'Fight not found' },
        { status: 404 }
      );
    }

    // Check if user is creator or admin
    const isCreator = existingFight.createdById === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    
    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to update this fight' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      eventName,
      date,
      venue,
      location,
      weightClass,
      numberOfRounds,
      result,
      winMethod
    } = body;

    // Update the fight
    const updatedFight = await prisma.fight.update({
      where: { id: parseInt(id) },
      data: {
        eventName,
        date: date ? new Date(date) : undefined,
        venue,
        location,
        weightClass,
        numberOfRounds,
        result,
        winMethod
      },
      include: {
        fighter1: true,
        fighter2: true,
        createdBy: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return NextResponse.json(updatedFight);
  } catch (error) {
    console.error('Error updating fight:', error);
    return NextResponse.json(
      { error: 'Failed to update fight', details: error.message },
      { status: 500 }
    );
  }
}

// Delete a fight
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
        { error: 'Invalid fight ID' },
        { status: 400 }
      );
    }

    const existingFight = await prisma.fight.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingFight) {
      return NextResponse.json(
        { error: 'Fight not found' },
        { status: 404 }
      );
    }

    // Check if user is creator or admin
    const isCreator = existingFight.createdById === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    
    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to delete this fight' },
        { status: 403 }
      );
    }

    // Delete all related scorecards first
    await prisma.scorecard.deleteMany({
      where: { fightId: parseInt(id) }
    });
    
    // Delete all comments related to this fight
    await prisma.comment.deleteMany({
      where: { fightId: parseInt(id) }
    });

    // Delete the fight
    await prisma.fight.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fight:', error);
    return NextResponse.json(
      { error: 'Failed to delete fight' },
      { status: 500 }
    );
  }
}