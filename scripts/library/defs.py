from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Entry:
    src: Optional[str]  # free-exercise-db id, None = own entry without photos
    name: str
    steps: List[str]
    tip: str
    seed: Optional[str] = None  # existing seed exercise id in the app
    alias: List[str] = field(default_factory=list)
    cat: Optional[str] = None  # override app category
    mus: Optional[str] = None  # override coarse muscle group
    primary: List[str] = field(default_factory=list)  # for own entries (German detail muscles)
    secondary: List[str] = field(default_factory=list)
    level: Optional[str] = None


def E(src, name, steps, tip, seed=None, alias=None, cat=None, mus=None, primary=None, secondary=None, level=None):
    return Entry(
        src=src,
        name=name,
        steps=[s.strip() for s in steps.split("|") if s.strip()],
        tip=tip,
        seed=seed,
        alias=list(alias or []),
        cat=cat,
        mus=mus,
        primary=list(primary or []),
        secondary=list(secondary or []),
        level=level,
    )
