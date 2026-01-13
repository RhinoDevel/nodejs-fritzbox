
// *****************************************************************************
// *** NodeJS script to communicate with an AVM FritzBox via TR-064          ***
// *** interface and HTTP digest authentication by using two modules, only.  ***
// *****************************************************************************

// 2023jan07, Marcel Timm, RhinoDevel

// Requirements:
//
// - http (included in NodeJS)
// - md5 from https://www.npmjs.com/package/md5

// Instructions:
//
// - See end of file and select either using this file as stand-alone script or
//   as module to use from another source code file.
//
// - Browse the source code of this file. It includes the connection settings
//   and credentials to communicate with the FritzBox and also the (so called)
//   action. That action can be replaced to let the FritzBox do something else.

// Notes:
//
// - Tested with a FritzBox 7530 and NodeJS v18.3.0 LTS.
// - No security considerations (should be called from local LAN / intranet,
//   only).

// Sources:
//
// - https://avm.de/service/schnittstellen/

const fb = { // FritzBox
            con: { // Connection (& credentials).
                ip: '192.168.178.1',
                port: '49000',

                // Create a new user via FritzBox web interface for this:
                //
                username: '********', // Kind of bad: May be overwritten,
                password: '********'  //              if file is used as module.
            },

            // Change the values of this property's properties to extract other
            // data from FritzBox (or change settings, etc.):
            //
            action: { // Get smart switch data (via index).
                eventSubUrl: '/upnp/control/x_homeauto',
                serviceType: 'urn:dslforum-org:service:X_AVM-DE_Homeauto:1',
                actionName: 'GetGenericDeviceInfos',
                arguments: '<u:NewIndex>'
                                + String(0) // Hard-coded index!
                            + '</u:NewIndex>',

                /** Extract relevant data from given XML result retrieved from
                 *  FritzBox and return it.
                 * 
                 *  Returns null on error.
                 */
                getResultObj: function(xml)
                {
                    const tags = {
                            power: 'NewMultimeterPower', // [1/100 W]
                            energy: 'NewMultimeterEnergy', // [Wh]
                            temperature: 'NewTemperatureCelsius', // [1/10 °C]
                            switchState: 'NewSwitchState' // [OFF/ON]
                        };
                    let retVal = {},
                        propName = null;

                    for(propName in tags)
                    {
                        const tag = tags[propName],
                            tagIndex = xml.indexOf(tag);
                        let beg = null, end = null;

                        if(tagIndex === -1)
                        {
                            return null;
                        }

                        beg = xml.indexOf(tag) + tag.length + 1; // +1 for '>'.  
                        end = xml.indexOf(tag, beg) - 1 - 1, // -1 for '<'.
                        retVal[propName] = xml.substring(beg, end);
                    };

                    // Some conversions (we want integers, only):
                    //
                    retVal.power = parseInt(retVal.power, 10);
                    retVal.energy = parseInt(retVal.energy, 10);
                    retVal.temperature = parseInt(retVal.temperature, 10);
                    retVal.switchState = retVal.switchState === 'ON'
                        ? 1
                        : 0; // Not 100% correct (there are four states:
                             // OFF, ON, TOGGLE and UNDEFINED), but OK.

                    return retVal;
                }
            },
        },

    // POST message's body's content:
    //
    content = '<?xml version=\'1.0\' encoding=\'utf-8\'?>'
        + '<s:Envelope'
            + ' s:encodingStyle=\'http://schemas.xmlsoap.org/soap/encoding/\''
            + ' xmlns:s=\'http://schemas.xmlsoap.org/soap/envelope/\'>'
            + '<s:Body>'
                + '<u:' + fb.action.actionName
                    + ' xmlns:u=\'' + fb.action.serviceType + '\'>'
                        + fb.action.arguments
                + '</u:' + fb.action.actionName + '>'
            + '</s:Body>'
        + '</s:Envelope>'

    // Digest authentication stuff:
    //
    digestKeyDigestRealm = 'Digest realm',
    digestKeyNonce = 'nonce',
    digestKeyQop = 'qop',
    digestKeys = [
            digestKeyDigestRealm, // Expecting Digest realm="HTTPS Access".
            digestKeyNonce, // Expecting nonce="<NONCE>" with <NONCE> being a
                            // string of sixteen hexadecimal digits.
            'algorithm', // Expecting algorithm=MD5.
            digestKeyQop // Expecting qop="auth".
        ],
    digestCnonce = '7581f986', // Random value. Lower-case!
    digestNonceCount = '00000001',

    http = require('http'), // For HTTP requests to the FritzBox server.
    md5 = require('md5'), // To calculate MD5 hashes.
    
    options = { // Options to be used by/for the HTTP requests.
            host: fb.con.ip,
            path: fb.action.eventSubUrl,
            port: fb.con.port,
            timeout: 5000, // ms
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset="utf-8"',
                'Content-Length': content.length,
                'SoapAction': fb.action.serviceType + '#' + fb.action.actionName
                // Bad: Authentication header will be added here by second req.!
            }
        },

    execCallback = null, // To be filled by exec() function.

    tryCallExecCallback = function(o)
    {
        if(execCallback !== null)
        {
            execCallback(o);
        }
    },

    /** Create object (dictionary) representation of digest authentication
     *  header string given.
     */
    getAsObj = function(digestAuthHeaderStr)
    {
        let retVal = {};

        digestAuthHeaderStr.split(',').forEach( // Not performance optimized.
            str => digestKeys.forEach(
                key =>
                {
                    if(str.startsWith(key))
                    {
                        let val = str.substring(key.length + 1);

                        if(val.startsWith('"')) // (assuming ending with ", too)
                        {
                            val = val.substring(1, val.length - 1);
                        }

                        retVal[key] = val;
                    }
                }));
        return retVal;
    },

    /**
     * - Hard-coded for algorithm MD5.
     */
    getResponse = function(p)
    {
        const ha1 = md5( // Lower-case!
                    fb.con.username 
                    + ':' + p[digestKeyDigestRealm]
                    + ':' + fb.con.password),
            ha2 = md5('POST' + ':' + fb.action.eventSubUrl), // Lower-case!
            retVal = md5( // Lower-case!
                ha1 
                + ':' + p[digestKeyNonce]
                + ':' + digestNonceCount
                + ':' + digestCnonce
                + ':' + p[digestKeyQop] // Must be 'auth'!
                + ':' + ha2);

        return retVal;
    },

    getDigestHeaderVal = function(p)
    {
        return 'Digest username="' + fb.con.username + '"'
            + ', realm="' + p[digestKeyDigestRealm] + '"'
            + ', nonce="' + p[digestKeyNonce] + '"'
            + ', uri="' + fb.action.eventSubUrl + '"'
            + ', qop="' + p[digestKeyQop] + '"' // Must be 'auth'!
            + ', nc="' + digestNonceCount + '"'
            + ', cnonce="' + digestCnonce + '"'
            + ', response="' + getResponse(p) + '"';
    },

    onXmlRetrieved = function(xml)
    {
        const o = fb.action.getResultObj(xml);

        if(o === null)
        {
            console.error('Error: Response interpr. failed: "' + xml + '"!');
            tryCallExecCallback(null);
            return;
        }

        // Enter your code here to do something useful with the resulting data:
        //
        //console.log(o);
        tryCallExecCallback(o);
    },

    onSecondReqStarted = function(response)
    {
        let str = ''

        response.on('data', chunk => str += chunk);

        response.on(
            'end',
            function()
            {
                // This is bad (2/2):
                //
                delete options['Authorization']; // Hard-coded (key).

                onXmlRetrieved(str);
            });
    },

    /** Prepare digest authentication header for second request and start that
     *  second request.
     */
    onFirstReqDone = function(digestAuthHeaderStr)
    {
        const p = getAsObj(digestAuthHeaderStr),
            headerVal = getDigestHeaderVal(p);
        let secondReq = null;

        // This is bad (1/2):
        //
        options.headers['Authorization'] = headerVal; // Hard-coded (key).

        secondReq = http.request(options, onSecondReqStarted);
        secondReq.on(
            'error',
            (e) => 
            {
                console.error('Error: 2nd req. failed: "' + e.message + '"!');
                tryCallExecCallback(null);
            });
        secondReq.write(content);
        secondReq.end();
    },

    onFirstReqStarted = function(response)
    {
        let str = ''

        response.on('data', chunk => str += chunk); // Puts the answer together.

        response.on(
            'end',
            function() // => Answer was retrieved completely from server.
            {
                // Find digest authentication header.
                //
                var digestAuthHeaderStr = response.rawHeaders.find(
                        s => s.includes(digestKeyDigestRealm));

                if(typeof digestAuthHeaderStr !== 'string')
                {
                    // We are assuming that authorization was already done and
                    // is still valid:
                    //
                    onXmlRetrieved(str);
                    return;
                }
                onFirstReqDone(digestAuthHeaderStr);
            });
    },

    /** Try to retrieve data from FritzBox.
     * 
     *  Calls given callback function when done with argument being null on
     *  error or the retrieved data on success.
     */
    exec = function(callback, username, password)
    {
        let firstReq = null;

        if(typeof callback === 'function')
        {
            execCallback = callback;
        }
        if(typeof username === 'string')
        {
            fb.con.username = username; // Kind of bad.
        }
        if(typeof password === 'string')
        {
            fb.con.password = password; // Kind of bad.
        }

        // Trigger first HTTP request to FritzBox to get digest auth. nonce,
        // etc:
        //
        firstReq = http.request(options, onFirstReqStarted);
        firstReq.on(
            'error',
            (e) =>
            {
                console.error('Error: 1st req. failed: "' + e.message + '"!');
                tryCallExecCallback(null);
            });
        firstReq.write(content);
        firstReq.end();
        //
        // => onFirstReqStarted()
    };

// Option 1: To use as module:
//
module.exports.exec = exec;

// Option 2: To use as stand-alone script:
//
//exec(null, null, null);
