import prisma from "@/lib/prisma";

// GET /api/users - Fetch all users
export async function GET(req) {
  try {
    const users = await prisma.user.findMany();
    return new Response(JSON.stringify(users), { status: 200 });
  } catch (error) {
    return new Response("Failed to fetch users", { status: 500 });
  }
}

// POST /api/users - Create a new user
export async function POST(req) {
  const { email, username } = await req.json();

  try {
    const newUser = await prisma.user.create({
      data: { email, username },
    });
    return new Response(JSON.stringify(newUser), { status: 201 });
  } catch (error) {
    return new Response("Failed to create user", { status: 500 });
  }
}