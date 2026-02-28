const { ALL_ROLES, LolRoles, Roles, Teams } = require('../config/constants');
const { shuffle, pickRandomN } = require('../utils/arrayUtils');

function assignLolRoles(lobby) {
  const shuffledLolRoles = shuffle([...LolRoles]);
  const equipe1 = lobby.getTeamPlayers(Teams.EQUIPE1);
  const equipe2 = lobby.getTeamPlayers(Teams.EQUIPE2);

  equipe1.forEach((player, i) => {
    player.lolRole = shuffledLolRoles[i];
  });

  // Also shuffle for equipe2 separately
  const shuffledLolRoles2 = shuffle([...LolRoles]);
  equipe2.forEach((player, i) => {
    player.lolRole = shuffledLolRoles2[i];
  });
}

function assignSecretRoles(lobby) {
  const equipe1 = lobby.getTeamPlayers(Teams.EQUIPE1);
  const equipe2 = lobby.getTeamPlayers(Teams.EQUIPE2);
  const symmetric = lobby.settings.symmetricRoles !== false; // default true
  const testMode = lobby.settings.testMode === true;
  const forcedRoles = lobby.forcedRoles || {};

  let roles1 = null;

  if (equipe1.length > 0) {
    if (symmetric) {
      roles1 = pickRandomN(ALL_ROLES, equipe1.length);
    } else {
      roles1 = Array.from({ length: equipe1.length }, () => ALL_ROLES[Math.floor(Math.random() * ALL_ROLES.length)]);
    }
    equipe1.forEach((player, i) => {
      player.secretRole = (testMode && forcedRoles[player.id]) ? forcedRoles[player.id] : roles1[i];
    });
  }

  if (equipe2.length > 0) {
    let roles2;
    if (symmetric && roles1) {
      roles2 = shuffle([...roles1]);
    } else {
      roles2 = Array.from({ length: equipe2.length }, () => ALL_ROLES[Math.floor(Math.random() * ALL_ROLES.length)]);
    }
    equipe2.forEach((player, i) => {
      player.secretRole = (testMode && forcedRoles[player.id]) ? forcedRoles[player.id] : roles2[i];
    });
  }

  // Handle Romeo pairing
  pairRomeos(lobby);
}

function pairRomeos(lobby) {
  const allActive = lobby.getActivePlayers();
  const romeoPlayers = allActive.filter((p) => p.secretRole === Roles.ROMEO);

  if (romeoPlayers.length === 0) return;

  if (romeoPlayers.length >= 2) {
    // Pair them with each other (first two Romeos)
    romeoPlayers[0].romeoPartnerId = romeoPlayers[1].id;
    romeoPlayers[0].romeoPartnerName = romeoPlayers[1].username;
    romeoPlayers[1].romeoPartnerId = romeoPlayers[0].id;
    romeoPlayers[1].romeoPartnerName = romeoPlayers[0].username;
  } else {
    // Single Romeo: pair with random active non-Romeo
    const nonRomeos = allActive.filter((p) => p.secretRole !== Roles.ROMEO);
    if (nonRomeos.length === 0) return;
    const partner = nonRomeos[Math.floor(Math.random() * nonRomeos.length)];
    romeoPlayers[0].romeoPartnerId = partner.id;
    romeoPlayers[0].romeoPartnerName = partner.username;
  }
}

module.exports = { assignLolRoles, assignSecretRoles };
