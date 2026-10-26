# Cartel Gil Rush visual assets

## Current tile artwork

The user supplied replacement shark, moogle, mushroom, chocobo, ladder and red-arrow SVG artwork in `src/assets/cartel-gil-rush/`. Five files arrived with `.png` extensions despite containing SVG markup; these were renamed to `.svg`, preserving their contents. Both Tiles & movement and Game quick references use the shared `tileArtwork.ts` mapping. Fatcat now uses the supplied `src/assets/cartel-gil-rush/fat-cat.svg` through the same shared mapping, including Board Overview and its legend. The finish crown remains a library icon because no crown asset was supplied. The mushroom placeholder is removed.

No new artwork was generated. The existing `dice.png` is still used by the Game mood banner. These bundled frontend images add no Firebase operations.

## Current mood artwork

The supplied `underdog.png`, `push-your-luck.png` and `workers-compensation.png` replace the Underdog Bonus, Push Your Luck and Workers' Compensation illustrations in both Game and Rulebook Board moods. `moodArtwork.ts` owns their shared mapping, including the existing `dice.png` for Lucky Sixes in both tabs. Existing image slots use `object-contain` and decorative empty alt text alongside the visible mood name. No mood retains Game's dice image. The three supplied PNGs add approximately 1.8 MB of ordinary bundled frontend images, with no Firebase reads, writes or Function calls. Source files are used unchanged; no artwork is generated.

## Reward artwork

`yan-horn.png` is an unchanged local copy of the user-selected [Yan Horn item icon](https://ffxiv.consolegameswiki.com/wiki/File:Yan_horn_icon1.png) ([original PNG](https://ffxiv.consolegameswiki.com/mediawiki/images/1/1d/Yan_horn_icon1.png)). Rewards renders the 128px source in a 56px slot beside the item name and advertised value. The approximately 25KB asset is bundled by Vite, with no runtime wiki request or Firebase operation. No artwork was generated.

## Historical generated artwork

The tile artwork below is superseded by the user's supplied SVGs; the dice asset remains in use. This section preserves original provenance only.

Generated with the built-in Image Gen tool for the user-supplied event screenshot. Files live in `src/assets/cartel-gil-rush/`. Original generated PNGs remain under the local Codex generated-images directory; project copies are cropped to their alpha bounds, proportionally resized and centred with transparent padding on 192 by 192 canvases for crisp 48 to 96px display. No generated UI screenshot is shipped as interface code.

## Prompts

Shared direction: one isolated icon matching the playful, softly shaded sticker illustrations in the supplied quick-reference screenshot. Smooth outline, transparent background, no text, no scenery, no extra objects. Square canvas with transparent margin.

- `shark.png`: chubby expressive blue shark leaping upward, white belly, open red mouth and tiny teeth.
- `chocobo.png`: cheerful golden-yellow chocobo chick head with crest, round dark eyes, orange beak and tiny wings.
- `moogle.png`: fluffy white moogle face with tiny ears, pink nose, cheerful closed eyes and round red pompom connected by a thin antenna.
- `mushroom.png`: chunky red-orange mushroom cap with white spots and cream stem.
- `ladder.png`: warm golden-brown wooden ladder with four rungs, slight three-quarter tilt.
- `dice.png`: white rounded die in three-quarter perspective, chunky black outline and dark pips; three short excitement marks near its upper-right.

The cat image reuses `src/assets/fatcathi.png`. Standard controls and the red downward arrow use existing Lucide icons. These local assets require no external image service or Firebase operation.
