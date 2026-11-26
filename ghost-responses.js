// Original, hand-written dialogue. Eight quiet, eight uneasy, eight deep lines per category.
// No visitor text is evaluated as code. Only explicit name introductions are retained.
export const QUESTION_LIMIT = 20;
export const GHOST = Object.freeze({ name: 'Ember', backstory: 'An archivist lost in the flooded archive in 1889.' });
const lines = {
identity: `I am {ghost}, keeper of the unfinished page.
Call me {ghost}. The ink remembers.
{ghost} is the name left in the ledger.
I am {ghost}, a whisper made for this tale.
{ghost}. Once an archivist, now an echo.
I answer to {ghost}, even here.
The archive called me {ghost}.
{ghost} kept the books after sunset.
I am {ghost}. My chair is still pulled out.
{ghost} speaks where the shelves have fallen.
I remain {ghost}, though the ink has faded.
You have found {ghost} between the pages.
{ghost} is all the water left of my name.
I am {ghost}. The ledger opens by itself.
{ghost} still counts the missing volumes.
My name is {ghost}. Listen between the letters.
{ghost} is speaking. The other ink is not mine.
I am {ghost}. Another hand turns the page.
The name is still {ghost}. The handwriting is not.
{ghost} remains where the last shelf sank.
I am {ghost}, beneath the unnumbered page.
{ghost} answers. Something else corrects the ink.
You asked for {ghost}. The ledger answered first.
{ghost}. The name survives its final reader.`,
backstory: `I tended the archive before the flood.
The archive flooded in 1889.
I was an archivist in the year of the flood.
Water took the archive and its keeper.
My last task was to close a ledger.
The flood found me among the shelves.
In 1889, the archive lost its voice.
I stayed with the books as the water rose.
The lowest shelves vanished first.
I stacked the ledgers above the waterline.
The archive stairs disappeared beneath the flood.
My desk floated before I could leave it.
Wet pages clung to my hands.
The archive door swelled shut in the flood.
I heard the shelves fall one by one.
The last dry page bore the year 1889.
The flood ended. The dripping did not.
I still hear a book closing underwater.
The archive has no dry floor in my memory.
Each night I reach the same submerged stair.
The ledger opens at the depth where I fell.
The water returned every book but one.
In the flooded archive, a page is still turning.
My final entry keeps writing itself.`,
death: `In this tale, death leaves a quiet room.
The end is a page we cannot read ahead.
I cannot tell you when a life will end.
The board cannot speak for the departed.
An empty chair can hold a thousand memories.
Grief deserves gentler company than a board.
No letters here can prove an afterlife.
The story pauses where the candle ends.
A closed book still carries its reader's warmth.
The archive kept more endings than beginnings.
Some farewells never found their envelopes.
The final line was left without a period.
In my story, silence outlived the bell.
A faded ribbon marks the unfinished chapter.
The water blurred every date but mine.
The last page smelled of rain.
The obituary in this tale has a blank margin.
Someone keeps adding a page after the ending.
The archive's funeral bell has no clapper.
The final chapter knocks against its cover.
A black ribbon moves in the sealed volume.
The ending has acquired a second handwriting.
An unwritten epitaph stains the paper.
The last sentence refuses to lie still.`,
fear: `You may close the circle whenever you wish.
This is a story. You are free to pause it.
A little light can make a shadow smaller.
There is no courage owed to this board.
Take a breath. The candle is only a candle.
You control how long this tale continues.
Fear makes a narrow doorway of a thought.
Leave the mystery here if it feels too heavy.
In the story, the empty chair has turned.
The imagined hallway is longer in the dark.
A paper shadow crosses the archive floor.
The fictional latch lifts without a hand.
The tale has learned where its silence belongs.
Something in the story stops when the bell rings.
The archive's shadow has lost its shelf.
The dark between these words seems wider.
In our tale, the reflection closes its eyes.
The fictional stair creaks after the footstep.
A shadow in the story waits for its owner.
The imagined door now has two keyholes.
The archive's echo arrives before the sound.
In the tale, every chair faces the wall.
The fictional window reflects an extra candle.
The story's silence has begun to answer.`,
future: `The future is unwritten, even on this board.
I can offer a story, not a prediction.
Tomorrow belongs to choices still unmade.
No carved letter can promise what comes next.
Leave a little room for an unexpected dawn.
The next page is yours to turn.
A crossroads is not a verdict.
The candle cannot read tomorrow's weather.
In our tale, tomorrow's envelope is empty.
A blank calendar hangs in the archive.
The next chapter has a torn corner.
The clock in this story points between hours.
A sealed letter waits without a date.
The archive keeps a shelf for unchosen roads.
Tomorrow's ink has not dried in this fiction.
The page ahead rustles, but says nothing certain.
The fictional calendar has one extra night.
An unwritten date presses through the page.
In this tale, tomorrow remembers yesterday wrong.
The archive clock has grown a third hand.
The next chapter bears yesterday's stain.
A future page is folded around an old key.
The fictional midnight has forgotten to end.
The blank page ahead has a wet thumbprint.`,
love: `Love is better asked of the living.
No board can decide another person's heart.
An honest word is worth more than an omen.
Keep tenderness outside the reach of riddles.
The heart is not a lock I can open.
A quiet kindness can outlast a grand promise.
Ask them gently. Let their answer be their own.
I know stories of love, not secret feelings.
A pressed flower waits in the archive ledger.
Two letters share a ribbon, but no address.
A love note survived where its envelope did not.
The archive kept a kiss as a blot of ink.
A promise faded more slowly than its signature.
Someone underlined the word return.
An unopened letter has worn through its ribbon.
The tale remembers two cups and one cold chair.
The fictional love letter answers in another ink.
A pressed rose leaves the shape of a key.
The ribbon ties itself around the empty page.
In the tale, a signature moves closer to another.
The sealed love note is warm in the cold archive.
The last word of the letter appears twice.
An old promise is scratching beneath its seal.
The archive's love letters all face the door.`,
family: `I cannot contact or identify your relatives.
Family memories belong to those who lived them.
Ask the living about the stories they remember.
The board has no window into your home.
A family story can hold many different truths.
Keep names private if you would rather not share.
An old photograph can invite a gentle question.
No spirit here can replace someone you miss.
In this tale, a portrait has an empty frame.
The archive holds a family tree without roots.
An unnamed child drew a door in the margin.
A fictional portrait faces the bookshelf.
The household ledger lists an unused room.
A cradle in an old drawing has no shadow.
The tale keeps a spare place at its table.
A family album in the archive begins midway.
In the story, every portrait looks at one chair.
The fictional family tree has a branch of ink.
An empty frame leaves a face-shaped mark.
The archive album closes at the same photograph.
The drawn door is open on the next page.
A nameless portrait casts two paper shadows.
The fictional dinner bell rings for an empty room.
An unknown hand has added a place to the table.`,
secrets: `I know no secrets you have not chosen to tell.
Keep what is private outside this circle.
A secret need not become a confession.
The archive teaches the value of a closed drawer.
Some envelopes deserve to stay sealed.
You need not offer personal details to play.
The board cannot read an unspoken thought.
A mystery may remain a mystery tonight.
A locked drawer rattles in this tale.
The archive has a key with no matching door.
One shelf is missing from the catalogue.
An erased word has left a deeper mark.
The ledger lists a room behind the shelves.
A black envelope has no opening.
The margin hides a smaller margin.
One page is numbered with a question mark.
The secret drawer is larger on the inside.
The missing shelf appears in the mirror of ink.
A sealed page begins to bleed through its cover.
The catalogue lists the reader as a volume.
A keyhole appears in the uncut paper.
The locked ledger opens to a locked door.
An erased word has started erasing its neighbors.
The blank margin is keeping count.`,
names: `My name is {ghost}.
{ghost} is the name I kept.
You may call this fictional ghost {ghost}.
The ledger records me as {ghost}.
My old signature reads {ghost}.
{ghost}, the archive keeper.
I have answered to {ghost} throughout this tale.
The name on my desk was {ghost}.
{ghost} is written beneath the water stain.
The fading letters still spell {ghost}.
I sign the empty ledger as {ghost}.
{ghost} is carved inside the archive drawer.
The ink around {ghost} never quite dries.
My name, {ghost}, survived the flood of 1889.
The shelf label whispers {ghost}.
Only {ghost} remains legible on the last page.
{ghost} appears twice where I signed once.
The signature says {ghost}; the shadow disagrees.
{ghost} is written on both sides of the closed page.
Someone under the ink is tracing {ghost}.
The blank ledger has learned to spell {ghost}.
My name is {ghost}. A second pen follows it.
Every erased signature returns as {ghost}.
{ghost} is the name the locked book repeats.`,
yesno: `Perhaps. This is an omen from a story.
The fictional answer leans toward yes.
The board offers a doubtful no.
Not yet, says the imaginary candle.
The tale gives no certain answer.
A quiet yes, within our little fiction.
A gentle no. Leave room for another path.
Uncertain. The letters have not settled.
Yes in the story, but the ink hesitates.
No, whispers the margin of the ledger.
Perhaps; the archive keeps two answers.
The fictional needle rests between yes and no.
A yes is crossed out in the old catalogue.
A no waits beneath the water stain.
The story answers twice, and disagrees.
Not tonight, says the unwritten page.
Yes; in the tale, the second candle bends.
No; the fictional key turns the other way.
Perhaps. Another answer scratches underneath.
The archive's yes has acquired a shadow.
A no appears before the question is finished.
The story writes yes with the wrong hand.
Both answers are locked in the same drawer.
The imagined board refuses to choose a side.`,
warnings: `You can leave this fictional circle at any time.
No ritual is required to end this game.
Do not mistake a story for a real warning.
Let the candle be atmosphere, not instruction.
Keep your choices in your own hands.
The safest ending is always yours to choose.
No omen here has authority over your life.
Pause whenever the mystery stops being fun.
In the tale, the catalogue warns of a missing stair.
A note in the archive says leave the last page blank.
The fictional door has a warning on both sides.
An old label reads do not mend this tear.
The story's clock skips the hour marked in red.
A paper warning has been folded into a key.
The archive sign points away from an empty shelf.
The fictional bell is wrapped in black thread.
The warning in the tale is written from inside.
A second caution appears beneath the first seal.
The archive's exit sign points into the ledger.
In the story, a warning is scratched backward.
The red-ink notice has changed its last word.
The fictional stair is missing from its own drawing.
A warning appears on the underside of the ink.
The archive's last notice is addressed to no one.`,
unknown: `Ask me of the archive, or of its keeper.
That question has no shelf in my catalogue.
Could you ask it another way?
The letters wait for a clearer question.
I have only a small lantern for that mystery.
That lies beyond this fictional archive.
Try a name, a memory, or a question about the tale.
The board has not found the right page.
Your question settles in an unmarked drawer.
The catalogue returns a page without a title.
An answer is missing from the index.
The archive has filed that thought under silence.
The paper rustles where an answer should be.
A smudge stands in for the missing word.
The ledger points to a shelf that is not there.
Your question turns a key without a lock.
The index points back to the hand reading it.
An answer is forming on the wrong side of the page.
The empty shelf has begun to creak.
The ledger opens to a drawing of another ledger.
A word appears beneath the paper, out of reach.
The catalogue returns its own missing entry.
The answer has left a damp outline.
A closed book is trying to remember the question.`,
endings: `Goodbye. You may close the circle freely.
The story can rest here.
Leave the candle and take your evening back.
No spirit keeps you at this board.
The archive closes gently tonight.
Farewell, reader of the unfinished page.
You owe the mystery no final word.
The door out of this story is always open.
Goodbye. The ledger folds its last corner.
The final whisper settles between the covers.
An empty chair slides beneath the fictional desk.
The archive returns its borrowed silence.
The last letter sinks into the wood.
The candle leaves a small gold circle.
The tale closes with a key upon the table.
Goodbye. The ribbon falls across the page.
The final page closes before its shadow.
Goodbye. One unwritten line remains behind.
The archive shuts; a paper echo lingers.
The tale ends with a door drawn shut.
The last candle bows to an empty shelf.
Goodbye. The ink takes a moment longer to stop.
The final bell leaves its shape in the silence.
The ledger closes on the word goodbye.`,
greeting: `Welcome to the archive after dark.
Hello, traveler between the letters.
The candle has room for another story.
I am listening within this little fiction.
Welcome. The ledger is open.
A quiet hello from the other side of the page.
You have found the archive's evening door.
Come with a question, leave with a tale.
Hello again. The page has kept its place.
The archive heard the turn of the handle.
Your greeting stirs the dust of the catalogue.
A spare chair waits in the story.
The candle leans toward your hello.
The bell over the fictional door moves once.
Welcome back to the unnumbered shelf.
The ledger pauses to receive your greeting.
Hello. The echo arrived a moment before you.
The archive returns your greeting in another ink.
Welcome. The fictional chair has already turned.
Your hello is underlined on the closed page.
The story opens where the bookmark vanished.
Hello from the shelf that was not here before.
A second greeting rises through the floor of ink.
The archive welcomes you with an unsigned page.`,
visitor_name: `I know you here as {visitor}.
{visitor} is the name you have offered this tale.
For this séance, you are {visitor}.
The conversation remembers {visitor}.
I will call you {visitor} within this story.
Your place in the ledger reads {visitor}.
{visitor}; no other name is needed here.
I keep only {visitor}, not the life beyond it.
The margin holds the name {visitor}.
{visitor} rests beside the candle in our tale.
The archive has marked a place for {visitor}.
A ribbon lies beneath {visitor} in the ledger.
{visitor} is written in the dry part of the page.
The ink has not forgotten {visitor}.
Your offered name, {visitor}, stays in this circle.
The catalogue returns the name {visitor}.
{visitor} appears beneath a second layer of ink.
The fictional ledger underlines {visitor} twice.
A paper echo repeats {visitor}.
The page turns, but {visitor} stays in the margin.
In this tale, {visitor} casts an ink-shaped shadow.
The closed ledger still holds {visitor}.
{visitor} remains legible beneath the darkening line.
A bookmark points to {visitor} without touching it.`,
memory: `Your last question was: {previous}
You last asked: {previous}
The previous page reads: {previous}
I recall this question: {previous}
Your earlier words were: {previous}
The last entry says: {previous}
We had just considered: {previous}
The conversation kept: {previous}
Under the bookmark: {previous}
The margin repeats: {previous}
The ink remembers: {previous}
A folded corner marks: {previous}
The ledger echoes: {previous}
The previous whisper was: {previous}
The archive saved this line: {previous}
Beneath the ribbon: {previous}
The closed page still reads: {previous}
Another hand underlines: {previous}
The ink-shadow repeats: {previous}
The damp imprint says: {previous}
A backward page recalls: {previous}
The locked volume echoes: {previous}
Under the vanished word: {previous}
The final margin remembers: {previous}`
};

