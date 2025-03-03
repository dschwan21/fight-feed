import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { options } from '../auth/[...nextauth]/options';

// GET comments for a scorecard
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const scorecardId = searchParams.get('scorecardId');
  
  if (!scorecardId) {
    return NextResponse.json(
      { error: 'Scorecard ID is required' },
      { status: 400 }
    );
  }

  try {
    const comments = await prisma.comment.findMany({
      where: { 
        scorecardId: parseInt(scorecardId),
        parentId: null // Only get top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST a new comment or reply
export async function POST(request) {
  const session = await getServerSession(options);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { content, scorecardId, parentId } = body;
    
    if (!content || !scorecardId) {
      return NextResponse.json(
        { error: 'Content and scorecard ID are required' },
        { status: 400 }
      );
    }
    
    const comment = await prisma.comment.create({
      data: {
        content,
        userId: session.user.id,
        scorecardId: parseInt(scorecardId),
        parentId: parentId ? parseInt(parentId) : null
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });
    
    return NextResponse.json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}