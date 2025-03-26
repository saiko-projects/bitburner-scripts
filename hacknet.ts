/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL")
  ns.ui.openTail()

  // Search available tools
  let portHacks = []
  if (ns.fileExists("BruteSSH.exe"))  portHacks.push(ns.brutessh)
  if (ns.fileExists("FTPCrack.exe"))  portHacks.push(ns.ftpcrack)
  if (ns.fileExists("relaySMTP.exe")) portHacks.push(ns.relaysmtp)
  if (ns.fileExists("HTTPWorm.exe"))  portHacks.push(ns.httpworm)
  if (ns.fileExists("SQLInject.exe")) portHacks.push(ns.sqlinject)
  

  // Scan network
  const hosts = new Set(ns.scan())
  for (let host of hosts) {
    ns.scan(host).forEach(h => hosts.add(h))
  }
  hosts.delete("home")

  
  // Hack network
  let i = 0
  for (const host of hosts) {
    const hasRoot = ns.hasRootAccess(host)
    const ports = ns.getServerNumPortsRequired(host)

    if (!hasRoot) {
      if (portHacks.length < ports) continue

      for (let i = 0; i < ports; i++) {
        portHacks[i](host)
      }

      ns.nuke(host)
    }

    ns.print(`[${++i}/${hosts.size}] Rooted ${host}`)

    // ns.scriptKill("multithread.js", host)
    // ns.scriptKill("pump.js", host)

    // ns.scp(["multithread.js", "pump.js"], host)
    // ns.exec("multithread.js", host, {}, "pump.js", host)

  }

  if (hosts.size - i > 0)
    ns.print(`${hosts.size - i} network hosts are unavailable`)
}
