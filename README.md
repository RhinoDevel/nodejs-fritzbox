# nodejs-fritzbox
NodeJS script to communicate with an AVM FritzBox via TR-064 interface and HTTP digest authentication by using two modules only and no fancy async. stuff or something else that makes this unnecessary difficult.

Requirements:
- http
- md5 from https://www.npmjs.com/package/md5

Notes:
- Tested with a FritzBox 7530 and NodeJS v18.3.0 LTS.
- No error handling.
- No security considerations (should be called from local LAN / intranet, only).

Sources:
- https://avm.de/service/schnittstellen/
