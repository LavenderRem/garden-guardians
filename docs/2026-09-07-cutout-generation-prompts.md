# 角色拆分图集生成记录

日期：2026-09-07。使用内置 ImageGen，原始模型版本未返回。

植物参考：`art-source/characters/seedpod-shooter-idle-v1.png`。敌人参考：`art-source/characters/moss-gardener-idle-v1.png`。

首次生成的两张部件图集均为 RGB，背景棋盘格并非透明。植物透明编辑首次出现连接失败，重试后仍为 RGB。保留原稿于 `art-source/cutouts/drafts/`，不将其标为游戏可用透明素材。

以下保留实际英文提示原文。alpha 提示以对应的首次拆分图集为编辑目标。

## plant

```text
Use case: identity-preserve. Asset type: ONE transparent PNG cutout-animation PARTS ATLAS for the original seedpod shooter plant. The supplied image is the approved transparent character master.
Create a neatly organized 2-column by 2-row atlas on a wide landscape canvas, with FOUR separated pieces and wide completely transparent gutters. Each piece must sit entirely inside its own cell, no labels, no borders, no text, no swatches. Preserve the exact plant identity, orange pumpkin-like segmented seedpod, flared right-facing nozzle, green top crest, dark warm contour and teal foliage, hand-painted cartoon shading.
Cell top-left: the complete HEAD ONLY, including orange head, eyes, nozzle facing RIGHT and top crest. REMOVE all stem and bottom leaves. Close the underside of the head with matching shading; no hole, no flat chopped edge.
Cell top-right: the green curved STEM ONLY, fully painted with rounded overlapping ends at top and bottom, no head and no leaves. This piece is for flexible rotation.
Cell bottom-left: the complete dark teal-green LEAF ROSETTE BASE ONLY, no stem and no head. Fill the central formerly occluded area with natural overlapping green leaves, not a hole.
Cell bottom-right: ONE small brown-orange pointed SEED PROJECTILE matching the plant, horizontal long axis pointing RIGHT, subtle highlight and warm outline, no trail or glow. A simple seed with no face.
Render pieces at comfortable individually readable sizes within cells; head largest, rosette broad and low, stem narrow, projectile small. The background MUST be real alpha transparency (RGBA PNG, alpha 0 outside the pieces), preserving the input's transparent output treatment. No white fill, NO checkerboard pattern, no black painted background. There must be no touching between cells. Keep silhouettes crisp, no exterior shadows, no faded translucent body regions. All joint areas painted closed and slightly extended to support overlap when assembled. This is one parts atlas, not an assembled character or pose sheet.
```

## enemy

```text
Use case: identity-preserve. Asset type: ONE transparent PNG puppet-animation PARTS ATLAS for the original moss-hat gardener zombie. The supplied image is the approved transparent character master.
Make one landscape atlas with EIGHT fully separated parts, arranged in a regular FOUR COLUMN, TWO ROW grid, all eight cells equal size. Keep each part entirely within its own cell with wide transparent gutters. No labels, no text, no borders. Character faces LEFT. Preserve original exact moss hat with flower, comic gray-green face, cream floral gardening shirt, dusty plum overalls, dirty olive gloves, brown boots, terracotta pot, warm dark contour and hand-painted cartoon shading. No new character design.
TOP ROW left to right:
1. Neutral HEAD AND HAT only, whole moss hat and face with its original slightly open mouth, no torso or arms, include short rounded neck stub for overlap.
2. TORSO ONLY: floral shirt and plum overalls with complete filled shoulder and hip joint regions, bent/hunched silhouette, NO head, arms, legs or flowerpot. Fully paint previously hidden areas. Include no glove, boot or detached scraps.
3. FAR ARM: one full far-side arm from floral short sleeve through gray-green forearm to olive glove, extended down and LEFT, complete rounded shoulder cap, no torso or other limb.
4. NEAR ARM: one full near-side arm from floral short sleeve through gray-green forearm to olive glove, bent slightly down and LEFT, rounded shoulder cap, no torso or other limb.
BOTTOM ROW left to right:
5. FAR LEG: one full trouser leg from rounded hip cap to rolled cuff and brown boot, boot points LEFT, no other limb.
6. NEAR LEG: one full trouser leg from rounded hip cap to rolled cuff and brown boot, boot points LEFT, no other limb.
7. TERRACOTTA FLOWERPOT only, including its little curved hanging cord, same pot as reference, no body.
8. BITING HEAD AND HAT: identical in size, hat angle, eyes, neck stub and silhouette to neutral head cell 1, change ONLY lower jaw opened wider for a comic biting expression. Complete head, not floating jaw.
Use consistent line weight across parts and enough detail for later scaling down. Fill occluded surfaces so rotating limbs will not reveal gaps. Each part has a solid colored interior and clean alpha edge. Background MUST be truly transparent RGBA with alpha 0 outside the parts, like the supplied transparent source; NEVER draw a checkerboard, white mat, black mat or ground shadows. This is one eight-part cutout atlas, not eight assembled full characters.
```

## plantAlpha

```text
Use case: background-extraction. Edit ONLY the background of the supplied four-part plant cutout atlas. The white-gray checkerboard is baked into the RGB image. Remove ALL of that checkerboard and replace it with actual alpha transparency, RGBA PNG with alpha 0 outside all four parts. Keep the same four pieces, exact shapes, scale, colors, position and image framing: orange head upper left, green stem upper right, leaf base lower left, seed lower right. Do not redraw, relocate, resize or crop the pieces. No white matte, no black painted background, NO checkerboard illustration, no drop shadows. Fully opaque colored parts with clean anti-aliased alpha edges, truly transparent space between all parts. No additional objects or text.
```

## enemyAlpha

```text
Use case: background-extraction. The input is an eight-part gardener-zombie cutout atlas with a baked-in white-gray checkerboard. Deliver a usable transparent PNG atlas. Remove the ENTIRE checkerboard and replace it with real alpha transparency: RGBA PNG, alpha 0 outside all eight pieces, no black or white matte. Preserve the same eight identities, the same ordering and hand-painted colors: upper row neutral head, torso, far arm, near arm; lower row far leg, near leg, pot, biting head. Keep every part separate and fully colored inside. The input's bottom-right hat was clipped by the right image edge: reconstruct its tiny missing outer tip faithfully and fit the two head pieces inside their own areas with at least 35 pixels of clear transparent margin from image edges and neighboring parts. Leave transparent gutters. Do not add labels, cell lines, shadows, swatches, assembled characters or extra parts. Maintain all rounded joint caps and repaired occluded areas. Preserve the input poses. Deliver a real transparent image, not a drawing of transparency.
```
