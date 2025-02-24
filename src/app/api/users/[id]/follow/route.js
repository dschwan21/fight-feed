import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";

export async function POST(req, { params }) {
  const session = await getServerSession(options);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const userId = session.user.id;

  if (userId === parseInt(id)) {
    return Response.json({ error: "You can't follow yourself" }, { status: 400 });
  }

  try {
    const existingFollow = await prisma.follower.findFirst({
      where: { followerId: userId, followingId: parseInt(id) },
    });

    if (existingFollow) {
      // Unfollow user
      await prisma.follower.delete({
        where: { id: existingFollow.id },
      });
      return Response.json({ message: "Unfollowed user" });
    } else {
      // Follow user
      await prisma.follower.create({
        data: {
          followerId: userId,
          followingId: parseInt(id),
        },
      });
      return Response.json({ message: "Followed user" });
    }
  } catch (error) {
    return Response.json({ error: "Error processing request" }, { status: 500 });
  }
}