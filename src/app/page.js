import { options } from "./api/auth/[...nextauth]/options"
import { getServerSession } from "next-auth/next"
import UserCard from "./components/UserCard"
import prisma from "@/lib/prisma"
import { useRouter } from "next/navigation"

export default async function Home() {
  const session = await getServerSession(options)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const users = await prisma.user.findMany();
  console.log('users', users)

  return (
    <>
      {session ? (
        <div>
          <UserCard user={session?.user} pagetype={"Home"} />
          <h2 className="text-2xl mt-4">Users from Database:</h2>
          <ul>
            {users.map((user, index) => (
              <li key={index}>{user.username}</li>  // this will display the username from the database
            ))}
          </ul>
        </div>
      ) : (
        <h1 className="text-5xl">You Shall Not Pass!</h1>
      )}
    </>
  )
}