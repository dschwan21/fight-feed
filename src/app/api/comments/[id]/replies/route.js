import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { options } from '../../../auth/[...nextauth]/options';

// GET replies for a comment
export async function GET(request, { params }) {
  const { id } = params;
  
  try {
    const replies = await prisma.comment.findMany({
      where: { 
        parentId: parseInt(id)
      },
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
    });
    
    return NextResponse.json(replies);
  } catch (error) {
    console.error("Error fetching replies:", error);
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    );
  }
}

// POST a reply to a comment
export async function POST(request, { params }) {
  const session = await getServerSession(options);
  const { id } = params;
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Check if parent comment exists
    const parentComment = await prisma.comment.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!parentComment) {
      return NextResponse.json(
        { error: 'Parent comment not found' },
        { status: 404 }
      );
    }
    
    // Check if parent is already a reply (we only allow one level of nesting)
    if (parentComment.parentId) {
      return NextResponse.json(
        { error: 'Cannot reply to a reply' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { content } = body;
    
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    const reply = await prisma.comment.create({
      data: {
        content,
        userId: session.user.id,
        parentId: parseInt(id),
        // Copy the scorecardId from the parent
        scorecardId: parentComment.scorecardId
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
    
    return NextResponse.json(reply);
  } catch (error) {
    console.error("Error creating reply:", error);
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    );
  }
}