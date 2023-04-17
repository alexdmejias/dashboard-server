import CallbackBase from "./base";

const allQuotes: Quote[] = [
  { content: "Bet on me? Bet I will.", author: "Lizzo" },
  {
    content: "Before anything else, preparation is the key to success.",
    author: "Alexander Graham Bell",
  },
  {
    content:
      "Stay afraid, but do it anyway. What's important is the action. You don't have to wait to be confident. Just do it and eventually the confidence will follow.",
    author: "Carrie Fisher",
  },
  { content: "Make each day your masterpiece.", author: "John Wooden" },
  {
    content:
      "Your talent determines what you can do. Your motivation determines how much you're willing to do. Your attitude determines how well you do it.",
    author: "Lou Holtz",
  },
  {
    content:
      "I learned this, at least, by my experiment; that if one advances confidently in the direction of his dreams, and endeavors to live the life which he has imagined, he will meet with a success unexpected in common hours.",
    author: "Henry David Thoreau",
  },
  { content: "We will fail when we fail to try.", author: "Rosa Parks" },
  {
    content: "Don't count the days, make the days count.",
    author: "Muhammad Ali",
  },
  {
    content:
      "I love to see a young girl go out and grab the world by the lapels. Life's a bitch. You've got to go out and kick ass.",
    author: "Maya Angelou",
  },
  {
    content:
      "Without ambition one starts nothing. Without work one finishes nothing. The prize will not be sent to you. You have to win it.",
    author: "Ralph Waldo Emerson",
  },
  {
    content:
      "You've got to get up every morning with determination if you're going to go to bed with satisfaction.",
    author: "George Lorimer",
  },
  {
    content: "Boss up and change your life / You can have it all, no sacrifice",
    author: "Lizzo",
  },
  {
    content: "The plan is to fan this spark into a flame.",
    author: "Lin-Manuel Miranda",
  },
  {
    content: "Real change, enduring change, happens one step at a time.",
    author: "Ruth Bader Ginsburg",
  },
  {
    content: "Light tomorrow with today.",
    author: "Elizabeth Barrett Browning",
  },
  {
    content:
      "Drench yourself in words unspoken / Live your life with arms wide open / Today is where your book begins / The rest is still unwritten",
    author: "Natasha Bedingfield",
  },
  {
    content: "And now that you don't have to be perfect, you can be good.",
    author: "John Steinbeck",
  },
  {
    content:
      "Never give up on a dream just because of the time it will take to accomplish it. The time will pass anyway.",
    author: "Earl Nightingale",
  },
  { content: "Someday is not a day of the week.", author: "Janet Dailey" },
  {
    content:
      "Too late for second-guessing / Too late to go back to sleep / It's time to trust my instincts / Close my eyes and leap.",
    author: "Stephen Schwartz",
  },
  {
    content: "A year from now you may wish you had started today.",
    author: "Karen Lamb",
  },
  { content: "Try not. Do, or do not. There is no try.", author: "Yoda" },
  {
    content:
      "People talk about confidence without ever bringing up hard work. That's a mistake. I know I sound like some dour older spinster on Downton Abbey who has never felt a man's touch and whose heart has turned to stone, but I don't understand how you could have self-confidence if you don't do the work… Because confidence is like respect; you have to earn it.",
    author: "Mindy Kaling",
  },
  {
    content:
      "Real courage is when you know you're licked before you begin, but you begin anyway and see it through no matter what.",
    author: "Harper Lee",
  },
  {
    content:
      "You get to decide where your time goes. You can either spend it moving forward, or you can spend it putting out fires. You decide. And if you don't decide, others will decide for you.",
    author: "Tony Morgan",
  },
  {
    content:
      "Don't sit down and wait for the opportunities to come. Get up and make them.",
    author: "Madam C.J Walker",
  },
  {
    content:
      "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
    author: "Stephen Covey",
  },
  {
    content:
      "Imagining something may be the first step in making it happen, but it takes the real time and real efforts of real people to learn things, make things, turn thoughts into deeds or visions into inventions.",
    author: "Mr. Rogers",
  },
  {
    content:
      "When someone tells me 'no,' it doesn't mean I can't do it, it simply means I can't do it with them.",
    author: "Karen E. Quinones Miller",
  },
  {
    content: "What we fear of doing most is usually what we most need to do.",
    author: "Ralph Waldo Emerson",
  },
  {
    content:
      "You may not control all the events that happen to you, but you can decide not to be reduced by them.",
    author: "Maya Angelou",
  },
  {
    content:
      "What I've realized is that confidence is a daily journey. We always think that confidence is a destination we must get to, but it's a choice we make. I don't think it's something we ever really get to and stay at. And I think once you know that, it takes the pressure off.",
    author: "Jonathan Van Ness",
  },
  {
    content: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
  },
  {
    content:
      "There will always be hurdles in life, but if you want to achieve a goal, you must continue.",
    author: "Malala Yousafzai",
  },
  {
    content:
      "Remember to look up at the stars and not down at your feet. Try to make sense of what you see and wonder about what makes the universe exist. Be curious. And however difficult life may seem, there is always something you can do and succeed at. It matters that you don't just give up.",
    author: "Stephen Hawking",
  },
  {
    content:
      "The most important step a man can take. It's not the first one, is it? It's the next one. Always the next step.",
    author: "Brandon Sanderson",
  },
  {
    content:
      "Even if you're on the right track, you'll get run over if you just sit there.",
    author: "Will Rogers",
  },
  {
    content:
      "There will be people who say to you, 'You are out of your lane.' They are burdened by only having the capacity to see what has always been instead of what can be. But don't you let that burden you.",
    author: "Kamala Harris",
  },
  {
    content: "Never confuse a single defeat with a final defeat.",
    author: "F. Scott Fitzgerald",
  },
  {
    content:
      "I'm a survivor / I'm not gonna give up / I'm not gonna stop / I'm gonna work harder",
    author: "Destiny's Child",
  },
  {
    content:
      "Never allow a person to tell you no who doesn't have the power to say yes.",
    author: "Eleanor Roosevelt",
  },
  {
    content:
      "Only when we're drowning do we understand how fierce our feet can kick.",
    author: "Amanda Gorman",
  },
  {
    content:
      "Real courage is holding on to a still voice in your head that says, 'I must keep going.' It's that voice that says nothing is a failure if it is not final. That voice that says to you, 'Get out of bed. Keep going. I will not quit.'",
    author: "Cory Booker",
  },
  {
    content:
      "I break chains all by myself / Won't let my freedom rot in hell / Hey! I'ma keep running / 'Cause a winner don't quit on themselves",
    author: "Beyoncé",
  },
  {
    content: "Your imagination is your preview of life's coming attractions.",
    author: "Albert Einstein",
  },
  {
    content:
      "If you don't design your own life plan, chances are you'll fall into someone else's plan and guess what they have planned for you? Not much.",
    author: "Jim Rohn",
  },
  {
    content:
      "You can't make decisions based on fear and the possibility of what might happen.",
    author: "Michelle Obama",
  },
  {
    content:
      "It is better to fail in originality than to succeed in imitation.",
    author: "Herman Melville",
  },
  {
    content:
      "Do not stop thinking of life as an adventure. You have no security unless you can live bravely, excitingly, imaginatively; unless you can choose a challenge instead of competence.",
    author: "Eleanor Roosevelt",
  },
  {
    content: "Do not let anyone ever tell you who you are.",
    author: "Kamala Harris",
  },
  {
    content: "You can get what you want or you can just get old.",
    author: "Billy Joel",
  },
  {
    content: "If everything seems under control, you're not going fast enough.",
    author: "Mario Andretti",
  },
  {
    content:
      "There does come a moment when you start saying, 'I want more,' and people look at you a little cross-eyed, because it's loving what you have and also knowing you want to try for more. Sometimes that makes people uncomfortable.",
    author: "Ariana DeBose",
  },
  {
    content:
      "Trust yourself. You probably know more than you think you do… Trust that you can learn anything.",
    author: "Melinda French Gates",
  },
  {
    content: "I dream it / I work hard / I grind 'til I own it",
    author: "Beyoncé",
  },
  {
    content:
      "Build your own dreams or someone else will hire you to build theirs.",
    author: "Farrah Gray",
  },
  {
    content: "Definitions belong to the definers, not the defined.",
    author: "Toni Morrison, Beloved",
  },
  {
    content:
      "If you want to be a true professional, do something outside yourself.",
    author: "Ruth Bader Ginsburg",
  },
  {
    content: "Owning up to your vulnerabilities is a form of strength.",
    author: "Lizzo",
  },
  {
    content:
      "Very often a change of self is needed more than a change of scene.",
    author: "Arthur Christopher Benson",
  },
  {
    content:
      "I've learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel.",
    author: "Maya Angelou",
  },
  {
    content:
      "The reality is: Sometimes you lose. And you're never too good to lose. You're never too big to lose. You're never too smart to lose. It happens. And it happens when it needs to happen. And you need to embrace those things.",
    author: "Beyoncé",
  },
  {
    content:
      "Even if I don't reach all my goals, I've gone higher than I would have if I hadn't set any.",
    author: "Danielle Fotopoulis",
  },
  {
    content: "Failure is the condiment that gives success its flavor.",
    author: "Truman Capote",
  },
  {
    content:
      "You never know which people, places, and experiences are going to shift your perspective until after you've left them behind and had some time to look back.",
    author: "Quinta Brunson",
  },
  {
    content:
      "I don't harp on the negative because if you do, then there's no progression. There's no forward movement. You got to always look on the bright side of things, and we are in control. Like, you have control over the choices you make.",
    author: "Taraji P. Henson",
  },
  {
    content:
      "And how do you know when you're doing something right? How do you know that? It feels so. What I know now is that feelings are really your GPS system for life. When you're supposed to do something or not supposed to do something, your emotional guidance system lets you know. The trick is to learn to check your ego at the door and start checking your gut instead.",
    author: "Oprah Winfrey",
  },
  {
    content:
      "Develop success from failures. Discouragement and failure are two of the surest stepping stones to success.",
    author: "Dale Carnegie",
  },
  {
    content:
      "You may encounter many defeats, but you must not be defeated. In fact, it may be necessary to encounter the defeats, so you can know who you are, what you can rise from, how you can still come out of it.",
    author: "Maya Angelou",
  },
  {
    content:
      "Self-care is really rooted in self-preservation, just like self-love is rooted in honesty. We have to start being more honest with what we need, and what we deserve, and start serving that to ourselves. It can be a spa day! But for a lot of people, it's more like, I need a mentor. I need someone to talk to. I need to see someone who looks like me that's successful, that's doing the things that I want to do, to know that it's possible.",
    author: "Lizzo",
  },
  {
    content: "A dead end street is a good place to turn around.",
    author: "Naomi Judd",
  },
  {
    content:
      "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.",
    author: "Steve Jobs",
  },
  { content: "An unexamined life is not worth living.", author: "Socrates" },
  {
    content:
      "Life can only be understood backward, but it must be lived forwards.",
    author: "Søren Kierkegaard",
  },
  {
    content:
      "Self-reflection is a much kinder teacher than regret is. Prioritize yourself by making a habit of it.",
    author: "Andrena Sawyer",
  },
  {
    content: "I hate that word: 'lucky.' It cheapens a lot of hard work.",
    author: "Peter Dinklage",
  },
  {
    content:
      "Woo girl, need to kick off your shoes / Got to take a deep breath, time to focus on you",
    author: "Lizzo",
  },
  {
    content:
      "To live is the rarest thing in the world. Most people exist, that is all.",
    author: "Oscar Wilde",
  },
  {
    content:
      "Rivers know this: There is no hurry. We shall get there some day.",
    author: "A.A. Milne",
  },
  {
    content: "It takes courage to grow up and become who you really are.",
    author: "e.e. cummings",
  },
  {
    content:
      "Optimism is a huge asset. We can always use more of it. But optimism isn't a belief that things will automatically get better; it's a conviction that we can make things better.",
    author: "Melinda French Gates",
  },
  {
    content:
      "Let nothing happen, just for a bit, let the minutes toll in the stunning air, let us lie on our beds like astronauts, hurtling through space and time.",
    author: "Olivia Laing",
  },
  {
    content: "The more I want to get something done the less I call it work.",
    author: "Richard Bach",
  },
  {
    content:
      "There is always light. If only we're brave enough to see it. If only we're brave enough to be it.",
    author: "Amanda Gorman",
  },
  {
    content:
      "Someone's sitting in the shade today because someone planted a tree a long time ago.",
    author: "Warren Buffett",
  },
  {
    content:
      "We must be willing to let go of the life we planned so as to have the life that is waiting for us.",
    author: "Joseph Campbell",
  },
  {
    content:
      "She was learning, quite late, what many people around her appeared to have known since childhood that life can be perfectly satisfying without major achievements.",
    author: "Alice Munro",
  },
  {
    content:
      "Don't ever confuse the two, your life and your work. The second is only part of the first.",
    author: "Anna Quindlen",
  },
  {
    content:
      "The individual who says it is not possible should move out of the way of those doing it.",
    author: "Tricia Cunningham",
  },
  {
    content:
      "The true meaning of life is to plant trees under whose shade you do not expect to sit.",
    author: "Nelson Henderson",
  },
  {
    content: "Success is where preparation and opportunity meet.",
    author: "Bobby Unser",
  },
  {
    content: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
  },
  {
    content:
      "Before I started, I decided that I'd only pursue this career if my self-worth was dependent on more than celebrity success.",
    author: "Beyoncé",
  },
  {
    content:
      "Success is liking yourself, liking what you do, and liking how you do it.",
    author: "Maya Angelou",
  },
  {
    content:
      "Success is a state of mind. If you want success, start thinking of yourself as a success.",
    author: "Joyce Brothers",
  },
  {
    content:
      "Don't aim for success if you want it, just do what you love and believe in and it will come naturally.",
    author: "David Frost",
  },
  {
    content: "Whether I fail or succeed, it's the going for it.",
    author: "Jonathan Van Ness",
  },
  {
    content: "Success only comes to those who dare to attempt.",
    author: "Mallika Tripathi",
  },
  {
    content:
      "People rarely succeed unless they have fun in what they are doing.",
    author: "Dale Carnegie",
  },
  {
    content:
      "Always work hard and have fun in what you do because I think that's when you're more successful. You have to choose to do it.",
    author: "Simone Biles",
  },
  {
    content: "Don't trust any one story of how to become successful.",
    author: "Mindy Kaling",
  },
];

type Quote = { author: string; content: string };

class CallbackQuote extends CallbackBase {
  availableQuoteIndexes: number[] = [];

  constructor() {
    super("quote");

    this.resetPickedQuotes();
  }

  resetPickedQuotes() {
    this.availableQuoteIndexes = Array(allQuotes.length)
      .fill(0)
      .map((i, index) => index);
  }

  pickQuote() {
    if (this.availableQuoteIndexes.length === 0) {
      this.resetPickedQuotes();
    }

    const randomElem = Math.floor(
      Math.random() * this.availableQuoteIndexes.length
    );
    const item = this.availableQuoteIndexes[randomElem];

    this.availableQuoteIndexes.splice(randomElem, 1);

    return allQuotes[item];
  }

  async getData() {
    return this.pickQuote();
  }
}

export default CallbackQuote;
