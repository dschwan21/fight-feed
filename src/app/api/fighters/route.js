import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET endpoint to retrieve fighters with pagination and search
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const weightClass = searchParams.get('weightClass') || '';
    
    const skip = (page - 1) * pageSize;
    
    // Build the where clause based on search parameters
    const where = {};
    
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }
    
    if (weightClass) {
      where.weightClass = {
        contains: weightClass,
        mode: 'insensitive'
      };
    }
    
    // Get total count for pagination
    const total = await prisma.fighter.count({ where });
    
    // Get fighters with pagination
    const fighters = await prisma.fighter.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      skip,
      take: pageSize
    });
    
    return NextResponse.json({
      fighters,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
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

// POST endpoint to create a new fighter
export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: 'Fighter name is required' },
        { status: 400 }
      );
    }
    
    // Check if fighter already exists
    const existingFighter = await prisma.fighter.findFirst({
      where: {
        name: {
          equals: data.name,
          mode: 'insensitive'
        }
      }
    });
    
    if (existingFighter) {
      return NextResponse.json(
        { error: 'Fighter with this name already exists', fighter: existingFighter },
        { status: 409 }
      );
    }
    
    // Create the fighter
    const fighter = await prisma.fighter.create({
      data: {
        name: data.name,
        nickname: data.nickname,
        weightClass: data.weightClass,
        nationality: data.nationality,
        record: data.record,
        imageUrl: data.imageUrl
      }
    });
    
    return NextResponse.json(fighter, { status: 201 });
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