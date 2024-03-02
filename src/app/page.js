import { options } from "./api/auth/[...nextauth]/options"
import { getServerSession } from "next-auth/next"
import { createClient } from "@supabase/supabase-js"
import UserCard from "./components/UserCard"

export default async function Home() {
  const session = await getServerSession(options)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: users } = await supabase.from('users').select('*')
  console.log('hi', supabaseUrl, supabaseKey, users)
  return (
    <>
      {session ? (
        <div>
          <UserCard user={session?.user} pagetype={"Home"} />
          <ul>
            {users.map((user, index) => (
              <li key={index}>{user.username}</li>
            ))}
          </ul>
        </div>
      ) : (
        <h1 className="text-5xl">You Shall Not Pass!</h1>
      )}
    </>
  )
}