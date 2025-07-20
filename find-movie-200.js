import fs from 'fs';
import path from 'path';

const moviesPath = path.resolve(process.cwd(), 'movies.txt');
const content = fs.readFileSync(moviesPath, 'utf-8');

// Split by double newlines to get each movie block
const movieBlocks = content.split('\n\n').filter((block) => block.trim().length > 0);

console.log(`Total movie blocks: ${movieBlocks.length}`);

// Get the 200th movie (index 199)
const targetIndex = 199;
if (movieBlocks[targetIndex]) {
  console.log(`\nMovie at index ${targetIndex} (200th movie):`);
  console.log('='.repeat(50));
  console.log(movieBlocks[targetIndex]);
  console.log('='.repeat(50));

  // Extract just the title line
  const titleLine = movieBlocks[targetIndex].split('\n')[0];
  console.log(`\nTitle line: ${titleLine}`);
} else {
  console.log(`No movie found at index ${targetIndex}`);
}
