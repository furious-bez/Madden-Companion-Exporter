const express = require('express');
const admin = require('firebase-admin');

const app = express();

// TODO: Enter the path to your service account json file
// Need help with this step go here: https://firebase.google.com/docs/admin/setup
const serviceAccount = require("./fgsn-madexp-firebase-adminsdk-0k933-db20c4889b.json");

// TODO: Enter your database url from firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fgsn-madexp.firebaseio.com/"
});

app.set('port', (process.env.PORT || 3001));

app.get('*', (req, res) => {
  res.send('Madden Companion Exporter');
});

// /:username
app.post('/:platform/:leagueId/leagueteams', (req, res) => {
  const db = admin.database();
  const ref = db.ref();
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    const { leagueTeamInfoList: teams } = JSON.parse(body);
    // username
    const {params: { leagueId }} = req;

    teams.forEach(team => {
      // data/${username}
      const teamRef = ref.child(`data/${leagueId}/teams/${team.teamId}`);
      teamRef.update(team);
    });

    res.sendStatus(200);
  });
});

// /:username
app.post('/:platform/:leagueId/standings', (req, res) => {
  const db = admin.database();
  const ref = db.ref();
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    const { teamStandingInfoList: teams } = JSON.parse(body);
    // username,
    const {params: { leagueId }} = req;

    teams.forEach(team => {
      const teamRef = ref.child(
          // `data/${username}
          `data/${leagueId}/teams/${team.teamId}`
      );
      teamRef.update(team);
    });

    res.sendStatus(200);
  });
});

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

//Clear firebase database
// app.get('/delete', function(req, res) {
//   const db = admin.database();
//   const ref = db.ref();
//   const dataRef = ref.child(`data`);
//   dataRef.remove();
//   return res.send('Madden Data Cleared')
// });

app.post(
    // /:username
    '/:platform/:leagueId/week/:weekType/:weekNumber/:dataType',
    (req, res) => {
      const db = admin.database();
      const ref = db.ref();
      const {
        //  username,
        params: { leagueId, weekType, weekNumber, dataType },
      } = req;
      // data/${username}
      const basePath = `data/${leagueId}/`;
      // "defense", "kicking", "passing", "punting", "receiving", "rushing"
      const statsPath = `${basePath}stats`;
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        switch (dataType) {
          case 'schedules': {
            const weekRef = ref.child(
                `${basePath}schedules/${weekType}/${weekNumber}`
            );
            const { gameScheduleInfoList: schedules } = JSON.parse(body);
            weekRef.update(schedules);
            break;
          }
          case 'teamstats': {
            const { teamStatInfoList: teamStats } = JSON.parse(body);
            teamStats.forEach(stat => {
              const weekRef = ref.child(
                  `${statsPath}/${weekType}/${weekNumber}/${stat.teamId}/team-stats`
              );
              weekRef.update(stat);
            });
            break;
          }
          case 'defense': {
            const { playerDefensiveStatInfoList: defensiveStats } = JSON.parse(body);
            defensiveStats.forEach(stat => {
              const weekRef = ref.child(
                  `${statsPath}/${weekType}/${weekNumber}/${stat.teamId}/player-stats/${stat.rosterId}`
              );
              weekRef.update(stat);
            });
            break;
          }
          default: {
            const property = `player${capitalizeFirstLetter(
                dataType
            )}StatInfoList`;
            const stats = JSON.parse(body)[property];
            stats.forEach(stat => {
              const weekRef = ref.child(
                  `${statsPath}/${weekType}/${weekNumber}/${stat.teamId}/player-stats/${stat.rosterId}`
              );
              weekRef.update(stat);
            });
            break;
          }
        }

        res.sendStatus(200);
      });
    }
);

// ROSTERS
// /:username
app.post('/:platform/:leagueId/freeagents/roster', (req, res) => {
  res.sendStatus(200);
});

// /:username
app.post('/:platform/:leagueId/team/:teamId/roster', (req, res) => {
  const db = admin.database();
  const ref = db.ref();
  const {
    // username,
    params: { leagueId, teamId }
  } = req;
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    const { rosterInfoList } = JSON.parse(body);
    const dataRef = ref.child(
        // `data/${username}
        `data/${leagueId}/teams/${teamId}/roster`
    );
    const players = {};
    rosterInfoList.forEach(player => {
      players[player.rosterId] = player;
    });
    dataRef.set(players, error => {
      if (error) {
        console.log('Data could not be saved.' + error);
      } else {
        console.log('Data saved successfully.');
      }
    });
    res.sendStatus(200);
  });
});

app.listen(app.get('port'), () =>
    console.log('Madden Data is running on port', app.get('port'))
);