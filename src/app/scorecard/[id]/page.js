import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ScorecardDisplay from "@/app/components/ScorecardDisplay";
import CommentSection from "@/app/components/CommentSection";
import Link from "next/link";

async function getScorecard(id) {
  try {
    const scorecard = await prisma.scorecard.findUnique({
      where: { id: parseInt(id) },
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
        rounds: {
          orderBy: { roundNumber: 'asc' },
          select: {
            id: true,
            roundNumber: true,
            fighter1Score: true,
            fighter2Score: true,
            notes: true,
            swingRound: true
          }
        }
      }
    });

    // Ensure swingRound is properly defined on each round (handle nulls)
    if (scorecard && scorecard.rounds) {
      scorecard.rounds = scorecard.rounds.map(round => ({
        ...round,
        swingRound: round.swingRound === true || round.swingRound === 'true'
      }));
    }
    
    return scorecard;
  } catch (error) {
    console.error("Error fetching scorecard:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const scorecard = await getScorecard(params.id);
  
  if (!scorecard) {
    return {
      title: "Scorecard Not Found"
    };
  }
  
  return {
    title: `${scorecard.user.username}'s Scorecard: ${scorecard.fight.fighter1.name} vs ${scorecard.fight.fighter2.name} | Fight Feed`,
    description: `View ${scorecard.user.username}'s scorecard for ${scorecard.fight.fighter1.name} vs ${scorecard.fight.fighter2.name}`
  };
}

export default async function ScorecardPage({ params }) {
  const scorecard = await getScorecard(params.id);
  
  if (!scorecard) {
    notFound();
  }
  
  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-3 sm:px-4">
      <div className="mb-4">
        <Link href={`/fight/${scorecard.fightId}`} className="text-primary hover:underline">
          ← Back to Fight
        </Link>
      </div>
      
      <ScorecardDisplay 
        scorecard={scorecard} 
        showFightDetails={true}
        showActions={true} 
      />
      
      <div className="mt-8">
        <CommentSection scorecardId={scorecard.id} />
      </div>
    </div>
  );
}