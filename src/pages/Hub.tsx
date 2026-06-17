import { NextEventCard } from '../components/dashboard/NextEventCard'
import { KingdomTimelineCard } from '../components/dashboard/KingdomTimelineCard'
import { PendingPollsCard } from '../components/dashboard/PendingPollsCard'
import { UserHeroCard } from '../components/dashboard/UserHeroCard'
import { GameCatalogueCard } from '../components/dashboard/GameCatalogueCard'

export function Hub() {
  return (
    <div className="container-wide pt-3 pb-4 sm:pt-6 sm:pb-6 space-y-4 sm:space-y-5">
      <UserHeroCard />
      <NextEventCard />
      <PendingPollsCard />
      <GameCatalogueCard />
      <KingdomTimelineCard />
    </div>
  )
}
