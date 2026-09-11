"""用 NumPy 与标准库合成《庭院守卫》的原创配乐和音效。"""

from pathlib import Path
import argparse
import hashlib
import wave

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "assets" / "audio"
SAMPLE_RATE = 22050
SEED = 20260911
RNG = np.random.default_rng(SEED)
DETAILS = {}


def envelope(size, attack=0.006, release=0.055):
    result = np.ones(size)
    a = min(int(attack * SAMPLE_RATE), size // 2)
    r = min(int(release * SAMPLE_RATE), size // 2)
    if a:
        result[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r:
        result[-r:] = np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return result


def tone(midi, duration, kind="pluck"):
    t = np.arange(round(duration * SAMPLE_RATE)) / SAMPLE_RATE
    hz = 440 * 2 ** ((midi - 69) / 12)
    phase = 2 * np.pi * hz * t
    if kind == "bell":
        signal = (np.sin(phase) + 0.22 * np.sin(phase * 2)
                  + 0.08 * np.sin(phase * 3)) * np.exp(-t * 5)
    elif kind == "pad":
        signal = (np.sin(phase) + 0.12 * np.sin(phase * 2)) * 0.8
    elif kind == "bass":
        signal = (np.sin(phase) + 0.10 * np.sin(phase * 2)) * np.exp(-t * 1.6)
    else:
        signal = (np.sin(phase) + 0.23 * np.sin(phase * 2)
                  + 0.07 * np.sin(phase * 3)) * np.exp(-t * 7)
    return signal * envelope(len(t), 0.009 if kind != "pad" else 0.09,
                             min(0.14, duration / 3))


def noise(duration, smooth=12):
    signal = RNG.normal(0, 1, round(duration * SAMPLE_RATE))
    return np.convolve(signal, np.ones(smooth) / smooth, mode="same")


def sweep(start, end, duration):
    t = np.arange(round(duration * SAMPLE_RATE)) / SAMPLE_RATE
    phase = 2 * np.pi * (start * t + (end - start) * t * t / (2 * duration))
    return np.sin(phase) * np.exp(-t / duration * 3) * envelope(len(t))


def mix(track, sound, seconds, gain=1.0, loop=False):
    start = round(seconds * SAMPLE_RATE)
    if loop:
        indices = (np.arange(len(sound)) + start) % len(track)
        np.add.at(track, indices, sound * gain)
    else:
        count = min(len(sound), len(track) - start)
        if count > 0:
            track[start:start + count] += sound[:count] * gain


def percussion(duration, kind):
    if kind == "kick":
        return sweep(125, 52, duration) * 0.65
    signal = noise(duration, 8 if kind == "brush" else 20)
    t = np.arange(len(signal)) / SAMPLE_RATE
    return signal * np.exp(-t * (45 if kind == "brush" else 25)) * envelope(len(t), 0.003, 0.02)


def music(rush=False):
    beat = 60 / (92 if rush else 84)
    track = np.zeros(round(32 * beat * SAMPLE_RATE))
    # 自编的八小节和声、旋律及节奏；数字是 MIDI 音高，不使用外部采样。
    chords = [(48, 52, 55, 59), (45, 48, 52, 55), (53, 57, 60, 64),
              (55, 59, 62, 65), (48, 52, 55, 62), (45, 48, 52, 59),
              (50, 53, 57, 60), (55, 59, 62, 64)]
    melody = [
        [(0, 76, .75), (1, 79, .5), (1.75, 74, .75), (3, 72, .6)],
        [(.5, 72, .5), (1.25, 76, .75), (2.5, 71, .5), (3.25, 69, .5)],
        [(0, 77, .5), (.75, 76, .5), (1.5, 72, 1), (3, 69, .65)],
        [(.25, 71, .6), (1.25, 74, .5), (2, 79, .6), (3.25, 77, .5)],
        [(0, 76, .5), (.75, 74, .5), (1.5, 79, 1), (3, 83, .65)],
        [(.25, 81, .5), (1, 76, .8), (2.25, 72, .5), (3.25, 71, .5)],
        [(0, 74, .6), (1, 77, .5), (1.75, 76, .5), (2.5, 72, 1)],
        [(.25, 71, .5), (1, 74, .5), (2, 69, .6), (3, 71, .65)],
    ]
    for bar, chord in enumerate(chords):
        origin = bar * 4 * beat
        for note in chord[1:]:
            mix(track, tone(note + 12, beat * 3.8, "pad"), origin, .032, True)
        for step, note in enumerate([chord[0], chord[2] - 12, chord[0], chord[2] - 12]):
            mix(track, tone(note, beat * .82, "bass"), origin + step * beat, .17, True)
        for step in range(8):
            note = chord[(step + bar % 2) % 4] + 12
            mix(track, tone(note, beat * .68), origin + (step / 2 + .08) * beat,
                .065 if rush else .045, True)
        for offset, note, length in melody[bar]:
            if rush:
                offset = round(offset * 2) / 2
                note += 12 if bar in (3, 7) else 0
            mix(track, tone(note, beat * length + .18, "bell"),
                origin + offset * beat, .15 if rush else .14, True)
        for step in range(4):
            mix(track, percussion(.18, "kick"), origin + step * beat,
                .12 if rush else .065, True)
            mix(track, percussion(.10, "brush"), origin + (step + .5) * beat,
                .13 if rush else .085, True)
        if rush:
            for offset in (1, 3):
                mix(track, percussion(.14, "wood"), origin + offset * beat, .19, True)
    # 循环延迟将末尾混响自然接回开头，避免在边界截断尾音。
    dry = track.copy()
    for delay, gain in ((beat * .75, .14), (beat * 1.5, .07), (beat * 2.25, .035)):
        track += np.roll(dry, round(delay * SAMPLE_RATE)) * gain
    return track


def sequence(notes, duration, spacing, kind="bell"):
    track = np.zeros(round(duration * SAMPLE_RATE))
    for i, note in enumerate(notes):
        mix(track, tone(note, min(.62, duration - i * spacing), kind), i * spacing, .6)
    return track


def write(name, signal, description, peak=.55, loop=False):
    signal = np.tanh(signal)
    if not loop:
        signal *= envelope(len(signal), .004, min(.06, len(signal) / SAMPLE_RATE / 4))
    maximum = np.max(np.abs(signal))
    if maximum:
        signal *= peak / maximum
    pcm = np.rint(signal * 32767).astype("<i2")
    with wave.open(str(OUTPUT / name), "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(SAMPLE_RATE)
        stream.writeframes(pcm.tobytes())
    DETAILS[name] = (description, loop)


def generate():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    write("music-garden.wav", music(), "庭院：84 BPM，钟琴主旋律、拨弦分解和弦与柔和低音", .53, True)
    write("music-rush.wav", music(True), "进攻：92 BPM，增加木质节拍并变化高音应答", .56, True)
    write("win.wav", sequence([72, 76, 79, 83, 84], 2.1, .22), "胜利：明亮上行五音短乐", .52)
    write("lose.wav", sequence([71, 67, 64, 60], 1.8, .27, "pad"), "失败：柔和下行四音短乐", .43)
    write("select.wav", tone(81, .15), "选择：轻木琴单音", .24)
    track = sequence([55, 67], .30, .07, "pluck")
    mix(track, percussion(.16, "wood"), 0, .3)
    write("plant.wav", track, "种植：泥土轻响与发芽上行音", .38)
    write("collect.wav", sequence([79, 84, 88], .55, .09), "采集：三颗清亮音符", .40)
    write("shoot.wav", sweep(680, 270, .16), "发射：短促圆润滑音", .22)
    track = sweep(240, 95, .16)
    mix(track, percussion(.09, "wood"), 0, .65)
    write("hit.wav", track, "命中：低频轻敲", .28)
    track = np.zeros(round(.23 * SAMPLE_RATE))
    for offset in (0, .095):
        mix(track, percussion(.10, "wood"), offset, .9)
        mix(track, sweep(150, 80, .11), offset, .22)
    write("bite.wav", track, "啃咬：两下柔化沙沙声", .25)
    write("remove.wav", sweep(460, 150, .28), "铲除：向下滑落音", .30)
    track = sweep(100, 34, .65) * .7
    burst = noise(.65, 24) * np.exp(-np.arange(len(track)) / SAMPLE_RATE * 8)
    track += burst * 1.3
    write("explosion.wav", track, "爆炸：低沉蓬松气团，削弱尖锐高频", .46)
    track = sequence([60, 67, 72, 79], .95, .12)
    mix(track, sweep(180, 600, .65), 0, .17)
    write("rescue.wav", track, "救场：四音上行与温和扫频", .47)
    write("wave.wav", sequence([67, 67, 74], 1.1, .22, "pad"), "新波次：三音提示", .40)
    write("pause.wav", sequence([76, 72], .40, .11), "暂停：轻柔下降两音", .25)
    write("error.wav", sequence([60, 59], .32, .10, "pluck"), "操作无效：克制的相邻低音", .24)
    t = np.arange(round(.23 * SAMPLE_RATE)) / SAMPLE_RATE
    track = sum(gain * np.sin(2 * np.pi * 860 * ratio * t) * np.exp(-t * decay)
                for ratio, gain, decay in ((1, .65, 20), (1.47, .23, 28), (2.13, .10, 40)))
    write("armor-hit.wav", track, "装甲命中：短衰减非整数泛音形成的柔和金属轻碰", .26)
    track = np.zeros(round(.58 * SAMPLE_RATE))
    for i, (offset, note) in enumerate(((0, 72), (.08, 67), (.17, 62), (.28, 55))):
        mix(track, tone(note, .24), offset, .5 * .65 ** i)
    scatter = noise(.58, 26) * np.exp(-np.arange(len(track)) / SAMPLE_RATE * 10)
    track += scatter * .14
    write("defeat.wav", track, "敌人死亡：逐渐变轻的四次下落拨音与柔和散落声", .32)


def verify():
    expected = ["music-garden", "music-rush", "win", "lose", "select", "plant",
                "collect", "shoot", "hit", "bite", "remove", "explosion",
                "rescue", "wave", "pause", "error", "armor-hit", "defeat"]
    rows = []
    music_bytes = 0
    for stem in expected:
        path = OUTPUT / (stem + ".wav")
        with wave.open(str(path), "rb") as stream:
            assert (stream.getnchannels(), stream.getsampwidth(), stream.getframerate()) == (1, 2, SAMPLE_RATE)
            frames = stream.getnframes()
            decoded = np.frombuffer(stream.readframes(frames), dtype="<i2").astype(float) / 32768
        assert frames == len(decoded) and frames > 0
        peak = float(np.max(np.abs(decoded)))
        rms = float(np.sqrt(np.mean(decoded ** 2)))
        seam = float(abs(decoded[-1] - decoded[0]))
        assert 0 < peak < .57, (path.name, peak)
        assert np.all(np.isfinite(decoded))
        if stem.startswith("music-"):
            assert 20 <= frames / SAMPLE_RATE <= 32
            # 相邻采样允许正常波形斜率；1% 满幅限制已低于附近正常振动。
            assert seam < .01, (path.name, seam)
            # 接缝一阶差分也必须连续，防止跳变形成点击声。
            derivative = abs((decoded[1] - decoded[0]) - (decoded[-1] - decoded[-2]))
            assert derivative < .005, (path.name, derivative)
            music_bytes += path.stat().st_size
        else:
            assert decoded[0] == 0 and decoded[-1] == 0
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        rows.append((path.name, frames, frames / SAMPLE_RATE, peak, rms, seam, path.stat().st_size, digest))
    assert music_bytes < 5_000_000
    return rows, music_bytes


def report(rows, music_bytes):
    lines = ["# 原创游戏音频交付清单", "", "日期：2026-09-11。用于《庭院守卫》可玩首版。", "",
             "## 创作方式", "",
             "全部声音由本项目脚本使用正弦波、谐波叠加、包络、固定种子的噪声和循环延迟合成。八小节主旋律、和声配置与节奏为本次独立编排，未读取现成歌曲、外部音源或采样，也未调用音频服务。两段配乐分别为 84 BPM 与 92 BPM 的 4/4 拍循环，采用温暖的钟琴、拨弦、柔和低音和轻打击乐。进攻配乐沿用庭院主题并加快节奏、增加高音变化。", "",
             "所有文件为单声道、22050 Hz、16-bit PCM WAV，可直接由浏览器解码。音量已留出混音余量；播放时仍建议让配乐低于事件音效。短音效起止均施加平滑包络；配乐采用尾音循环回卷和循环延迟，循环时无需额外淡入淡出。", "",
             "## 文件与实际检查", "",
             "路径统一为 `public/assets/audio/`，网页加载路径为 `/assets/audio/文件名`。", "",
             "| 文件 | 用途 | 时长（秒） | 采样数 | 峰值 | RMS | 首尾差值 | 大小（字节） |",
             "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for name, frames, duration, peak, rms, seam, size, digest in rows:
        description = DETAILS.get(name, ("", False))[0]
        lines.append(f"| `{name}` | {description} | {duration:.3f} | {frames} | {peak:.5f} | {rms:.5f} | {seam:.6f} | {size} |")
    lines += ["", f"两段配乐合计 {music_bytes:,} 字节（{music_bytes / 1_000_000:.2f} MB），低于 5 MB。", "",
              f"程序实际重新打开并完整解码全部 {len(rows)} 个 WAV，确认声道、采样率、位深和样本数一致；无非有限样本、无过载。两段配乐的首尾相邻采样差均小于满幅的 1%，边界一阶差分差均小于 0.005；{len(rows) - 2} 段短声音的起止采样均为零。首尾相邻采样可以存在正常波形斜率，并不要求两个采样数值完全相同。该检查验证接缝波形连续性，未替代人工听感评估；本次未进行人工试听。", "",
              "## 复现", "", "仅依赖 Python、NumPy 与标准库 `wave`。随机种子固定为 `20260911`。在项目目录执行：", "", "```powershell",
              "& 'C:/Users/180841/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' scripts/create_audio.py",
              "```", "", "加上 `--verify-only` 可只检查已有发行文件，不重新生成。生成模式会同时更新此清单。", "",
              "## 文件指纹", "", "用于检查复现结果（SHA-256）：", "", "```text"]
    lines += [f"{name}  {digest}" for name, *_, digest in rows]
    lines += ["```", ""]
    (ROOT / "docs" / "2026-09-11-audio.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-only", action="store_true", help="仅检查已生成的 WAV")
    args = parser.parse_args()
    if not args.verify_only:
        generate()
    rows, music_bytes = verify()
    if not args.verify_only:
        report(rows, music_bytes)
    for name, frames, duration, peak, rms, seam, size, digest in rows:
        print(f"{name}: {duration:.3f}s, peak={peak:.5f}, rms={rms:.5f}, seam={seam:.6f}, bytes={size}")
    print(f"PASS: {len(rows)} WAV files; music total {music_bytes} bytes")
