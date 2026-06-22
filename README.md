# R-plus-Share-to-Facebook
Facebook Custom Media Creator & Sharing Engine

## Run locally
1. Open a terminal in `/workspaces/R-plus-Share-to-Facebook`
2. Install dependencies:
   - `npm install`
3. Start the Express server:
   - `npm start`
4. Open the app in your browser:
   - `http://localhost:3000`

## App flow
- Upload a property photo or short video asset.
- The app stores the media in `/public/uploads`.
- A draft caption with compliance fields is generated automatically.
- Click **Generate & Share to Facebook** to save the post and open the Facebook sharer.
- Facebook will request the generated `/post/:id` endpoint with OG metadata.
