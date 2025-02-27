import Link from "next/link";
import prisma from "@/lib/prisma";
import FightCard from "./components/FightCard";
import ScorecardDisplay from "./components/ScorecardDisplay";

async function getLatestFights() {
  try {
    return await prisma.fight.findMany({
      take: 3,
      orderBy: { date: "desc" },
      include: {
        fighter1: true,
        fighter2: true,
        _count: {
          select: { scorecards: true }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching latest fights:", error);
    return [];
  }
}

async function getLatestScorecards() {
  try {
    return await prisma.scorecard.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      where: { public: true },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        fight: {
          include: {
            fighter1: true,
            fighter2: true
          }
        },
        rounds: true,
        _count: {
          select: { comments: true }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching latest scorecards:", error);
    return [];
  }
}

export default async function Home() {
  const [latestFights, latestScorecards] = await Promise.all([
    getLatestFights(),
    getLatestScorecards()
  ]);
  
  return (
    <main className="min-h-screen pb-16">
      {/* Hero Section */}
      <section className="bg-background py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4">
              Score. Share. Discuss.
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Create round-by-round scorecards for your favorite fights and share them with the community.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/fights" 
              className="px-6 py-3 bg-primary text-white font-semibold rounded-custom text-lg hover:bg-opacity-90 transition"
            >
              Browse Fights
            </Link>
            <Link 
              href="/fights/new" 
              className="px-6 py-3 bg-secondary text-white font-semibold rounded-custom text-lg hover:bg-opacity-90 transition"
            >
              Add New Fight
            </Link>
          </div>
        </div>
      </section>
      
      {/* Latest Fights Section */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Latest Fights</h2>
            <Link href="/fights" className="text-primary font-semibold hover:underline">
              View All Fights →
            </Link>
          </div>
          
          {latestFights.length === 0 ? (
            <div className="bg-gray-50 p-8 rounded-custom text-center">
              <p className="text-gray-600 mb-4">No fights have been added yet.</p>
              <Link 
                href="/fights/new" 
                className="px-4 py-2 bg-primary text-white font-semibold rounded-custom hover:bg-opacity-90 transition"
              >
                Add the First Fight
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {latestFights.map(fight => (
                <FightCard key={fight.id} fight={fight} />
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* Latest Scorecards Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Latest Scorecards</h2>
            <Link href="/scorecards" className="text-primary font-semibold hover:underline">
              View All Scorecards →
            </Link>
          </div>
          
          {latestScorecards.length === 0 ? (
            <div className="bg-white p-8 rounded-custom text-center shadow-sm">
              <p className="text-gray-600">No scorecards have been submitted yet.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {latestScorecards.map(scorecard => (
                <ScorecardDisplay 
                  key={scorecard.id} 
                  scorecard={scorecard} 
                  showFightDetails={true}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-custom text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Find or Add a Fight</h3>
              <p className="text-gray-700">
                Search for an existing fight or add a new one to our database.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-custom text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Score Round-by-Round</h3>
              <p className="text-gray-700">
                Create your scorecard with round-by-round scoring using the 10-point must system.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-custom text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Share and Discuss</h3>
              <p className="text-gray-700">
                Compare your scorecard with others and discuss the fight with the community.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}