/* ===================== Story books of old tales (the sixth wish list) ===================== */
// Eight well-known nursery tales and fables, told again in simple words. Each is its own item (I.TALE + k), with its
// title as its name and a picture on its cover, so it can sit in the Creative list, a village chest, a librarian's
// trades and the Declan-craft Store. It opens and reads page by page like any other book.
const TALES = [
  { title: 'The Three Little Pigs', cover: '#c8402e', pages: [
    'Once upon a time, three little pigs left home to build houses of their own.',
    'The first little pig was in a hurry. He built his house out of straw in no time at all, and went off to play.',
    'The second little pig built his house out of sticks. It took a little longer, but not much.',
    'The third little pig built her house out of bricks. It took all day, and her brothers laughed at her. "Come and play!" they said. But she kept on building.',
    'Then along came a big bad wolf. "Little pig, little pig, let me come in!" "Not by the hair on my chinny chin chin!" said the first little pig.',
    '"Then I\'ll huff, and I\'ll puff, and I\'ll blow your house in!" And he did. The first little pig ran all the way to his brother\'s house of sticks.',
    'The wolf huffed, and he puffed, and he blew the house of sticks in too! The two little pigs ran all the way to their sister\'s house of bricks.',
    'The wolf huffed and puffed and HUFFED and PUFFED, but the house of bricks did not move one bit.',
    'So the wolf tried to climb down the chimney. But the clever pig had a big pot of hot water bubbling on the fire. SPLASH! The wolf shot back up the chimney and ran away, and was never seen again.',
    'From then on the three little pigs lived together in the strong brick house. And the two brothers learned that a job worth doing is worth doing well. The End.'] },
  { title: 'Goldilocks and the Three Bears', cover: '#e8b02a', pages: [
    'Once upon a time, three bears lived in a little house in the woods: a great big Daddy Bear, a middle-sized Mummy Bear, and a wee little Baby Bear.',
    'One morning they made porridge, but it was too hot to eat. So they went for a walk in the woods while it cooled down.',
    'Along came a little girl with golden hair called Goldilocks. She saw the house, and the door was open, so she walked right in. (That was not very polite!)',
    'She tasted Daddy Bear\'s porridge. "Too hot!" She tasted Mummy Bear\'s porridge. "Too cold!" She tasted Baby Bear\'s porridge. "Just right!" And she ate it all up.',
    'Then she sat in Daddy Bear\'s chair. "Too hard!" She sat in Mummy Bear\'s chair. "Too soft!" She sat in Baby Bear\'s chair. "Just right!" But CRACK! It broke into pieces.',
    'Goldilocks was sleepy, so she went upstairs. Daddy Bear\'s bed was too hard. Mummy Bear\'s bed was too soft. Baby Bear\'s bed was just right, and she fell fast asleep.',
    'The bears came home. "Someone has been eating my porridge," growled Daddy Bear. "And someone has eaten mine all up!" cried Baby Bear.',
    'They went upstairs. "Someone has been sleeping in my bed," squeaked Baby Bear, "and she is still there!"',
    'Goldilocks woke up, saw three bears looking at her, and jumped out of the window. She ran all the way home, and she never went into anyone\'s house without asking again. The End.'] },
  { title: 'The Tortoise and the Hare', cover: '#4a9a3a', pages: [
    'Once there was a hare who was very fast, and he liked to tell everybody so. "Nobody can beat me in a race!" he boasted.',
    'A slow old tortoise was tired of hearing it. "I will race you," he said. All the animals laughed. A tortoise race a hare?',
    'The race began. The hare shot off like an arrow and was soon far ahead. The tortoise plodded along, one slow step at a time.',
    'The hare looked back and could not even see the tortoise. "I have lots of time," he said. "I will have a little nap under this tree."',
    'The tortoise kept on going. Step, step, step. He did not stop, and he did not hurry. He just kept going.',
    'He walked past the sleeping hare. He walked on and on, and the finish line came closer and closer.',
    'At last the hare woke up. He ran as fast as he could, faster than ever! But it was too late. The tortoise was already over the finish line.',
    'All the animals cheered for the tortoise. And the hare learned that slow and steady wins the race. The End.'] },
  { title: 'Little Red Riding Hood', cover: '#d8282a', pages: [
    'Once upon a time there was a little girl who always wore a red cape with a hood, so everyone called her Little Red Riding Hood.',
    'One day her mother said, "Take this basket of cakes to Grandma, who is not feeling well. Stay on the path and do not talk to strangers."',
    'In the forest, a wolf came up to her. "Where are you going, little girl?" "To Grandma\'s house," she said. (Oh dear, she forgot what her mother told her!)',
    'The wolf ran ahead by a short cut to Grandma\'s house. Grandma saw him coming and hid in the wardrobe. The wolf put on her nightcap and jumped into her bed.',
    'Little Red Riding Hood came in. "Grandma, what big ears you have!" "All the better to hear you with, my dear."',
    '"Grandma, what big eyes you have!" "All the better to see you with, my dear." "Grandma, what big TEETH you have!" "All the better to EAT you with!"',
    'Little Red Riding Hood screamed, and a woodcutter working nearby came running with his axe. The wolf leapt out of the window and ran far away into the hills.',
    'Grandma came out of the wardrobe, and they all ate the cakes together. And Little Red Riding Hood always stayed on the path after that. The End.'] },
  { title: 'Jack and the Beanstalk', cover: '#3a8a5a', pages: [
    'Once there was a boy called Jack who lived with his mother. They were very poor, and all they had was one old cow.',
    '"Take the cow to market and sell her," said his mother. On the way, a strange man offered Jack five magic beans for the cow. Jack said yes!',
    'His mother was cross. "Beans! Silly boy!" She threw them out of the window. But in the night, the beans grew and grew into a giant beanstalk, right up into the clouds.',
    'Jack climbed up and up. At the top he found an enormous castle. Inside lived a giant. "Fee, fi, fo, fum!" the giant roared.',
    'Jack hid in a cupboard. He saw the giant\'s hen lay an egg made of solid gold! When the giant fell asleep, Jack took the hen and climbed down.',
    'Next time, Jack found a magic harp that played music all by itself. But when he picked it up, the harp sang out, "Master! Master!" and the giant woke up.',
    'Jack ran to the beanstalk and slid down as fast as he could, with the giant climbing down after him.',
    '"Mother, quick, the axe!" Jack chopped, and chopped, and down came the beanstalk. The giant scrambled back up into the clouds just in time, and never came down again.',
    'With the hen\'s golden eggs and the harp\'s music, Jack and his mother were never poor again. The End.'] },
  { title: 'The Boy Who Cried Wolf', cover: '#7a7a8a', pages: [
    'Once there was a shepherd boy who looked after the sheep on a hill above the village. It was a quiet job, and he was bored.',
    'So, for a joke, he shouted, "Wolf! Wolf! A wolf is chasing the sheep!" All the villagers came running up the hill to help.',
    'But there was no wolf. The boy laughed and laughed. The villagers were not happy, and they walked back down the hill.',
    'A few days later he did it again. "Wolf! Wolf!" Up the hill they ran, and again there was no wolf. The villagers were very cross.',
    'Then one evening a real wolf came out of the forest and crept toward the sheep. "Wolf! Wolf!" the boy shouted. "A real one this time!"',
    'But the villagers said, "He is only playing his trick again," and nobody came.',
    'The sheep ran off in every direction, and it took the boy all night to find them again.',
    'The next day the boy told the villagers he was sorry. He had learned that if you tell fibs, people will not believe you even when you tell the truth. The End.'] },
  { title: 'The Gingerbread Man', cover: '#b8702a', pages: [
    'Once upon a time a little old woman baked a gingerbread man, with currants for eyes and a cherry for a nose.',
    'When she opened the oven, the gingerbread man jumped out and ran out of the door! "Run, run, as fast as you can! You can\'t catch me, I\'m the Gingerbread Man!"',
    'The little old woman ran after him, and so did the little old man. But they could not catch him.',
    'He ran past a cow, who wanted to eat him. He ran past a horse, who wanted to eat him too. "Run, run, as fast as you can! You can\'t catch me!"',
    'Then he came to a wide river and had to stop. He could not swim, or he would go soggy!',
    'A fox came along. "Jump on my tail and I will carry you across," said the fox, with a sly smile.',
    'Halfway over, the fox said, "The water is deep. Jump onto my nose!" The gingerbread man jumped onto his nose, and SNAP! The fox gobbled him up.',
    'And that was the end of the Gingerbread Man. So be careful who you trust, even if they smile at you. The End.'] },
  { title: 'The Ugly Duckling', cover: '#5ab8e8', pages: [
    'One summer a mother duck sat on her eggs. One by one they hatched into fluffy yellow ducklings. But the last egg was big, and out came a big grey bird.',
    '"What an ugly duckling!" said the other ducks. They laughed at him and pecked at him, and nobody would play with him.',
    'The ugly duckling was so sad that he ran away. He lived all alone on a cold marsh, and all through the long winter he was lonely.',
    'One day he saw some beautiful white birds with long necks flying high in the sky. "I wish I could be like them," he said.',
    'When spring came, the duckling found that his wings were big and strong. He flew down to a lake where the beautiful white birds were swimming.',
    'He bowed his head, sure that they would chase him away. But then he saw himself in the water. He was not an ugly grey duckling any more.',
    'He was a swan! A beautiful white swan, just like them. The other swans swam over and welcomed him.',
    'He was never lonely again. And he learned that everybody grows up in their own way, and in their own time. The End.'] },
];
TALES.forEach((t, k) => defItem(I.TALE + k, t.title, { tex: 'tale_' + k, stack: 1 }));
const isTale = id => id >= I.TALE && id < I.TALE + TALES.length;
const randomTale = r => I.TALE + Math.floor((r || Math.random)() * TALES.length);
/* read a tale: it opens in the book screen, page by page, with its title at the top */
function openTale(id) {
  const t = TALES[id - I.TALE];
  if (!t) return;
  if (ui.inv) closeInv();
  game.releasePointer();
  Object.assign(BOOKUI, { slot: -1, st: { id: I.WRITTEN_BOOK, count: 1, tag: { book: { title: t.title, author: 'a storyteller', pages: t.pages } } }, edit: false, signing: false, page: 0, pages: t.pages.slice() });
  game.uiOpen = true;
  showScreen('scr-book');
  showBookPage();
  sfx('pageTurn');
}
