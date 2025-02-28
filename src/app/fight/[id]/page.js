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
      <div className="mb-12">
        <FightCard fight={fight} detailed={true} />
      </div>
      
      <div className="mb-8 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b-2 border-gray-300 pb-4">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-3xl font-bold font-serif text-textDark">Community Scorecards</h2>
            <p className="text-gray-600 font-serif mt-1">
              See how the community scored this bout
            </p>
          </div>
          <Link 
            href={`/fight/${fight.id}/score`}
            className="px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition shadow-md flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            Score This Fight
          </Link>
        </div>
        
        {fight.scorecards.length === 0 ? (
          <div className="bg-cream p-8 rounded-custom shadow-md text-center border-2 border-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xl text-gray-700 mb-4 font-serif">No scorecards yet for this fight</p>
            <p className="text-gray-600 font-serif">Be the first to add your scorecard and kick off the discussion!</p>
            <Link 
              href={`/fight/${fight.id}/score`}
              className="mt-6 inline-block px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition shadow-md"
            >
              Create Scorecard
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        
        {fight.scorecards.length > 0 && (
          <div className="mt-8 text-center">
            <Link 
              href={`/fight/${fight.id}/score`}
              className="inline-block px-6 py-3 bg-cream text-gray-800 rounded-full font-semibold hover:bg-gray-200 transition shadow-md border-2 border-gray-300"
            >
              Add Your Scorecard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}