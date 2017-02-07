
const PubSub = require('pubsub-js')
PubSub.immediateExceptions = true

PubSub.publish = PubSub.publishSync

module.exports = PubSub
