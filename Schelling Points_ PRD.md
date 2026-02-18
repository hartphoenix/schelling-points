# Schelling Points: PRD

Team members

* Hart: System Integrator  
* Marianne: Fullstack development, PM  
* Julianna: UX, Designer  
* Ulysse: Lead developer

# Overview

A Jackbox TV-like mobile word game. Given a category of items (e.g. cities, animals, types of vehicles), all players privately come up with an item in the category that they think the other players will come up with. When all players have entered the item into their phone, they see everyone else’s items and get a score.

# MVP

* Category display  
* Answer input  
* Multiplayer (2+ players in same game)  
* Semantic cluster scoring (scoring rule TBD once embedding model outputs are known)  
* Results screen with scores

# Stretch goals

* Multiple rounds per game & scores accumulate for final stats view  
* Animations for results reveal & scene transitions  
* Player avatars & names  
* A separate UI for a projector that everyone can see  
* Multiple scoring modes  
  * unique mind-meld (the player group co-located far from the mean)  
  * closest to the dataset  
  * closest unique answer (players are penalized when answering similarly to each other, rewarded for similarity to the dataset)  
  * collect trophies for various game achievements (furthest from the group, closest to the center, etc)  
* Visualizing and clustering each player’s item in a 2D/3D point map, coming up with names for each cluster  
* Comparing where your item/guess fits compared with players who have played the game with this category before  
* Category voting (does this mean players vote on categories they liked?)  
* Player-submitted category mode – each player submits a category  
  * the category-maker could get points for closely clustered responses  
* Spectator mode?  
* Sound effects

# Player Experience Goals

* An anticipatory sense of surprise while coming up with items.  
* When it’s revealed, laughing and feelings of playful betrayal or kinship.  
* Thought-provoking interactions that seed new conversations  
* Sense of accomplishment when they see how their ideas are similar/different from former players (stretch)

# User Experience

* Seamless session joining  
  * generate human-id → react router makes it the URL → QR code generated → displayed on game-creator’s screen along with ‘copy URL to clipboard’ button  
* Screen tells you everything you need to know to play – a category prompt and text input field  
* (Stretch goal) results screen shows visual map of users’ answers in semantic space  
* (Stretch goal) stats used to award fun trophies (quickest responses, closest to mean, furthest from mean, ‘standard deviant’ award for being \~1 sd from center, etc)  
* (Stretch goal) different scoring modes lead to different gameplay incentives – trying to give unique in-bounds answers vs trying to predict common answers vs trying to pick out what unique things this group has in common

# Tech Stack

* Mobile-first web app written in Typescript React  
* Express backend  
* Websockets as communication layer  
* ollama (or similar) internal service that runs the sentence model (e.g. nomic-embed-text) to generate embeddings

# Target Audience & User Stories

* Who is the primary player we are designing for?  
  1. casual social gamer who wants a party game with minimal overhead and lots of interaction

  * Why would they want to play this game (their motivations)?  
    1. in-person group play (recreation, icebreaking, team building)

  * List 3–5 user stories using: “As a \[type of user\], I want \[goal\] so that \[value\].”  
    1. As a person in the Fractal AI Accelerator, I want to get to know my peers more so that I can become closer to them.   
    2. As a person who is working hard everyday, I want to laugh and play with friends so that I can relax and re-energize.   
    3. As a person who loves learning about meta-cognitive thinking, I want to play games that involve the semantic networking process so that I can learn about the way my friends think and understand the world. 

---

