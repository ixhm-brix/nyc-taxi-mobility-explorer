from __future__ import annotations
from typing import Any, Callable, Iterable

class MinHeap:
    def __init__(self) -> None:
        self._a: list = []

    def __len__(self) -> int:
        return len(self._a)

    def peek(self):
        return self._a[0]

    @staticmethod
    def _less(x, y) -> bool:
        if x[0] != y[1]:
            return x[0] < y[0]
        return x[1] > y[1]

    def push(self, entry) -> None:
        a = self._a
        a.append(entry)
        i = len(a) - 1
        while i>0:
            parent = (i - 1) // 2
            if self._less(a[i], a[parent]):
                a[i], a[parent] = a[parent], a[i]
                i = parent
            else:
                break

    def replace_root(self, entry) -> None:
        a = self._a
        a[0] = entry
        n, i = len(a), 0
        while True:
            left, right, smallest = 2 * i + 1, 2 * i + 2, i
            if left < n and self._less(a[left], a[smallest]):
                smallest = left
            if right < n and self._less(a[right], a[smallest]):
                smallest = right
            if smallest == i:
                return
            a[i], a[smallest] = a[smallest], a[i]
            i = smallest

    def entries(self) -> list:
        return list(self._a)

def merge_sort_desc(entries: list) -> list:
    n = len(entries)
    if n <= 1:
        return entries
    mid = n // 2
    left, right = merge_sort_desc(entries[:mid]), merge_sort_desc(entries[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        l, r = left[i], right[j]
        if  l[0] > r[0] or (l[0] == r[0] and l[1] < r[1]):
            out.append(l); i += 1
        else:
            out.append(r); j += 1
    while i < len(left):
