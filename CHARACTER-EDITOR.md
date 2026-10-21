# 3D character editor

Open Character Builder → Equipment (or Identity → Create 3D map icon).
Choose race, clothing, colours, body proportions and facial features. The searchable
wardrobe uses the bundled item databases to generate cosmetic equipment models;
it does not grant inventory items or change combat statistics.

Drag the preview to rotate, or select Front view. Use as map icon saves that view,
then Save & return to map. Existing character data preserves the miniature settings.

Map miniatures support idle, walking, general actions, sword attacks, bow attacks
and spell casting. Preview buttons in the editor spend no gameplay resources.
Reduced motion and unavailable WebGL retain static map icons. Remote effects carry
animation selections, but live multiplayer animation has not been manually verified.

Run the regression suite with Node.js:

    node --test tests/*.test.cjs

The Asset-pack weapon selector includes 36 imported Kickin It Studios meshes; usage terms are in assets/weapon-pack/LICENSE.txt. Weapons use an outward grip. Four alternate idle poses cycle between actions, and confirmed natural-20 attack hits trigger extended sword, bow, or spell effects. Preview buttons demonstrate these without spending resources. The suite now contains 52 checks.
