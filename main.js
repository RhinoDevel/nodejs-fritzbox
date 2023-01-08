
// 2023jan08, Marcel Timm, RhinoDevel

const fb = require('./nodejs-fritzbox.js');

fb.exec((o) => console.log(JSON.stringify(o)), '********', '********');