export const RESPONSES = Object.freeze(Object.entries(lines).flatMap(([category, text]) =>
  text.split('\n').map((text, index) => Object.freeze({ id: `${category}-${index + 1}`, category, stage: Math.floor(index / 8), text }))
));
export const RARE_RESPONSES = Object.freeze([
  { id: 'rare-1', text: 'The fictional candle casts a second flame.', effect: 'double-shadow' },
  { id: 'rare-2', text: 'A frost-white word appears beneath the varnish.', effect: 'cold-mist' },
  { id: 'rare-3', text: 'The archive shadow turns a page of its own.', effect: 'double-shadow' },
  { id: 'rare-4', text: 'The paper fog has swallowed one imagined stair.', effect: 'cold-mist' },
  { id: 'rare-5', text: 'The candle in the story forgets its reflection.', effect: 'candle-dim' },
  { id: 'rare-6', text: 'A dark ring closes around the fictional flame.', effect: 'candle-dim' }
]);

export function createGhostContext() {
  return { ghost: { ...GHOST }, visitorName: null, usedIds: [], usedReplies: [], rareCount: 0, lastRareTurn: -10 };
}
export function explicitName(question) {
  // One volunteered display name only. No inferred identity, surname, or profile.
  const match = question.match(/\b(?:my name is|call me)\s+([a-z][a-z'-]{0,23})(?=$|[\s,.!?])/i);
  return match ? match[1] : null;
}
export function classifyQuestion(question) {
  const q = question.toLowerCase().replace(/[’]/g, "'");
  if (explicitName(q) || /\b(?:my name|who am i)\b/.test(q)) return 'visitor_name';
  if (/\b(?:what did i (?:ask|say)|previous question|last question|remember (?:what|my question)|earlier question)\b/.test(q)) return 'memory';
  if (/\b(?:your name|what are you called|who is ember)\b/.test(q)) return 'names';
  if (/\b(?:how did you (?:die|drown)|your (?:past|story|backstory)|1889|archive|archivist|flood)\b/.test(q)) return 'backstory';
  if (/\b(?:goodbye|bye|end (?:the|this) s[eé]ance|can i leave|let me leave|stop playing)\b/.test(q)) return 'endings';
  if (/\b(?:scared|afraid|fear|frightened|terrified|panic|anxious)\b/.test(q)) return 'fear';
  if (/\b(?:mother|father|sister|brother|family|relative|grandma|grandpa|mum|mom|dad|child|parents)\b/.test(q)) return 'family';
  if (/\b(?:love|heart|marry|marriage|romance|crush|partner|boyfriend|girlfriend)\b/.test(q)) return 'love';
  if (/\b(?:death|dead|die|dying|afterlife|grave|departed|grief)\b/.test(q)) return 'death';
  if (/\b(?:future|tomorrow|predict|destiny|fate|will i|will we|next year)\b/.test(q)) return 'future';
  if (/\b(?:secret|hide|hidden|hiding|confess|read my mind)\b/.test(q)) return 'secrets';
  if (/\b(?:warning|warn|danger|safe|curse|cursed|harm)\b/.test(q)) return 'warnings';
  if (/\b(?:who are you|what are you|are you (?:real|a ghost|evil)|anyone there|are you there|spirit|ghost)\b/.test(q)) return 'identity';
  if (/\b(?:hello|hi|hey|greetings)\b/.test(q)) return 'greeting';
  if (/^(?:is|are|am|was|were|do|does|did|can|could|would|should|will|has|have)\b/.test(q.trim())) return 'yesno';
  return 'unknown';
}
const unnamed = [
  'You have not offered a name to this circle.', 'Your name is still yours to keep.',
  'I cannot know a name you have not shared.', 'The name field in our ledger is blank.',
  'No visitor name has been written here.', 'You remain an unnamed visitor in this tale.',
  'Offer a first name only if you wish.', 'The board does not guess your identity.',
  'The margin waits for a name you choose.', 'No name lies beneath your bookmark.',
  'Your place in the archive is unsigned.', 'The candle illuminates an empty nameplate.',
  'The catalogue has no visitor name yet.', 'An unsigned entry waits beside the ink.',
  'The story knows your questions, not your name.', 'The ribbon marks a nameless entry.',
  'The darkened margin still holds no name.', 'An empty signature flickers in the tale.',
  'The locked ledger cannot invent your name.', 'No name appears in the ink-shadow.',
  'The page turns around an unsigned space.', 'Your name has not entered this fiction.',
  'The archive leaves your identity unwritten.', 'The last blank nameplate remains blank.'
];
const render = (text, context, previous) => text.replaceAll('{ghost}', context.ghost.name)
  .replaceAll('{visitor}', context.visitorName || 'an unnamed visitor')
  .replaceAll('{previous}', previous ? previous.slice(0, 44) : 'This is our first question.');

export function scriptedReply(question, context, history = [], turn = 1, random = Math.random) {
  const name = explicitName(question);
  if (name) context.visitorName = name;
  const intent = classifyQuestion(question);
  const stage = turn <= 6 ? 0 : turn <= 13 ? 1 : 2;
  const previous = history.filter(message => message.role === 'user').at(-1)?.content;
  const usedIds = new Set(context.usedIds);
  const usedReplies = new Set(context.usedReplies);
  let pool = RESPONSES.filter(item => item.category === intent && !usedIds.has(item.id));
  // Name questions without an introduction must never invent personal knowledge.
  const format = item => intent === 'visitor_name' && !context.visitorName
    ? unnamed[Number(item.id.split('-').at(-1)) - 1]
    : intent === 'memory' && !previous ? 'No earlier question yet. Ask me about the archive.' : render(item.text, context, previous);
  pool = pool.filter(item => !usedReplies.has(format(item)));
  const preferred = pool.filter(item => item.stage === stage);
  let candidates = preferred.length ? preferred : pool;
  // Rare lines only interrupt open-ended mysteries, never factual lore or personal questions.
  const rare = turn >= 8 && turn < QUESTION_LIMIT && ['unknown', 'secrets'].includes(intent)
    && context.rareCount < 2 && turn - context.lastRareTurn >= 5 && random() < .06;
  if (rare) {
    candidates = RARE_RESPONSES.filter(item => !usedIds.has(item.id) && !usedReplies.has(item.text));
  }
  if (!candidates.length) throw new Error('Dialogue exhausted for this séance');
  const chosen = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
  const reply = rare ? chosen.text : format(chosen);
  context.usedIds.push(chosen.id);
  context.usedReplies.push(reply);
  if (rare) { context.rareCount++; context.lastRareTurn = turn; }
  return { reply, source: 'scripted', intent, stage, effect: rare ? chosen.effect : null };
}
