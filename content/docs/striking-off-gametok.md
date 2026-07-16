---
title: "Striking Off GameTok"
ref: "041"
date: 2026-06-28
kind: essay
standfirst: "Seventeen days ago I filed the form that dissolves the company behind GameTok. This is the post-mortem, written while it still stings, because waiting would sand off the useful edges."
---

A project you will not ship is not an asset. It is a liability wearing an asset's clothes, and it compounds. I kept GameTok on the books for months after I knew.

That is the whole finding. Everything below is the supporting evidence, laid out in the order it arrived, which is not the order in which I was willing to look at it.

## What it was

GameTok was a TikTok-style swipe arcade for iOS. A vertical feed, but instead of videos, games: each cell in the feed was a complete micro-game that loaded in under a second and was playable the instant it appeared. You swiped up when you got bored, and the feed had already loaded the next one. Thirty-second games, no menus, no tutorials, scores and streaks to make the swiping feel like it was going somewhere.

The pitch fit in one sentence, and everyone I told it to nodded. I logged the nodding at the time as validation. I now know that a nod is not a signal. People nod at coherent sentences. Coherence is not demand, and a sentence that is easy to say is not the same thing as a product that is hard to leave.

## The build

I incorporated a company for it in January, on the theory that a real app needs a real company. The build ran January to April and it went well, which I want to flag as the first warning sign, because building is the part I already know how to do, and a project that spends its first three months exclusively in my comfort zone is a project that has not yet been asked a hard question.

The hard technical problem was genuinely hard and genuinely solved: making a game load like a video. Native feeds assume their content is inert. Games are not inert; they have physics, state, sound, and opinions about the main thread. I built a small framework where each micro-game compiled to a sandboxed module the feed could hydrate and dispose of like a cell, and by March a working v1 ran on device with ten games, sub-second handoff between them, no dropped frames. It remains some of the best engineering I have done. This is worth exactly as much as the rest of this document says it is worth.

April 11th, GameTok 1.0 went live on the App Store, approved on the first pass. The log entry from that day ends "now the feed waits for thumbs," which reads jauntier than I remember feeling.

## The numbers

A post-mortem without numbers is a eulogy, so: about 2,300 downloads in the first eight weeks, most of them from one gameplay clip that did briefly well on the platform GameTok was imitating, which is an irony I noticed at the time and chose not to examine. First sessions were long — eleven minutes on average, which for a novelty app is a genuinely good number. Day-two retention was 47 percent. Day-seven retention was 1.6 percent.

Read those last two numbers together, because together they are the entire autopsy. Half the people who tried GameTok came back the next day. Almost nobody came back the next week. That is not the curve of a bad product. A bad product loses people at the door. This is the curve of a firework: a real bang, genuine delight, and nothing left to come back to, because the delight was novelty and I had shipped a finite supply of it.

By the end, the weekly active count was three, and two of those were my own test devices.

## The treadmill

Here is the structural problem, which I could have found on a whiteboard in January for a cost of zero dollars and instead found in production in May for a cost of a company.

A feed is a promise of endless novelty. TikTok can make that promise because TikTok does not make videos; a hundred million people make the videos, and the feed just sorts them. GameTok's feed had one supplier, and he also did the accounting. Ten micro-games is roughly forty minutes of novelty. My best month, I built three more. A dedicated user consumed the entire catalogue on the first evening and then, reasonably, asked the feed for what feeds are for — more — and the feed had nothing.

I had built the distribution mechanics of an infinite platform on top of the content economics of a boutique. Every fix I shipped after launch — onboarding redesigns, streak notifications, score-chasing hooks — was an attempt to make forty minutes of content behave like an infinite supply. The retention chart absorbed each one without comment. Charts are honest like that.

## When I knew, and when I acted

