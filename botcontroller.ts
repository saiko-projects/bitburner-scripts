import { ControllerResult, Message } from "utils.ts"


export async function main(ns: NS) {
  ns.disableLog("sleep")
  const prepared = {
    hostname: ns.args[0] as string,
    threads: ns.args[1] as number
  }

  const portController = ns.getPortHandle(ns.pid)
  portController.write({
    action: "ready",
    bot: prepared.hostname
  } as ControllerResult)

  while (true) {
    ns.print(`[${prepared.hostname}] Waiting hostname from botnet`)
    await portController.nextWrite()
    const host = portController.read()

    ns.scriptKill("bot.ts", prepared.hostname)
    const pid = ns.exec("bot.ts", prepared.hostname, prepared.threads, host)
    if (pid == 0) {
      ns.print(`[${prepared.hostname}] Unnable to run bot.ts on ${host}`)
      portController.write({
        action: "error",
        bot: prepared.hostname,
        host,
        msg: `FAIL TO RUN bot.ts ON ${host}`
      } as ControllerResult)
      continue
    }
    ns.print(`[${prepared.hostname}] Waiting answer from ${host} PID: ${pid}`)

    const port = ns.getPortHandle(pid)
    await port.nextWrite()
    let res = port.read() as Message

    ns.print(`[${prepared.hostname}] Answer from ${host}: ${JSON.stringify(res)}`)

    const maxMoney = ns.getServerMaxMoney(host) * 0.75
    const minSecurity = ns.getServerMinSecurityLevel(host) + 5

    // Preparing message for bot
    let message: Message | null = null
    if (ns.getServerSecurityLevel(host) > minSecurity)
      message = { action: "weaken", threads: prepared.threads }
    else if (ns.getServerMoneyAvailable(host) < maxMoney)
      message = { action: "grow", threads: prepared.threads }
    else {
      const hackLevel = ns.getHackingLevel()
      const rHackSkill = ns.getServerRequiredHackingLevel(host) || 0
      if (hackLevel < rHackSkill) {
        await ns.sleep(250)
        ns.print(`[${prepared.hostname}] Not enough hacking level for ${host} (your: ${hackLevel}, req: ${rHackSkill})`)
        portController.clear()
        portController.write({
          action: "hack",
          time: -1,
          host,
          bot: prepared.hostname
        } as ControllerResult)
        continue
      }

      const k = ns.getServerGrowth(host) / 100
      const m = ns.getServerMoneyAvailable(host) * k
      let t = Math.floor(ns.hackAnalyzeThreads(host, m))
      t = t < 1 ? 1 : t

      message = { action: "hack", threads: t > prepared.threads ? prepared.threads : t }
    }

    ns.print(`[${prepared.hostname}] Sending task *${message.action}* to ${host}`)
    port.write(message)
    while ((port.peek() as Message).action != "ready")
      await ns.sleep(100)    
    res = port.read() as Message

    ns.kill(pid)
    ns.print(`[${prepared.hostname}] Successfull ended script for ${host}! Time: ${((res.time || 0) / 1000 | 0)}s`)

    portController.clear()
    portController.write({
      ...message,
      time: res.time,
      host,
      bot: prepared.hostname
    } as ControllerResult)
  }

}
