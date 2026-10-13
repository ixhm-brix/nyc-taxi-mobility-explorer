from __future__ import annotations

import numpy as np
import pandas as pd

AIRPORT_ZONES = {1, 132, 138}

DISTANCE_BANDS = [(1, "Under 1 mi", 0, 1), (2, "1-2 mi", 1, 2), (3, "2-5 mi", 2, 5), (4, "5-10 mi", 5, 10), (5, "10-20 mi", 10, 20), (6, "20+ mi", 20, 1000)]