import { prisma } from "@/lib/prisma";

export async function GET(req, { params }) {
  const { id } = params;

  try {
    const followers = await prisma.follower.findMany({
      where: { followingId: parseInt(id) },
      include: { follower: true },
    });

    return Response.json(followers);
  } catch (error) {
    return Response.json({ error: "Error fetching followers" }, { status: 500 });
  }
}