The week-three numbers arrived on May 6th. That is the official date. Unofficially, I knew in March, when I watched the two friends I had given the beta to play it exactly the way the data would later describe: a delighted evening, a polite silence. I remember explaining to one of them that retention would come from the streak system. He nodded. I logged the nod.

Between knowing and acting I spent about ten weeks, and this is the part of the post-mortem that is actually about me rather than about feeds. The sunk months sat on the scale and I kept weighing them as an asset. The framework was an asset, surely. The App Store approval was an asset. The 2,300 downloads were an asset. In fact every one of those things had already become a reason to keep spending, which is what a liability is. The framework demanded more games. The listing demanded updates. The downloads demanded a comeback plan. An asset pays you to hold it; this thing charged rent.

> The strike-off form has no field for how hard you tried. It asks whether the company has assets, whether it has debts, and whether anyone objects. Effort is not an asset.

The decision came on June 7th, and I want to record that it was made with cause, not with mood. I wrote the causes down before deciding, in one sitting: the content treadmill is structural and I am one person; the retention curve had survived three redesigns unchanged; the users had answered fourteen differently-worded versions of the same question with the same silence; and the only fix I believed in — becoming a platform where other people make the games — is a different, larger company that I had already implicitly declined to build. Any one of those might have been survivable. All four together were a verdict.

## The wind-down

Killing it turned out to be a shipping act, and I ran it like one, with a scope and a deadline. Users notified. Their data deleted, verifiably. The app delisted. Subscriptions and accounts closed in dependency order — analytics, transactional email, the domain left to lapse. On June 11th, the strike-off application. The form took eleven minutes, most of which I spent looking for the registration number, which I had written down somewhere safe in the way that guarantees a thing is never found again. There is a modest fee and a waiting period in case anyone objects. Nobody will object. That is the whole story of GameTok restated one final time in legal form: nobody objected, because nobody noticed.

Two things about the ending taught me more than the launch did.

First, a company is a list of obligations, not a list of features. On launch day I thought of GameTok as a codebase with an icon. The wind-down forced the true inventory: the developer account, the analytics plan, the email service, the domain, the data I held about 2,300 people and my duty to delete it properly. The product was maybe a third of the company by mass. You learn what a company is made of by taking one apart, the same way you learn what a piano is made of, and with a similar feeling of it being too late to matter.

Second, the shutdown email is the only honest survey you will ever send. I wrote to the remaining users to say the app was closing and their data would be erased. This is the one message in an app's life with a guaranteed open rate among people who care. I received two replies. One was kind. One was an out-of-office. There is a version of this story where the shutdown email triggers a wave of protest and you discover, too late, that you had something. I mention that version because it is the one founders privately expect, and its absence is informative. The silence is not an insult. It is the metric.

## What I would tell January

Not "don't build it." January me would not have listened, and the build was the cheapest tuition on this list. I would tell him two things.

Name one specific person who will open this on day eight. Not a demographic, a person, with a name, whose Tuesday you can describe. I could not have done it. I do not play games in feeds; I play long games, deliberately, the way I read. I built a discovery-and-dopamine machine for a species of person I had read about but never met, and I mistook the coherence of the pitch for the existence of the customer.

And: decide in advance what number kills it, and write the number down where the number can see you. My kill criterion was decided in June for data that arrived in May describing a truth available in March. The ten weeks in between were not spent gathering information. They were spent negotiating with it. A number agreed with yourself in January cannot be negotiated with, which is its entire value.

## The line in the register

The register now lists the company as being struck off. In a few weeks it will be one line in a public database, next to thousands of other one-line endings, which I find neither sad nor encouraging, just accurate. The framework is archived with a README that tells the truth. The log keeps its GameTok entries, because the log counts what happened, not what I wish had.

It stings. I am writing while it stings on purpose, because the sting is data too, and it decays fast. Give it a month and this document would have become wise and forgiving and useless. The liability is off the books now. The books, for the first time in months, are clean, and clean books are the one asset GameTok actually shipped.
