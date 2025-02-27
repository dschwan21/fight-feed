import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import FightCard from "@/app/components/FightCard";
import ScorecardSummary from "@/app/components/ScorecardSummary";
import Link from "next/link";

async function getFight(id) {
  try {
    const fight = await prisma.fight.findUnique({
      where: { id: parseInt(id) },
      include: {
        fighter1: true,
        fighter2: true,
        scorecards: {
          where: { public: true },
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true
              }
            },
            rounds: {
              orderBy: { roundNumber: 'asc' }  // Order rounds
            },
            _count: {
              select: { comments: true }
            }
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        createdBy: {
          select: {
            id: true,
            username: true
          }
        },
        _count: {
          select: { scorecards: true }
        }
      }
    });

    // Process scorecards to ensure all have complete data
    if (fight && fight.scorecards) {
      fight.scorecards = fight.scorecards.filter(scorecard => 
        scorecard && 
        scorecard.user && 
        scorecard.rounds && 
        scorecard.rounds.length > 0
      );
    }

    return fight;
  } catch (error) {
    console.error("Error fetching fight:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const fight = await getFight(params.id);
  
  if (!fight) {
    return {
      title: "Fight Not Found"
    };
  }
  
  return {
    title: `${fight.fighter1.name} vs ${fight.fighter2.name} | Fight Feed`,
    description: `View scorecards for ${fight.fighter1.name} vs ${fight.fighter2.name} at ${fight.eventName}`
  };
}

export default async function FightPage({ params }) {
  const fight = await getFight(params.id);
  
  if (!fight) {
    notFound();
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <FightCard fight={fight} detailed={true} />
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Community Scorecards</h2>
          <Link 
            href={`/fight/${fight.id}/score`}
            className="px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition"
          >
            Score This Fight
          </Link>
        </div>
        
        {fight.scorecards.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-lg text-gray-600 mb-4">No scorecards yet for this fight.</p>
            <p className="text-gray-500">Be the first to add your scorecard!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fight.scorecards.map(scorecard => {
              // Make sure the scorecard has all necessary data before rendering
              const hasRequiredData = 
                scorecard && 
                scorecard.user && 
                scorecard.rounds?.length > 0 && 
                fight && 
                fight.fighter1 && 
                fight.fighter2;
                
              if (!hasRequiredData) return null;
              
              return (
                <ScorecardSummary 
                  key={scorecard.id}
                  scorecard={{
                    ...scorecard,
                    fight: scorecard.fight || fight  // Ensure fight data is available
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}