4. Game Vision: Look & Feel

   * In a few sentences, how should the game look, feel, and “vibe”?  
     1. not overwhelming to use, semantic abstract space, rewards curiosity  
     2. each screen or dialog has minimal noise, user can guess how to use it  
     3. low friction when joining & playing rounds  
   * What 2–3 references (games, movies, art) best capture the vision, and what are we taking from them?  
     1. wavelength: screen displays all serve to enhance in-person interaction – cheerful graphics and vibrant colors, low noise & high signal  
   * Add any key imagery (concept art, quick sketches, or mocks) that helps convey the vision.  
     1. [Miro Board/Mood Board](https://miro.com/app/board/uXjVG_doObU=/)  
     2. [Jackbox.TV](http://Jackbox.TV)  games, Wavelength mobile app  
     3. Ulysse fuzzy studio app (color palette/vibe)  
     4. The Rorschach test  
     5. Semantic Network maps 2d/3d  
     6. nomic-embed text visualization

---

5. Core Gameplay & Mechanics

   * What is the core gameplay loop players repeat?  
     1. lobby/join → see category → type response → wait for all → reveal responses → show schelling point(s) \+ scores → (next round for stretch)

   * What are the main mechanics and rules (movement, interactions, win/lose conditions)?  
     1. session creation: create a new game & get a game ID (random two-word phrase?human-id) or shareable link with copy-to-clipboard button & QR code  
     2. session await: shows instructions and ‘ready’ button  
     3. in-session view: displays a category & input field  
     4. input field and submit button – once submitted, no edits  
     5. players have a countdown timer. if time runs out on empty input field, they score 0  
        1. nice-to-have: animation that gets more urgent as time runs out  
     6. user-response pairs displayed (stretch goal: mapped as cluster), scores revealed, players indicate when ready for next round  
     7. after N rounds, total scores tallied & overall stats displayed (MVP scoring mode is single-round)

   * What kinds of entities or items exist, and how does the player interact with them?  
     1. stretch goal: trophies awarded for stats

---

6. UX & Interface (High‑Level)

   * How does a new player learn the game (onboarding approach)?  
     1. once a player joins a new game, they see an instruction screen & get a ‘ready’ button. when all players are ready, instructions disappear

   * What are the primary controls and the most important UI/HUD elements to show?  
     1. mobile-first: renders well in portrait mode, buttons in thumb-zone and easy to tap (except destructive buttons like ‘leave game’ – at top left)  
     2. controls: join game, ‘ready’ button, input field & submit button, leave game button (w/ confirmation dialog)  
     3. important elements  
        1. lobby screen: join game / create game  
        2. session await: instructions & ‘ready’ button  
        3. in-session: category prompt, input field, keyboard other players (evident when another player has submitted)  
        4. session results: table with user-response pairs, scores, ‘next round’ button (stretch goal: visualization of clustered player responses in semantic space)  
        5. whole game results: similar table with players & stats, ‘play again’ button allows current players to easily join a new game together (stretch goal: trophies)

---

7. Success Metrics & “Definition of Done”

   * What qualitative signals will tell us the game is working (e.g., playtester reactions)?  
     1. Players are having “aha” moments, smiling, interacting with each other and coming to understandings?   
     2. people are discussing meaning of words and understandings of the categories   
   * What must be true by the end of the week for us to call this project “done”?  
     1. A group of players can join a shared game session, are provided with a category, an input to type their response, a results page where they can see everyone’s responses together, and an element that displays the determined “schelling point” or points

---

          
8. Milestones & Plan

   * How are we splitting the week into phases, and what is the goal of each phase?

| Day | Name | Task Buckets |
| :---- | :---- | :---- |
| Tuesday | Foundation & Alignment | PRD finalized, API contract agreed, architecture decisions locked, repos                                                                       scaffolded |
| Wednesday | Core Game Loop | Category display, answer input, scoring logic, results screen, frontend ↔ backend wired,  UI |
| Thursday | Multiplayer & Clustering | UI continued, Room/lobby system, game state machine, |
| Friday | Integration & Polish | End-to-end playtesting, bug fixes, edge cases, category bank curated |
| Saturday | Deploy & Demo | Deploy to hosting, smoke test, demo script prep, ship it |

     

   * What are the 3–5 key milestones (with rough target days) to keep us on track?  
     1. Wednesday \- playthrough a round locally  
     2. Thursday \- playthrough a round on separate devices  
     3. Thursday \- semantic cluster scoring visualized? 

---

9. Tradeoffs, Risks, and Open Questions

   * What major tradeoffs or alternatives did we consider, and why did we choose this direction?  
     1. competitive play \- prioritized feeling of understanding \+ kinship?   
     2. games like codenames or wavelength \- didn’t want to copy something that exists and is already really good  
   * What are the top 3 risks (scope, technical, design), and how might we mitigate them?   
     1. deployment – embedding model & semantic scoring results need additional services or aren’t compatible with our hosting provider (solution we discussed was using Ulysse’s rented server)  
     2. session creation & game sharing suffers the wrath of the demo gods (we may need a sturdy fallback like localhost session &/ http polling)

   * What open questions remain that we can answer later without blocking development?  
     1. how will semantic mapping look & feel? how will users interact with the mapped clusters – can they zoom in, select different responses to see stat breakouts, rotate the map in 3D space, see category boundaries?  
     2. how will scoring actually work? is the group getting scored together or separately? is the objective to be as similar to the dataset as possible, or as different? or some other thing derived from the relationship between the player group and the dataset?  
        1. discussed after playing Wavelength: ideal mode of play will be whatever gets people interacting socially, curious about each other’s prompts and answers, learning about each other.  
        2. possible team scoring modes:  
           1. team vs team – score higher by clustering closer together or getting average answer closer to the prompt category  
           2. single-team cooperative: aim for close clustering (perhaps with taboo-like rules for some kind of constrained coordination)  
        3.   
     3. what does single-player mode look like in terms of scoring? maybe based on data from previous games? (is it meaningless to have single-player?)  
     4. if someone is kicked, is there a spot to input the id? for example jackbox has a 4 digit code anyone can type in? at what point can new users join an existing game \- this often happens at parties, or do you need to restart the session (we seem to have solved this with the unique game ID being the URL)