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
        return new Response(JSON.stringify({ error: "User not found" }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  
      console.log("User found:", user);
      return new Response(JSON.stringify(user), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch user" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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
            return new Response(JSON.stringify({ error: "Unauthorized: No session found" }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { id } = params;
        const body = await req.json();
        const { username, bio, location } = body;

        console.log("📝 Request body:", body);
        console.log("🔎 Comparing session user ID:", session.user.id, "with request ID:", Number(id));

        if (session.user.id !== Number(id)) {
            console.log("⛔ Unauthorized: User IDs do not match.");
            return new Response(JSON.stringify({ error: "Forbidden: Cannot update another user's profile" }), { 
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify that all required fields are present
        if (username === undefined) {
            return new Response(JSON.stringify({ error: "Username is required" }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
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
        return new Response(JSON.stringify(updatedUser), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("❌ Error updating user:", error);
        return new Response(JSON.stringify({ error: "Failed to update user", details: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// DELETE /api/users/:id - Delete a specific user
export async function DELETE(req, { params }) {
  const { id } = params;

  try {
    const session = await getServerSession(options);
    
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized: No session found" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Only allow users to delete their own account or admins to delete any account
    if (session.user.id !== Number(id) && session.user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: "Forbidden: Cannot delete another user's account" }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await prisma.user.delete({ where: { id: Number(id) } });
    return new Response(JSON.stringify({ success: true, message: "User deleted" }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to delete user", details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}