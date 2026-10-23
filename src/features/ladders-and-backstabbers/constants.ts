export const tiles = [
  { color: "Orange / alpha", name: "Duel Chow", effect: "Both partners duel Chow. Each player earns 500,000 gil if they win, or 100,000 gil if they lose. Stay on this tile." },
  { color: "Purple / mushroom", name: "Wrong Getaway Car", effect: "Roll /random 6 and move backwards by the result." },
  { color: "Blue / shark", name: "Police Raid", effect: "Move backwards 3 spaces immediately. No skipped turn." },
  { color: "Green / ladder", name: "Connections Upstairs", effect: "Climb to the ladder's host-set endpoint." },
  { color: "Red / fall arrow", name: "Ratted Out", effect: "Drop to the fall's host-set endpoint." },
  { color: "Brown / moogle", name: "Axo's Trivia", effect: "Take on Axo's trivia challenge. Win 500,000 gil each if successful. Stay on this tile." },
  { color: "Crown", name: "The Big Boss", effect: "Reach or pass the crown and resolve the full turn before the host confirms your win." },
];

export const abilities = [
  { name: "Tall Poppy", timing: "Before your first roll", effect: "Move a selected leader backwards 4 spaces. You must be strictly behind them; you cannot target yourself." },
  { name: "Cut the Brakes", timing: "Before your first roll; hostile", effect: "Choose another crew. Reduce their next normal movement by 2, to a minimum of 1 space. Compare natural dice as usual, then apply the penalty." },
  { name: "Handbrake Turn", timing: "After normal dice, before movement", effect: "Subtract 1 or 2 from your normal movement, to a minimum of 1 space." },
  { name: "Clean Getaway", timing: "React to a negative tile", effect: "Cancel one red, purple or blue tile effect. Stay on the triggering tile. Does not block abilities." },
  { name: "Roadblock", timing: "Before your first roll; hostile", effect: "Choose another crew. They must Bank It on their next normal turn; no backup attempt. The restriction ends after that turn." },
];

export const missions = [
  { name: "Partners in Crime", effect: "Two different scheduled first rollers get equal accepted first rolls on consecutive team turns." },
  { name: "Full Crew", effect: "Every member records a natural normal roll of 4 or more." },
  { name: "Snake Charmer", effect: "Trigger two red falls. A fall cancelled by Clean Getaway still counts." },
  { name: "Colour Collector", effect: "Trigger three different special-tile types through normal movement." },
  { name: "Small-Time Crooks", effect: "Record a natural normal 1 and a natural normal 2, in either order." },
  { name: "Six Appeal", effect: "Record two natural normal 6s." },
  { name: "Back Where We Started", effect: "End a later turn on a tile occupied at the end of an earlier team turn. Exclude start and turns with no position change." },
  { name: "Moving Up in the World", effect: "Start a turn behind at least two teams and end it strictly ahead of both." },
  { name: "Against All Odds", effect: "Start a round in sole last place and end it strictly ahead of at least one team." },
  { name: "Nothing Personal", effect: "Successfully apply a hostile ability to a leader." },
  { name: "Untouchable", effect: "Successfully cancel a red fall with Clean Getaway." },
  { name: "Collateral Damage", effect: "Actually move backwards from another team's hostile ability." },
  { name: "Honest Living", effect: "Complete three consecutive normal turns without playing an ability, including reactive cards during those turns. Bank or Backup is allowed." },
  { name: "Mutual Destruction", effect: "Successfully affect another team with a hostile card, then later be affected by a hostile card from that same team." },
  { name: "The Long Way Round", effect: "Resolve an uncancelled red fall, then later climb a green ladder." },
  { name: "Double Six", effect: "Every member rolls a natural normal 6." },
  { name: "Ride or Die", effect: "Succeed at Back Me Up at least once with every member as backup." },
];
