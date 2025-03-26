
export function getServers(ns: NS) {
  const hosts = new Set(ns.scan("home"))
  for (const host of hosts) ns.scan(host).forEach(h => hosts.add(h))
  return [...hosts]
}

export function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

type Actions = "ready" | "weaken" | "grow" | "hack" | "error"

export type Message = {
  action: Actions,
  threads: number,
  time?: number
}

export type ControllerResult = {
  action: "weaken" | "grow" | "hack",
  threads: number,
  host: string,
  time: number,
  bot: string
} | {
  action: "ready",
  bot: string
} | {
  action: "error"
  message: string
  bot: string
  msg: string
  host?: string
}

export function serverSegmentation(ns: NS, hosts: string[]) {
  const map = new Map<number, string[]>()
  for (const host of hosts) {
    const n = ns.getServerNumPortsRequired(host)
    map.set(n, [...(map.get(n) || []), host])
  }
  return map
}
