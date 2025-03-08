import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Unified search endpoint that combines fighter and user searches
 * This reduces multiple API calls to a single request
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (!query) {
      return NextResponse.json({
        error: 'Search query is required'
      }, { status: 400 });
    }
    
    // Run searches in parallel for performance
    const [fighters, users] = await Promise.all([
      // Search fighters
      prisma.fighter.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              nickname: {
                contains: query,
                mode: 'insensitive'
              }
            }
          ]
        },
        take: limit,
        orderBy: {
          name: 'asc'
        },
        // Select only the fields needed for search results
        select: {
          id: true,
          name: true,
          record: true,
          weightClass: true,
          imageUrl: true
        }
      }),
      
      // Search users
      prisma.user.findMany({
        where: {
          OR: [
            {
              username: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              email: {
                contains: query,
                mode: 'insensitive'
              }
            }
          ]
        },
        take: limit,
        orderBy: {
          username: 'asc'
        },
        // Select only needed fields
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          profile: {
            select: {
              bio: true
            }
          }
        }
      })
    ]);
    
    return NextResponse.json({
      fighters,
      users
    });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}