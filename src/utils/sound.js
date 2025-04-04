// Sound utility for playing button click sounds
const buttonSound = new Audio(process.env.PUBLIC_URL + '/sounds/button-click.mp3');

export const playButtonSound = () => {
    buttonSound.currentTime = 0; // Reset the audio to start
    buttonSound.play().catch(error => {
        console.log('Error playing sound:', error);
    });
};

export default playButtonSound; 