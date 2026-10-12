BYTEBLAST 6-1 — Vercel-ready static website

FILES
- index.html  Main page (replaces index.php)
- style.css   Styling
- game.js     Game logic and browser-local best score
- README.txt  These instructions

DEPLOY TO VERCEL
1. Upload these files to the root of a GitHub repository (no subfolders), or use Vercel's supported deployment flow.
2. Import the repository into Vercel.
3. For a plain static site, leave the framework preset as "Other" and do not set a build command.
4. Deploy. Vercel will serve index.html at the domain root.

IMPORTANT
- This version does not use PHP, so it can run as a static Vercel website.
- The best score is stored in the browser's localStorage. It persists in the same browser/device, but is not shared between devices or users.
- If you need shared global scores, connect a database or hosted API separately.
