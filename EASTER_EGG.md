# 🥚 Easter Egg: Flappy HTR

## How to Trigger

On the authentication page, type exactly (case-sensitive):

```
mangomustard6741
```

**Important:**
- No @ sign
- No .com or any email-like formatting
- Exact case: `mangomustard6741` (all lowercase)
- Just type it in the email input field

When you type the exact phrase, the Flappy Bird game will instantly appear!

## Game Features

- **Bird**: The HTR logo spins and rotates as it flies
- **Controls**: 
  - Click anywhere on the canvas to flap
  - Press SPACE or UP ARROW to flap
- **Objective**: Navigate between the green pipes
- **Scoring**: +1 point for each pipe you pass
- **Game Over**: Hit a pipe, ceiling, or floor
- **Restart**: Click or press SPACE when game is over
- **Exit**: Click the X button in the top-right

## Technical Details

- Built with HTML5 Canvas
- Uses the actual HTR logo (`htr_logo_transparent.svg`) as the bird
- Physics-based movement with gravity
- Procedurally generated pipes
- Real-time collision detection
- Full dark mode support

## Code Location

- Game Component: `src/components/FlappyBird.tsx`
- Trigger Logic: `src/pages/Auth.tsx` (line 37)

## Fun Facts

- The bird rotates based on its velocity (tilts up when ascending, down when falling)
- Pipe gaps are randomly generated
- The game difficulty increases as you play (pipes get closer)
- Your high score resets each time you close the game
- Scoring is tracked per pipe - you get 1 point when the pipe fully passes the bird
- Each pipe is only scored once using a `scored` flag to prevent duplicate points

## How to Test

1. Start your development server: `npm run dev`
2. Navigate to the auth page (usually `/auth`)
3. In the email input field, type: `mangomustard6741`
4. The game will instantly appear!
5. Click or press SPACE to start playing

Enjoy! 🎮
