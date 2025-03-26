import { Message } from "utils.ts"

export async function main(ns: NS) {
  const target = ns.args[0] as string

  const port = ns.getPortHandle(ns.pid)
  port.write({ action: "ready", threads: 0 } as Message)
  ns.print("Sended READY")
  await port.nextWrite()
  const res: Message = port.peek()
  const threads = res.threads

  ns.print(`Recived command *${res.action}* (threads: ${res.threads})`)

  const t = Date.now()
  switch (res.action) {
    case "weaken" : await ns.weaken(target, { threads }); break;
    case "grow"   : await ns.grow(target, { threads }); break;
    case "hack"   : await ns.hack(target, { threads }); break;
  }
  port.clear()
  port.write({ action: "ready", threads: res.threads, time: Date.now() - t })

}
