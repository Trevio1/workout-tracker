"""Builds src/data/library.json (and optionally the photos) from the curated entries.

Usage: python3 build.py <path to free-exercise-db exercises.json> [--images <download dir>]
Source: https://github.com/yuhonas/free-exercise-db (Unlicense)
"""
import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))

from entries_barbell import ENTRIES as BARBELL  # noqa: E402
from entries_dumbbell import ENTRIES as DUMBBELL  # noqa: E402
from entries_cable import ENTRIES as CABLE  # noqa: E402
from entries_machine import ENTRIES as MACHINE  # noqa: E402
from entries_bodyweight import ENTRIES as BODYWEIGHT  # noqa: E402
from entries_extra import ENTRIES as EXTRA  # noqa: E402

ALL = BARBELL + DUMBBELL + CABLE + MACHINE + BODYWEIGHT + EXTRA
IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"

EQUIP_TO_CAT = {
    "barbell": "barbell", "e-z curl bar": "barbell", "dumbbell": "dumbbell", "cable": "cable",
    "machine": "machine", "body only": "bodyweight", None: "bodyweight", "kettlebells": "kettlebell",
    "other": "other",
}
MUSCLE_DETAIL = {
    "chest": "Brust", "lats": "Latissimus", "middle back": "Oberer Rücken", "lower back": "Unterer Rücken",
    "shoulders": "Schultern", "biceps": "Bizeps", "triceps": "Trizeps", "forearms": "Unterarme",
    "quadriceps": "Quadrizeps", "hamstrings": "Beinbeuger", "glutes": "Gesäß", "calves": "Waden",
    "abdominals": "Bauch", "traps": "Trapez", "adductors": "Adduktoren", "abductors": "Abduktoren", "neck": "Nacken",
}
MUSCLE_GROUP = {
    "chest": "Brust", "lats": "Rücken", "middle back": "Rücken", "lower back": "Rücken", "shoulders": "Schultern",
    "biceps": "Bizeps", "triceps": "Trizeps", "forearms": "Unterarme", "quadriceps": "Beine", "hamstrings": "Beine",
    "glutes": "Po", "calves": "Waden", "abdominals": "Bauch", "traps": "Nacken", "adductors": "Beine",
    "abductors": "Po", "neck": "Nacken",
}
LEVEL = {"beginner": "Einsteiger", "intermediate": "Fortgeschritten", "expert": "Profi"}
EQUIP_LABEL = {
    "barbell": "Langhantel", "e-z curl bar": "SZ-Stange", "dumbbell": "Kurzhantel", "cable": "Kabelzug",
    "machine": "Maschine", "body only": "Körpergewicht", "kettlebells": "Kettlebell", "other": "Sonstiges",
}


def slug(s: str) -> str:
    s = s.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def seed_ids() -> set:
    text = (ROOT / "src" / "seed.ts").read_text()
    names = re.findall(r"\['([^']+)', '[a-z]+', '[^']+'\]", text)
    return {f"ex-{slug(n)}" for n in names}


def main() -> None:
    src_path = Path(sys.argv[1])
    img_dir = Path(sys.argv[sys.argv.index("--images") + 1]) if "--images" in sys.argv else None
    source = {x["id"]: x for x in json.loads(src_path.read_text())}

    errors = []
    out = []
    seen_names = {}
    seen_src = set()
    seeds = seed_ids()
    used_seeds = set()

    for e in ALL:
        s = source.get(e.src) if e.src else None
        if e.src and not s:
            errors.append(f"unknown source id {e.src}")
            continue
        if e.src and e.src in seen_src:
            errors.append(f"duplicate source {e.src}")
        seen_src.add(e.src)
        key = slug(e.name)
        if key in seen_names:
            errors.append(f"duplicate name {e.name}")
        seen_names[key] = e.name
        if e.seed:
            if e.seed not in seeds:
                errors.append(f"unknown seed {e.seed} ({e.name})")
            used_seeds.add(e.seed)
        if len(e.steps) < 2 or not e.tip:
            errors.append(f"missing text for {e.name}")

        if s:
            cat = e.cat or ("cardio" if s["category"] == "cardio" else EQUIP_TO_CAT.get(s.get("equipment"), "other"))
            p0 = s["primaryMuscles"][0] if s["primaryMuscles"] else ""
            muscle = e.mus or ("Cardio" if cat == "cardio" else MUSCLE_GROUP.get(p0, "Sonstiges"))
            primary = [MUSCLE_DETAIL.get(m, m) for m in s["primaryMuscles"]]
            secondary = [MUSCLE_DETAIL.get(m, m) for m in s["secondaryMuscles"]]
            level = LEVEL.get(s.get("level"), "")
            equipment = EQUIP_LABEL.get(s.get("equipment"), "Körpergewicht")
            images = len(s.get("images") or [])
        else:
            cat = e.cat or "bodyweight"
            muscle = e.mus or "Sonstiges"
            primary, secondary = e.primary, e.secondary
            level = LEVEL.get(e.level or "", "")
            equipment = {"machine": "Maschine", "bodyweight": "Körpergewicht"}.get(cat, "Sonstiges")
            images = 0

        lib_id = f"lib-{slug(e.src or e.name)}"
        item = {
            "id": lib_id,
            "name": e.name,
            "category": cat,
            "muscle": muscle,
            "primary": primary,
            "secondary": secondary,
            "level": level,
            "equipment": equipment,
            "steps": e.steps,
            "tip": e.tip,
            "aliases": e.alias,
            "images": min(images, 2),
        }
        if e.seed:
            item["seed"] = e.seed
        if e.src:
            item["src"] = e.src
        out.append(item)

    missing = sorted(seeds - used_seeds)
    if missing:
        errors.append(f"seed exercises without library entry: {missing}")
    if errors:
        print("\n".join(errors))
        sys.exit(1)

    out.sort(key=lambda x: x["name"].lower())
    target = ROOT / "src" / "data" / "library.json"
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    with_img = sum(1 for x in out if x["images"])
    print(f"{len(out)} exercises ({with_img} with photos) -> {target.relative_to(ROOT)}")

    if img_dir:
        public = ROOT / "public" / "ex"
        for x in out:
            if not x["images"]:
                continue
            for i in range(x["images"]):
                dest = public / x["id"] / f"{i}.jpg"
                if dest.exists():
                    continue
                raw = img_dir / f"{x['id']}-{i}.jpg"
                if not raw.exists():
                    urllib.request.urlretrieve(f"{IMG_BASE}{x['src']}/{i}.jpg", raw)
                dest.parent.mkdir(parents=True, exist_ok=True)
                subprocess.run(
                    ["sips", "-Z", "480", "-s", "format", "jpeg", "-s", "formatOptions", "68", str(raw), "--out", str(dest)],
                    check=True, capture_output=True,
                )
        print("images ready in public/ex")


if __name__ == "__main__":
    main()
