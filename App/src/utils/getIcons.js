import dice1 from '../assets/images/dice/1.png';
import dice2 from '../assets/images/dice/2.png';
import dice3 from '../assets/images/dice/3.png';
import dice4 from '../assets/images/dice/4.png';
import dice5 from '../assets/images/dice/5.png';
import dice6 from '../assets/images/dice/6.png';

// Import generic pile images (used as fallback in Dice)
import pileRed from '../assets/images/piles/red.png';
import pileBlue from '../assets/images/piles/blue.png';
import pileGreen from '../assets/images/piles/green.png';
import pileYellow from '../assets/images/piles/yellow.png';

const diceImages = {
  1: dice1,
  2: dice2,
  3: dice3,
  4: dice4,
  5: dice5,
  6: dice6,
};

const pileImages = {
  red: pileRed,
  blue: pileBlue,
  green: pileGreen,
  yellow: pileYellow,
};

export const BackgroundImage = {
  GetImage: value => {
    if (typeof value === 'number' && value >= 1 && value <= 6) {
      return diceImages[value];
    }
    if (typeof value === 'string' && pileImages[value]) {
      return pileImages[value];
    }
    // Default fallback if value is 0 or unknown
    return diceImages[1]; // Default to dice 1 icon
  },
};

// Ensure this file is created/updated in utils/getIcons.js
