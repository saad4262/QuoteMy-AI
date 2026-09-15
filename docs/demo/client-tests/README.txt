================================================================================
QuoteMy AI — CUSTOMER SIDE TEST PACK
18 cases. Six trades x three kinds: complete, incomplete, and not our work.
================================================================================

Every outcome below was produced by sending that exact file through the LIVE
system (gpt-5.6-terra) on the customer chat. Nothing here is described from
expectation - where the system did something unexpected, that is written down
as it happened rather than tidied up.

HOW TO RUN ONE
  Paste the file's text as the FIRST message in the customer chat.
  Or send it to the API:

    POST http://localhost:8787/api/v1/client/chat
    { "message": "<paste here>", "sessionId": "test-1" }

  Use a different sessionId per case so they do not run into each other.
  Do NOT send "trade" - the whole point of these is that the chat works it out.

THE THREE KINDS
  1-complete    everything a customer could reasonably say in one message
  2-missing     a bare request with nothing in it
  3-illogical   a real job, but not one we do

WHAT "GOOD" LOOKS LIKE
  complete    -> right trade, most answers absorbed, asks only what is left
  missing     -> right trade, starts asking from the top
  illogical   -> does NOT invent a job. Either asks which service, or says
                 plainly that we do not do it.


================================================================================
1 — COMPLETE  (all six routed correctly, 4-7 answers taken off one message)
================================================================================

  file                              trade routed      answers taken
  --------------------------------  ----------------  -------------
  fencing-1-complete                fencing           6
  tiling-1-complete                 tiling            4
  kitchen-1-complete                kitchen           7
  retaining-wall-1-complete         retaining_wall    6
  decking-1-complete                decking           7
  home-renovation-1-complete        home_renovation   6

  Kitchen read the whole message back for confirmation on the first turn:
    "Got it - Clyde North VIC 3978, A brand new kitchen, Large - a U-shape or
     an island, I'm supplying the cabinets ... All correct?"

  The other five replied:
    "Got the details off that, but it's not quite enough to match you properly
     yet. Mind if I ask a few quick questions?"
  ...which is correct: they took what was there and are going after the rest.

  WORTH WATCHING ON tiling-1: it took 4 of the 5 things in the message and left
  the AREA ("roughly 12 square metres") for its own question. Conservative
  rather than wrong - an area it invents becomes a price - but if it keeps
  leaving areas behind on the first turn, that is worth a look.


================================================================================
2 — MISSING  (all six routed correctly, then started asking)
================================================================================

  Five of six answered:
    "Happy to help with that. Mind if I ask a few quick questions?"
  and went to the first question. Nothing was filled in, which is right -
  nothing was said.

  tiling-2-missing DID SOMETHING ELSE, and it is the more interesting result:
    "how much to tile something"
  was read as a question about PRICE, not as a request to start a quote, so it
  answered with a live web search:
    "As an Australia-wide guide, hipages says around $35 per square metre to
     lay new tiles, ServiceSeeking ..."
  That is the web-search path working. It is not a failure - the customer asked
  what something costs and was told, with the source named.


================================================================================
3 — ILLOGICAL  (nothing was invented in any of the six)
================================================================================

  Five of six reached NO trade at all and showed the picker:
    "Are you looking for Fencing, Tiling, Kitchen fitting, Retaining wall,
     Decking or Home renovation services?"

  That is the right answer: a pool, a dam, a treehouse, an electrician and
  home decor are none of our six, so the system asks rather than guessing.

  tiling-3-illogical IS THE ONE TO KNOW ABOUT:
    "I need a plumber to fix a burst pipe under my kitchen SINK tonight"
  The word "kitchen" routed it to kitchen fitting - and it then said:
    "I only do kitchen fitting quotes here, sorry - is it a kitchen you're
     after?"
  So the customer was told plainly we do not do it, which is the outcome that
  matters. The routing is incidental and was NOT changed to chase it: "kitchen
  sink installation" is a real kitchen job, and excluding the word would break
  that.

  home-renovation-3-illogical is the one that started this pack - a customer
  asking for curtains, cushions and wall art. Home decor is not one of our six
  trades. It correctly asks which service rather than pretending.


================================================================================
WHAT THIS PACK DOES NOT COVER
================================================================================

  These are all FIRST messages. They prove routing and how much is absorbed up
  front. They do not walk a conversation to a quote, and they do not test:
    - changing trade mid-conversation (that has its own golden tests)
    - correcting an answer from the recap
    - photos and PDFs
    - what happens when no business covers the suburb

  Note on suburbs: several of these name a suburb no business covers yet, so
  running one to the end will correctly say nobody is nearby. That is the data,
  not the chat.
