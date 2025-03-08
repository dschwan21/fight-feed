import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

// GET /api/users - Fetch users with pagination and search
export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    
    const skip = (page - 1) * pageSize;
    
    // Build the where clause based on search parameters
    const where = {};
    
    if (search) {
      where.OR = [
        {
          username: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }
    
    // Get total count for pagination
    const total = await prisma.user.count({ where });
    
    // Get users with pagination and include profile data
    const users = await prisma.user.findMany({
      where,
      include: {
        profile: true
      },
      orderBy: {
        username: 'asc'
      },
      skip,
      take: pageSize
    });
    
    return NextResponse.json({
      users,
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
  }
}

// POST /api/users - Create a new user
export async function POST(request) {
  try {
    const data = await request.json();
    const { email, username } = data;
    
    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          username ? { username } : {}
        ]
      }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { 
          error: existingUser.email === email 
            ? 'Email already in use' 
            : 'Username already in use' 
        },
        { status: 409 }
      );
    }
    
    // Create the user
    const newUser = await prisma.user.create({
      data: { 
        email, 
        username,
        profile: {
          create: {
            bio: data.bio,
            location: data.location
          }
        }
      },
      include: {
        profile: true
      }
    });
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}