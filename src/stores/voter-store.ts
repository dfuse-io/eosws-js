import { observable } from "mobx"
import { Vote, Votes, VoteTally } from "../types/vote"

export class VoteStore {
  @observable
  votesCast: number
  @observable
  votes: Votes

  constructor() {
    this.votesCast = -1
    this.votes = []
  }

  update(voteTally: VoteTally) {
    this.votesCast = voteTally.total_activated_stake / 10000

    const producers = voteTally.producers
    let newVotes: Votes = []
    for (const vp of producers) {
      const vote = {
        producer: vp.owner,
        votePercent: (vp.total_votes / voteTally.total_votes) * 100,
        decayedVote: vp.total_votes / voteTally.decay_weight / 10000.0,
        website: vp.url
      } as Vote
      newVotes = newVotes.concat(vote)
    }

    this.votes = newVotes
  }
}
