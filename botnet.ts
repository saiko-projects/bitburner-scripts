import { getServers, ControllerResult, Message } from "utils.ts"

const BOTSCRIPT = "bot.ts"
const RAM = 2048
const PREFIX = "@"
const NAMES = [
  "alpha",
  "bravo",
  "charlie",
  "delta",
  "echo",
  "foxfort",
  "golf",
  "hotel",
  "india",
  "juliett",
  "kilo",
  "lima",
  "mike",
  "november",
  "oscar",
  "papa",
  "quebec",
  "romeo",
  "sierra",
  "tango",
  "uniform",
  "victor",
  "whiskey",
  "xray",
  "yankee",
  "zulu"
]

type ServerType = "hacked" | "purchased"
type Process = {
  type: ServerType
  target: string
  bot: string
}
type PreparedServer = {
  type: ServerType
  hostname: string
  threads: number
}

export async function main(ns: NS) {
  const sizeBotScript = ns.getScriptRam(BOTSCRIPT)
  const maxram = ns.args[0] as number || RAM

  ns.disableLog("ALL")

  const p = ns.getPlayer()

  // Prepare servers
  const prepared = new Map<string, PreparedServer>()
  for (let i = 0; i < NAMES.length; i++) {
    const serverName = PREFIX + NAMES[i]
    if (i + 1 > ns.getPurchasedServerLimit()) break;

    if (!ns.serverExists(serverName)) {
      const cost = ns.getPurchasedServerCost(maxram)
      if (p.money < cost) {
        ns.tprint(`Not enought money for purchase server ${serverName} (SKIP)`)
        continue
      } else ns.purchaseServer(serverName, maxram)
    } else if (ns.getServerMaxRam(serverName) < maxram) {
      const cost = ns.getPurchasedServerUpgradeCost(serverName, maxram)
      if (p.money < cost)
        ns.tprint(`Not enought money for upgrade server ${serverName} (SKIP)`)
      else ns.upgradePurchasedServer(serverName, maxram)
    }
    ns.tprint(`Prepared server: ${serverName} ${ns.formatRam(ns.getServerMaxRam(serverName))}`)

    ns.scp([BOTSCRIPT, "utils.ts"], serverName)

    prepared.set(serverName, {
      type: "purchased",
      hostname: serverName,
      threads: Math.floor(ns.getServerMaxRam(serverName) / sizeBotScript)
    })
  }


  const hosts = getServers(ns)
    .filter(h => ns.hasRootAccess(h) && ns.getServerMaxMoney(h) != 0)
  let i = -1;
  let offset = 0
  const nextHost = () => hosts[(i = (i + 1) % hosts.length)]


  hosts.forEach(h => {
    const maxRam = ns.getServerMaxRam(h)
    if (maxRam == 0) return

    ns.scp([BOTSCRIPT, "utils.ts"], h)
    prepared.set(h, {
      type: "hacked",
      hostname: h,
      threads: (maxRam - ns.getServerUsedRam(h)) / sizeBotScript
    })
  })


  ns.scriptKill("botcontroller.ts", ns.getHostname())
  const ports = new Map<string, NetscriptPort>()
  for (const [_, server] of prepared) {

    const pid = ns.run("botcontroller.ts", {}, server.hostname, server.threads)
    if (pid == 0) {
      prepared.delete(server.hostname)
      return ns.tprint("Error to run Bot Controller on " + server.hostname)
    }

    ports.set(server.hostname, ns.getPortHandle(pid))
    ns.print(`Controller started for ${server.hostname}`)
  }


  const processes = new Map<string, Process>()

  // Recovery processes
  // prepared.forEach(server => {
  //   const p = ns.ps(server.hostname)
  //   if (!p[0] || p[0].filename !== "bot.ts") return
  //   const port = ns.getPortHandle(p[0].pid)
  //   const msg = port.peek() as Message
  //   if (msg.action != "ready")
  //     processes.add(p[0].args[0])
  // })

  while (true) {
    for (let [server, port] of ports) {
      if (port.empty()) continue

      let res = port.read() as ControllerResult

      switch (res.action) {
        case "ready":
          ns.tprint(
            `[${res.bot}] Controller ready`
          )
          break
        case "hack":
        case "weaken":
        case "grow":
          ns.print(
            `[${res.bot}] Result command *${res.action}* for ${res.host} (threads: ${res.threads}) ${res.time / 1000 | 0}s`
          )

          if (processes.has(server))
            processes.delete(server)

          break
        case "error":
          if (processes.has(server))
            processes.delete(server)

          ns.tprint(`[${res.bot}] ${res.msg}`)
          break
      }

      const preparedType = prepared.get(server)!.type

      let host: string | null = null
      switch(preparedType) {
        case "hacked":
          host = server
          if (processes.has(server)) continue
          break
        case "purchased":
          let lastHost = nextHost()
          host = lastHost
          while ([...processes.values()].find(v => v.type == "purchased" && v.target == host)) {
            host = nextHost()
            if (host == lastHost) break
          }
          break
      }
      if (!host) continue

      processes.set(server, {
        target: host,
        bot: server,
        type: preparedType
      })
      port.write(host)
      ns.print(`[${server}] Recived next host "${host}" (processes: ${processes.size})`)

    }
    
    await ns.sleep(1000)
  }

}
