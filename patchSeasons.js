const https = require('https');

// First, GET all seasons
const getOptions = {
  hostname: 'gjplauction-default-rtdb.firebaseio.com',
  port: 443,
  path: '/seasons.json',
  method: 'GET',
};

const req = https.request(getOptions, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const data = JSON.parse(body);
    if (!data) { console.log('No seasons found'); return; }
    
    Object.entries(data).forEach(([id, season]) => {
      const s = season;
      console.log(`Season ${id}:`, JSON.stringify(s, null, 2));
      
      // If season has no structured MOT fields but has manOfTheTournament string, skip (we now handle via form)
      // Just add manOfTheTournamentRuns and manOfTheTournamentWickets if they don't exist
      let runs = s.manOfTheTournamentRuns;
      let wkts = s.manOfTheTournamentWickets;
      
      // GJPL1: SUJAL DESAI 130Runs/2Wickets => 130 runs, 2 wickets
      // GJPL2: PRATIK CHEHARA 203 Runs/3 Wickets => 203 runs, 3 wickets
      if (runs === undefined || wkts === undefined) {
        // Parse from string if possible
        const mot = s.manOfTheTournament || '';
        const runsMatch = mot.match(/(\d+)\s*[Rr]uns?/);
        const wktsMatch = mot.match(/(\d+)\s*[Ww]ickets?/);
        runs = runsMatch ? parseInt(runsMatch[1]) : 0;
        wkts = wktsMatch ? parseInt(wktsMatch[1]) : 0;
        
        if (runs > 0 || wkts > 0) {
          console.log(`Patching ${id}: runs=${runs}, wkts=${wkts}`);
          
          // Extract just the name from the mot string
          const nameMatch = mot.match(/^([A-Z\s]+?)(?:\s*,|\s+\d)/);
          const name = nameMatch ? nameMatch[1].trim() : mot.split(',')[0].trim();
          
          const patch = JSON.stringify({ 
            manOfTheTournamentRuns: runs, 
            manOfTheTournamentWickets: wkts,
            manOfTheTournament: name
          });
          
          const patchOpts = {
            hostname: 'gjplauction-default-rtdb.firebaseio.com',
            port: 443,
            path: `/seasons/${id}.json`,
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          };
          const pr = https.request(patchOpts, r => {
            let b = '';
            r.on('data', d => b += d);
            r.on('end', () => console.log(`Patched ${id}:`, b));
          });
          pr.write(patch);
          pr.end();
        }
      } else {
        console.log(`Season ${id} already has structured MOT fields`);
      }
    });
  });
});
req.end();
