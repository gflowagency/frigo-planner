const STORAGE_KEY = "frigo-pending-scans";

export type QueuedPantryItem = {
  barcode: string | null;
  name: string;
  brand: string | null;
  category: string;
  quantity: number;
  unit: string;
  imageUrl: string | null;
  nutriscore: string | null;
  ecoscore: string | null;
  nutrients: Record<string, number> | null;
  nutrientsEstimated: boolean;
};

export function readQueue(): QueuedPantryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedPantryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function enqueuePantryItem(item: QueuedPantryItem) {
  writeQueue([...readQueue(), item]);
}

/** Posts every queued item to the server, dropping each on success; stops at the first failure. */
export async function flushPantryQueue(): Promise<number> {
  let queue = readQueue();
  let flushed = 0;

  while (queue.length > 0) {
    const [next, ...rest] = queue;
    try {
      const res = await fetch("/api/pantry-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) break;
    } catch {
      break;
    }
    queue = rest;
    writeQueue(queue);
    flushed += 1;
  }

  return flushed;
}
