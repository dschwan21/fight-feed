import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ScorecardForm from "@/app/components/ScorecardForm";

async function getFight(id) {
  try {
    const fight = await prisma.fight.findUnique({
      where: { id: parseInt(id) },
      include: {
        fighter1: true,
        fighter2: true
      }
    });
    
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
    title: `Score: ${fight.fighter1.name} vs ${fight.fighter2.name} | Fight Feed`,
    description: `Create your scorecard for ${fight.fighter1.name} vs ${fight.fighter2.name}`
  };
}

export default async function ScoreCardPage({ params }) {
  const fight = await getFight(params.id);
  
  if (!fight) {
    notFound();
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Score This Fight</h1>
      
      <ScorecardForm fight={fight} />
      
      <div className="mt-8 p-4 bg-gray-50 rounded-custom shadow-sm">
        <h2 className="text-lg font-semibold mb-2">About Fight Scoring</h2>
        <p className="text-gray-700 mb-3">
          In boxing and MMA, fights are typically scored using the "10-Point Must System" where:
        </p>
        <ul className="list-disc pl-5 text-gray-700 space-y-1">
          <li>The winner of a round receives 10 points</li>
          <li>The loser typically receives 9 points (or less for dominant rounds)</li>
          <li>Even rounds can be scored 10-10, but are rare</li>
          <li>A fighter may lose an additional point for fouls (e.g., 10-8)</li>
        </ul>
      </div>
    </div>
  );
}