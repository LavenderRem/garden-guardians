# 第一组独立素材生成记录

日期：2026-09-07。方法：内置 ImageGen；具体模型版本未由工具返回。用户已确认初始美术方向。

实际英文提示原文如下，保留用于追溯。首次植物和敌人生成结果出现烘焙棋盘格，未采用为最终素材；分别通过背景提取编辑获得真实 alpha 文件。没有调用 CLI 或外部付费服务插件。

参考关系：plantIdle、enemyIdle、background 使用已确认的 `garden-style-board-v1.png`；plantAlpha、enemyAlpha 分别编辑对应的首次生成图片；motion 使用最终透明植物和敌人作为角色参考。

## plantIdle

```text
Use case: identity-preserve. Asset type: isolated transparent PNG master sprite for an original 2D lane defense game.
Input image is the approved art direction board. Extract and faithfully redraw ONLY the LARGE ORANGE PLANT from the lower left reference strip, removing everything else. Preserve its exact orange segmented seedpod head, small leaf crest, dark expressive eyes, right-facing flared trumpet-shaped seed nozzle, short curved green stem, and dark teal-green leaf rosette feet. Preserve the warm dark contour lines, hand-painted flat shading and subtle gouache texture. One full character only, facing RIGHT in its neutral idle pose, fixed side/three-quarter view matching the reference. No redesign. No text, swatches, ground, floor, scenery, cast shadow, other objects or duplicates. Genuinely transparent background with alpha, NOT a checkerboard illustration. Square image, consistent full-body framing, character occupies about 78 percent of canvas height, centered horizontally with the lowest leaf contact point at 88 percent canvas height; leave clear padding on every side. Crisp clean transparent silhouette, whole nozzle and every leaf within frame. The result is one standalone sprite, not a sheet.
```

## enemyIdle

```text
Use case: identity-preserve. Asset type: isolated transparent PNG master sprite for an original 2D lane defense game.
Input image is the approved art direction board. Extract and faithfully redraw ONLY the LARGE GARDENER ZOMBIE from the lower right reference strip, removing everything else. Preserve exact moss-covered floppy hat with small flowers, desaturated gray-green skin, asymmetrical comic eyes and open mouth, patched dusty plum gardening overalls over the pale floral short-sleeved shirt, oversized weathered gardening gloves, rolled trouser cuffs, brown boots and hanging terracotta pot. Preserve warm dark outlines, hand-painted flat shading and subtle gouache texture. Full character facing LEFT in the same hunched neutral walking-ready stance as the lower-right reference, arms slightly extended left. Exact design and proportions, no redesign. One character only. No text, swatches, ground, floor, scenery, cast shadow, other objects or duplicates. Genuinely transparent alpha background, NOT a painted checkerboard. Square image; full-body character about 82 percent of canvas height; hat and boots entirely inside frame, feet contact line at 90 percent canvas height, centered horizontally with comfortable padding. Crisp clean transparent silhouette. This is a single standalone sprite, not a sheet.
```

## background

```text
Use case: identity-preserve. Asset type: empty battlefield background for a 2D lane-defense game.
Use the upper garden battlefield of the approved input image as the ONLY style and environment reference. Produce a NEW CLEAN WIDE 16:9 garden battlefield image, ideally 1536x864 or 1920x1080, filling the entire canvas. Preserve the cozy warm hand-painted cartoon aesthetic, substantial warm outlines on border props, delicate gouache texture, sunlit muted yellow-green grass, small garden shed on the far left edge, wooden fence and gate at the far right, flower and stone borders at top and bottom. Fixed orthographic slightly overhead view, horizontal lane-defense layout, no cinematic perspective.
IMPORTANT: remove ALL plants, zombies, projectiles, labels, swatches, character studies, reference-strip panels and shadows of removed characters. NO text, NO UI, NO cards, NO health bars.
The gameplay lawn must be one clean uninterrupted rectangular flat grass area from approximately x=17% to x=88% of image width and y=16% to y=90% of height, all props kept outside this rectangle. Keep the grass quiet and low-contrast with only faint natural texture, NO painted grid, NO individual squares, NO paths crossing it; the actual exact 5x9 grid will be overlaid deterministically later. The top 12 percent should be relatively quiet fence/hedge for a future HUD. Visually pleasing rich decorative detail only around the outer edges, spacious readable center. Opaque full background, not transparent. No watermarks.
```

## plantAlpha

```text
Use case: background-extraction. Edit target: the supplied isolated orange plant image. Remove the entire white and pale-gray checkerboard background. It is currently baked into an RGB image and must be REMOVED, not redrawn. Output a PNG with an actual alpha transparency channel: every background pixel outside the plant silhouette must have alpha 0, and interior gaps between leaves must also be transparent. Keep only the original plant, preserving its exact colors, outlines, design, pose, proportions and framing. No ground shadow, no new shapes, no new background, no visible checkerboard, no white matte. Make the background genuinely transparent, not an illustration of transparency. Do not add text. Keep the entire plant intact.
```

## enemyAlpha

```text
Use case: background-extraction. Edit target: the supplied isolated gardener zombie image. Remove the entire white and pale-gray checkerboard background. It is currently baked into an RGB image and must be REMOVED, not redrawn. Output a PNG with an actual alpha transparency channel: every background pixel outside the character silhouette must have alpha 0, including gaps between arms, body and legs. Keep only the original zombie, preserving its exact colors, outlines, hat, costume, gloves, flowerpot, boots, pose, proportions and framing. No ground shadow, no new shapes, no new background, no visible checkerboard, no white matte. Make the background genuinely transparent, not an illustration of transparency. Do not add text. Keep the entire character intact.
```

## motion

```text
Use case: stylized-concept. Asset type: a basic motion key-pose REFERENCE BOARD for a Chinese-language 2D garden lane-defense game, NOT a production sprite atlas.
Two input images are identity references: image 1 is the orange seedpod shooter plant, image 2 is the moss-hat gardener zombie. Faithfully keep these exact identities, colors, costumes and painterly dark-outlined cartoon style. Do not add new characters or props.
Create one spacious landscape cream-paper board in two horizontal rows and four equal columns, eight complete full-body key poses total, no overlap, plenty of margins. Each row has a faint common baseline so the feet stay aligned. Consistent character scale within each row.
Top row: same plant facing RIGHT in 4 clearly distinct poses: neutral idle; wind-up with head pulled back left and stem bent; shot recoil with head kicked back slightly and upper leaf crest trailing while leaf base remains planted; recovered neutral pose. No projectile, no smoke, no effects obscuring silhouette. Show anatomical changes through stem bending and head rotation only, no extra eyes or nozzle.
Bottom row: same zombie facing LEFT in 4 distinct poses: leftward step with left foot forward; passing position legs nearly together body slightly higher; opposite stride right foot forward; planted feet and torso leaning forward with mouth wide open in a biting pose. Show real changes in leg and arm angles, keep terracotta pot attached at belt, same moss hat and floral shirt and plum overalls. Full boots, hands and hat inside each cell.
Labels must be small clear Simplified Chinese only, exact text: overall title "基础动作参考", top row labels "待机" "蓄力" "后坐" "复位", bottom row labels "迈步" "经过" "换步" "啃食". Small footer "关键姿态示意，非最终帧图集". Do not add any other text, numbers, watermark or game UI.
Warm gouache-like 2D illustration with crisp silhouettes. Flat neutral light background, no scenery. Prioritize pose difference and preservation of identity over ornamental detail.
```
