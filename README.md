# SYNERGY

> The modern synthetic assets protocol which focus on raw materials.

The idea of the project is inspired by `Synthetix` and `FRAX` and `Overlay` protocols. Balance between over-collaterization part (which is represented by a users-shared debt pool) and algoritmic part (which is represented by a stake-insurance system) of the protocol gives the most stable and the closest peg over all existing synthetic assets protocols today.

## Our Vision

We believe that growth of synthetic assets will have positive effect on world economy and moreover save nature.

This will happen because any asset has the `real` and the `speculative` component of its price.

-   The `real` component is going from the real demand of the asset based on consuming and goods manufacturing.
-   The `speculative` component of its price is going from traders which want to buy or sell their asset in order to make profit without using the asset in fact.

The problem is that the `speculative` component increases costs of goods production, because manifacturers have to buy materials at market price.

Increase in price also motivates resource companies to mine more, to fulfill market demand and make more money.

As a result we get high prices and destroyed nature.

> Our goal is to reduce the `speculative` component by allowing traders to sell and buy synthetic assets instead of real ones. This will lower the real assets' volatility and keep its price closer to real demand.

## Contracts overview

The protocol consist of 4 main contracts

-   `Synergy` ─ The contract which performs rUSD (synthetic dollar) minting and burning for over-collateral in wETH. It also tracks global debt.

-   `Synter` ─ The contract which rules synths. Synth minting, creating, burning, swapping process is provided by this contract.

-   `Loan` ─ The contract which allows users to borrow synths for over-collateral in rUSD. This lets users short synthetic assets. When an asset changes price, its shorts will decrease global debt while longs will increase it.

-   `Insurance` ─ The contract which implements the insurance logic. Users can stake RAW (Synergy's governance token) in order to secure their debt to the protocol from increasing. Insurance coverage depends on lockup time of staked RAW. Greater luckup time provides more available compensation.

And some other contracts

-   `Oracle` ─ The contract which provides asset prices.

-   `Raw` ─ The contract of the RAW token.

-   `Synt` ─ All synthetic assets base contract.

-   `Treasury` ─ Simple contract to collect protocol fees.

-   `GoldNft` ─ Gold NFTs contract (see below).

## Gold NFT

About `50%` of gold is mined just for jewelry production. The other 50% is used for production of important goods such as micro components of life support devices, implants and etc.

It's worth nothing that medical organizations have to pay `much more` for that kind of devices than they could in a world where gold isn't used for jewelry. That is why we offer people to buy our `synthetic-gold NFTs jewelry`, keeping all the advantages of real ones.

The concept of the collection is simple:

-   User can forge NFT cards using specific amount of synthetic gold
-   At any time it can be smelted to the same amount of gold back
-   User can keep it as an investment or as an expensive gift to someone

For now, only 4 types of cards are available:

1. `Golden coin` _(eq. to 1 gold oz)_
2. `Golden nugget` _(eq. to 5 gold oz)_
3. `Golden ingot` _(eq. to 10 gold oz)_
4. and... `The Golden Cube` _(eq. to any >= 1000 gold oz.)_
