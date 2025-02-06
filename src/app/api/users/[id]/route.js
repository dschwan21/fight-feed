import prisma from "@/lib/prisma";

// GET /api/users/:id - Fetch a specific user
export async function GET(req, { params }) {
  const { id } = params;

  try {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) return new Response("User not found", { status: 404 });

    return new Response(JSON.stringify(user), { status: 200 });
  } catch (error) {
    return new Response("Failed to fetch user", { status: 500 });
  }
}

// PUT /api/users/:id - Update a specific user
export async function PUT(req, { params }) {
  const { id } = params;
  const { username } = await req.json();

  try {
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { username },
    });
    return new Response(JSON.stringify(updatedUser), { status: 200 });
  } catch (error) {
    return new Response("Failed to update user", { status: 500 });
  }
}

// DELETE /api/users/:id - Delete a specific user
export async function DELETE(req, { params }) {
  const { id } = params;

  try {
    await prisma.user.delete({ where: { id: Number(id) } });
    return new Response("User deleted", { status: 200 });
  } catch (error) {
    return new Response("Failed to delete user", { status: 500 });
  }
}