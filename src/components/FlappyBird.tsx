import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import htrLogo from '../assets/htr_logo_transparent.svg';

interface FlappyBirdProps {
  onClose: () => void;
}

const FlappyBird: React.FC<FlappyBirdProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const gameLoopRef = useRef<number>();
  const logoImageRef = useRef<HTMLImageElement>();

  // Game constants
  const GRAVITY = 0.5;
  const JUMP_STRENGTH = -10;
  const BIRD_SIZE = 40;
  const PIPE_WIDTH = 60;
  const PIPE_GAP = 180;
  const PIPE_SPEED = 3;

  // Game state
  const birdRef = useRef({ y: 250, velocity: 0 });
  const pipesRef = useRef<Array<{ x: number; topHeight: number; scored: boolean }>>([]);
  const frameCountRef = useRef(0);

  // Load HTR logo
  useEffect(() => {
    const img = new Image();
    img.src = htrLogo;
    img.onload = () => {
      logoImageRef.current = img;
    };
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!gameStarted) {
          setGameStarted(true);
        } else if (!gameOver) {
          birdRef.current.velocity = JUMP_STRENGTH;
        } else {
          restartGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver]);

  // Handle mouse/touch input
  const handleCanvasClick = () => {
    if (!gameStarted) {
      setGameStarted(true);
    } else if (!gameOver) {
      birdRef.current.velocity = JUMP_STRENGTH;
    } else {
      restartGame();
    }
  };

  const restartGame = () => {
    birdRef.current = { y: 250, velocity: 0 };
    pipesRef.current = [];
    frameCountRef.current = 0;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
  };

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      // Update bird physics
      birdRef.current.velocity += GRAVITY;
      birdRef.current.y += birdRef.current.velocity;

      // Generate pipes
      frameCountRef.current++;
      if (frameCountRef.current % 90 === 0) {
        const topHeight = Math.random() * (canvas.height - PIPE_GAP - 100) + 50;
        pipesRef.current.push({ x: canvas.width, topHeight, scored: false });
      }

      // Update pipes
      const birdX = canvas.width / 2 - BIRD_SIZE / 2;
      
      pipesRef.current = pipesRef.current.filter(pipe => {
        pipe.x -= PIPE_SPEED;
        
        // Check if pipe passed bird (scoring) - pipe center passed bird center
        if (!pipe.scored && pipe.x + PIPE_WIDTH < birdX) {
          pipe.scored = true;
          setScore(s => s + 1);
        }
        
        return pipe.x > -PIPE_WIDTH;
      });

      // Check collisions
      const birdY = birdRef.current.y;

      // Check ceiling and floor collision
      if (birdY < 0 || birdY + BIRD_SIZE > canvas.height) {
        setGameOver(true);
        return;
      }

      // Check pipe collision
      for (const pipe of pipesRef.current) {
        if (
          birdX + BIRD_SIZE > pipe.x &&
          birdX < pipe.x + PIPE_WIDTH &&
          (birdY < pipe.topHeight || birdY + BIRD_SIZE > pipe.topHeight + PIPE_GAP)
        ) {
          setGameOver(true);
          return;
        }
      }

      // Clear canvas
      ctx.fillStyle = '#0ea5e9'; // Sky blue
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw pipes
      ctx.fillStyle = '#22c55e'; // Green pipes
      for (const pipe of pipesRef.current) {
        // Top pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        // Bottom pipe
        ctx.fillRect(
          pipe.x,
          pipe.topHeight + PIPE_GAP,
          PIPE_WIDTH,
          canvas.height - pipe.topHeight - PIPE_GAP
        );
        
        // Pipe borders
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 3;
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.strokeRect(
          pipe.x,
          pipe.topHeight + PIPE_GAP,
          PIPE_WIDTH,
          canvas.height - pipe.topHeight - PIPE_GAP
        );
      }

      // Draw bird (HTR logo)
      if (logoImageRef.current) {
        ctx.save();
        ctx.translate(birdX + BIRD_SIZE / 2, birdY + BIRD_SIZE / 2);
        // Rotate based on velocity
        const rotation = Math.min(Math.max(birdRef.current.velocity * 0.05, -0.5), 0.5);
        ctx.rotate(rotation);
        ctx.drawImage(
          logoImageRef.current,
          -BIRD_SIZE / 2,
          -BIRD_SIZE / 2,
          BIRD_SIZE,
          BIRD_SIZE
        );
        ctx.restore();
      } else {
        // Fallback circle if image hasn't loaded
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(birdX + BIRD_SIZE / 2, birdY + BIRD_SIZE / 2, BIRD_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw score
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(score.toString(), canvas.width / 2, 50);
      ctx.fillText(score.toString(), canvas.width / 2, 50);

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, score]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
      <div className="relative">
        {/* Close button */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute -top-12 right-0 text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Game canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={600}
          onClick={handleCanvasClick}
          className="border-4 border-white rounded-lg cursor-pointer"
        />

        {/* Instructions overlay */}
        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="text-center text-white space-y-4">
              <h2 className="text-3xl font-bold">Flappy HTR</h2>
              <p className="text-lg">Click or press SPACE to start!</p>
              <p className="text-sm opacity-75">Keep the logo flying between the pipes</p>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
            <div className="text-center text-white space-y-4">
              <h2 className="text-4xl font-bold">Game Over!</h2>
              <p className="text-2xl">Score: {score}</p>
              <p className="text-lg opacity-75">Click or press SPACE to restart</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlappyBird;
