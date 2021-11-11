'use strict';

const fs = require('fs');

module.exports.title = 'DKIM signer';
module.exports.init = function (app, done) {
  let privKey;

  try {
    privKey = fs.readFileSync(app.config.path, 'ascii').trim();
  } catch (E) {
    app.logger.error('DKIM', 'Failed loading key: %s', E.message);
    return done();
  }

  app.addHook('sender:connection', (delivery, options, next) => {
    if (!delivery.dkim.keys) {
      delivery.dkim.keys = [];
    }

    let from = delivery.envelope.from || '';
    let fromDomain = from.substr(from.lastIndexOf('@') + 1).toLowerCase();
    let headersToSign = app.config.headerFields.join(':') || '';
    let additionalHeaderFields = app.config.additionalHeaderFields.join(':') || '';

    delivery.dkim.keys.push({
      domainName: app.config.domain || fromDomain,
      keySelector: app.config.selector,
      privateKey: privKey,
      headerFieldNames: headersToSign,
      additionalHeaderFieldNames: additionalHeaderFields
    });

    if (options.localHostname && app.config.signTransportDomain && !delivery.dkim.keys.find(key => key.domainName === options.localHostname)) {
      delivery.dkim.keys.push({
        domainName: options.localHostname,
        keySelector: app.config.selector,
        privateKey: privKey,
        headerFieldNames: headersToSign,
        additionalHeaderFieldNames: additionalHeaderFields
      });
    }

    next();
  });

  done();
};
