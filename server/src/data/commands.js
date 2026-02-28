const DROIDE_COMMANDS = [
  { id: 'go-top', text: 'Go Top !', audioPath: '/audio/commands/go-top.mp3' },
  { id: 'go-bot', text: 'Go Bot !', audioPath: '/audio/commands/go-bot.mp3' },
  { id: 'go-mid', text: 'Dove Mid !', audioPath: '/audio/commands/go-mid.mp3' },
  { id: 'focus-dragon', text: 'Focus le Dragon !', audioPath: '/audio/commands/focus-dragon.mp3' },
  { id: 'focus-baron', text: 'Focus le Baron !', audioPath: '/audio/commands/focus-baron.mp3' },
  { id: 'recule-tour', text: 'Recule sous ta tour !', audioPath: '/audio/commands/recule-tour.mp3' },
  { id: 'push-lane', text: 'Push ta lane !', audioPath: '/audio/commands/push-lane.mp3' },
  { id: 'ward-riviere', text: 'Ward la rivière !', audioPath: '/audio/commands/ward-riviere.mp3' },
  { id: 'take-buff', text: 'Prends le buff rouge !', audioPath: '/audio/commands/take-buff.mp3' },
  { id: 'engage', text: 'Engage maintenant !', audioPath: '/audio/commands/engage.mp3' },
  { id: 'recall', text: 'Recall en base !', audioPath: '/audio/commands/recall.mp3' },
  { id: 'follow-carry', text: 'Follow ton carry !', audioPath: '/audio/commands/follow-carry.mp3' },
  { id: 'split-push', text: 'Split push !', audioPath: '/audio/commands/split-push.mp3' },
  { id: 'group-mid', text: 'Regroupe Mid !', audioPath: '/audio/commands/group-mid.mp3' },
  { id: 'steal-jungle', text: 'Vole la jungle ennemie !', audioPath: '/audio/commands/steal-jungle.mp3' },
  { id: 'roam', text: 'Roam sur une autre lane !', audioPath: '/audio/commands/roam.mp3' },
  { id: 'farm', text: 'Farm tranquillement !', audioPath: '/audio/commands/farm.mp3' },
  { id: 'poke', text: 'Poke sans engager !', audioPath: '/audio/commands/poke.mp3' },
  { id: 'all-in', text: 'All-in maintenant !', audioPath: '/audio/commands/all-in.mp3' },
  { id: 'back-off', text: 'Recule, joue défensif !', audioPath: '/audio/commands/back-off.mp3' },
];

module.exports = { DROIDE_COMMANDS };
