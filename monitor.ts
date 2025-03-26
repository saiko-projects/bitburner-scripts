import { getServers } from "utils.ts"
export async function main(ns: NS) {
  ns.disableLog("ALL")
  
  const servers = getServers(ns).sort()
  const width = servers.reduce((p, c) => p < c.length ? c.length : p, 0)

  while(true) {
    servers.forEach(host => {
      if (!ns.hasRootAccess(host)) return;
      if (ns.getServerMaxMoney(host) == 0) return;
      
      const m = ns.formatNumber(ns.getServerMoneyAvailable(host), 1)
      const mm = ns.formatNumber(ns.getServerMaxMoney(host), 1)
      const g = ns.formatNumber(
        ns.fileExists("Formulas.exe")
          ? ns.formulas.hacking.growAmount(
              ns.getServer(host),
              ns.getPlayer(),
              ns.getServerMaxRam(host) / ns.getScriptRam("bot.ts")
            )
          : 0
      , 1).padStart(4, "0")

      const s = ns.formatNumber(ns.getServerSecurityLevel(host), 0).padStart(2, "0")
      const ms = ns.formatNumber(ns.getServerMinSecurityLevel(host), 0).padStart(2, "0")
      
      const h = ns.getPlayer().skills.hacking
      const rh = ns.getServerRequiredHackingLevel(host)

      ns.print(`${`[${host}]`.padEnd(width, " ")}S=${s}/${ms}\tM=${m}/${mm}+${g}\tH=${h}/${rh}`)
    })
    ns.print(new Date().toLocaleString("RU"))
    await ns.sleep(250);
    ns.clearLog()
  }
}
