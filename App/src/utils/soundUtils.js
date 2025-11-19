import SoundPlayer from 'react-native-sound-player';

export const playSound = async (soundName, loop = 0, stop = false) => {
  try {
    const soundPath = getSoundPath(soundName);

    if (stop) {
      SoundPlayer.stop();
      return;
    }

    SoundPlayer.setNumberOfLoops(loop);

    await SoundPlayer.playAsset(soundPath);
  } catch (e) {
    console.log('cannot play the sound file', e);
  }
};

const getSoundPath = soundName => {
  switch (soundName) {
    case 'dice_roll':
      return require('../assets/sfx/diceRoll.mp3');
    case 'game_finish':
      return require('../assets/sfx/gameFinish.mp3');
    case 'game_start':
      return require('../assets/sfx/countdown.mp3');
    case 'kill':
      return require('../assets/sfx/kill.mp3');
    case 'background':
      return require('../assets/sfx/background.mp3');
    case 'pawn_move':
      return require('../assets/sfx/pawnMove.mp3');
    case 'home_entry':
      return require('../assets/sfx/homeEntry.mp3');
    default:
      throw new Error(`Sound ${soundName} not found`);
  }
};
