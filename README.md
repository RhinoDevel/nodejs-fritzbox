# nodejs-fritzbox
NodeJS script to communicate with an **AVM FritzBox** via **TR-064** interface and **HTTP digest authentication** by using two modules only and no fancy async. stuff or something else that makes this unnecessary difficult.

## Requirements:
- http (included in NodeJS)
- [md5](https://www.npmjs.com/package/md5)

## Instructions (regarding file nodejs-fritzbox.js):
- See end of file and select either using this file as stand-alone script or as module to use from another source code file.
- Browse the source code of this file. It includes the connection settings and credentials to communicate with the FritzBox and also the (so called) action. That action can be replaced to let the FritzBox do something else.

## Notes:
- Tested with a FritzBox 7530 and **NodeJS v18.3.0 LTS**.
- No security considerations (should be called from local LAN / intranet, only).

## Sources:
- https://avm.de/service/schnittstellen/

*Have fun! Marcel Timm, RhinoDevel.*
