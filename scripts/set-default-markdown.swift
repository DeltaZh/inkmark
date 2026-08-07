import Foundation
import CoreServices

let bundleId = "app.delta.ink" as NSString
let mdTypes = [
  "net.daringfireball.markdown",
  "public.markdown",
]

var failed = false
for t in mdTypes {
  let type = t as NSString
  let status = LSSetDefaultRoleHandlerForContentType(
    type,
    LSRolesMask.all,
    bundleId
  )
  print("set \(t) -> \(status == noErr ? "ok" : "err \(status)")")
  if status != noErr { failed = true }
}

for t in mdTypes {
  let type = t as NSString
  if let cf = LSCopyDefaultRoleHandlerForContentType(type, LSRolesMask.all) {
    let handler = cf.takeRetainedValue() as String
    print("handler \(t): \(handler)")
  } else {
    print("handler \(t): <none>")
  }
}

exit(failed ? 1 : 0)
