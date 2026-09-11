"""将已确认的原创美术整理为游戏发行资源；保留所有源图。"""
from pathlib import Path
from PIL import Image
import shutil
import json

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/assets'
DEST.mkdir(parents=True, exist_ok=True)
generated = Path('C:/Users/180841/.codex/generated_images/01a079d3-9619-75a2-a021-00e94bc99ade')
sources = {
    'glow': 'exec-932d055d-854d-41bf-aab6-1d8ea5b21789.png',
    'wall': 'exec-4974d8ea-b507-467e-ae75-6f906a3585b0.png',
    'bomb': 'exec-a956408c-1653-46e2-8e3f-a5afc839302c.png',
}
report = {}
for name, filename in sources.items():
    source = ROOT / f'art-source/characters/{name}-idle-v1.png'
    if not source.exists():
        shutil.copy2(generated / filename, source)
    im = Image.open(source).convert('RGBA')
    assert im.getchannel('A').getextrema()[0] == 0, f'{name} 缺少透明背景'
    bbox = im.getchannel('A').getbbox()
    trimmed = im.crop(bbox)
    trimmed.thumbnail((216, 216), Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (256, 256))
    frame.alpha_composite(trimmed, ((256-trimmed.width)//2, 235-trimmed.height))
    frame.save(DEST / f'{name}.png', optimize=True)
    report[name] = {'source_size': im.size, 'alpha': im.getchannel('A').getextrema(), 'bounds': bbox, 'frame': [256, 256], 'ground_y': 235}

motion = ROOT / 'art-source/animations/motion-v1'
for source, name in [('seedpod-idle-sheet.png', 'shooter-idle.png'), ('seedpod-shoot-sheet.png', 'shooter-shoot.png'), ('gardener-walk-sheet.png', 'enemy-walk.png')]:
    shutil.copy2(motion / source, DEST / name)
Image.open(motion / 'seedpod-idle-sheet.png').crop((0,0,256,256)).save(DEST / 'shooter.png')
Image.open(ROOT / 'art-source/backgrounds/garden-empty-v1.png').resize((1600,900), Image.Resampling.LANCZOS).save(DEST / 'garden.webp', quality=90)
seed = Image.open(ROOT / 'art-source/cutouts/transparent-v1/seedpod/seed.png')
seed.thumbnail((64, 32), Image.Resampling.LANCZOS)
seed.save(DEST / 'seed.png')
(DEST / 'art-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
