import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
// import { auth } from "@/auth"; // ✅ Use `auth()` instead of `getServerSession`

// GET /api/users/:id - Fetch a specific user
export async function GET(req, { params }) {
    console.log("Received params:", params); // Debugging
  
    const { id } = params;
  
    try {
      console.log("Fetching user with ID:", id); // Debugging
  
      const user = await prisma.user.findUnique({
        where: { id: Number(id) },
        include: { profile: true },
      });
  
      if (!user) {
        console.log("User not found in DB");
        return new Response("User not found", { status: 404 });
      }
  
      console.log("User found:", user);
      return new Response(JSON.stringify(user), { status: 200 });
    } catch (error) {
      console.error("Error fetching user:", error);
      return new Response("Failed to fetch user", { status: 500 });
    }
  }

// ✅ Full PUT /api/users/:id - Update user & profile
export async function PUT(req, { params }) {
    console.log("🔍 Received params:", params);

    try {
        // Log before calling session
        console.log("🔑 Attempting to retrieve session...");
        
        // ✅ Corrected: Call `getServerSession(options)` without `req`
        const session = await getServerSession(options);
        
        // Log session result
        console.log("✅ Session data:", session);

        if (!session || !session.user) {
            console.error("❌ Unauthorized request: No valid session.");
            return new Response(JSON.stringify({ error: "Unauthorized: No session found" }), { status: 401 });
        }

        const { id } = params;
        const { username, bio, location } = await req.json();

        console.log("🔎 Comparing session user ID:", session.user.id, "with request ID:", Number(id));

        if (session.user.id !== Number(id)) {
            console.log("⛔ Unauthorized: User IDs do not match.");
            return new Response(JSON.stringify({ error: "Forbidden: Cannot update another user's profile" }), { status: 403 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: Number(id) },
            data: {
                username,
                profile: {
                    upsert: {
                        create: { bio, location },
                        update: { bio, location },
                    },
                },
            },
            include: { profile: true },
        });

        console.log("✅ User updated successfully:", updatedUser);
        return new Response(JSON.stringify(updatedUser), { status: 200 });

    } catch (error) {
        console.error("❌ Error updating user:", error);
        return new Response(JSON.stringify({ error: "Failed to update user" }), { status: 500 });
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